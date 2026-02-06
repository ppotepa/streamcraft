import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage } from "../services/chatFeedService";
import { fetchChatHistory } from "../services/chatFeedService";

type ChatFeedStatus = "idle" | "ready" | "error";

type UseChatMessagesOptions = {
    pollIntervalMs?: number;
    enabled?: boolean;
};

const DEFAULT_INTERVAL_MS = 3500;

export const useChatMessages = (options?: UseChatMessagesOptions) => {
    const { pollIntervalMs = DEFAULT_INTERVAL_MS, enabled = true } = options ?? {};
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [status, setStatus] = useState<ChatFeedStatus>("idle");
    const errorLoggedRef = useRef(false);

    useEffect(() => {
        if (!enabled) {
            setStatus("idle");
            return;
        }

        let cancelled = false;
        let timer: number | null = null;

        const poll = async () => {
            try {
                const history = await fetchChatHistory();
                if (cancelled) return;
                setMessages(history);
                setStatus("ready");
            } catch (err) {
                if (cancelled) return;
                setStatus("error");
                if (!errorLoggedRef.current) {
                    console.warn("Chat history fetch failed", err);
                    errorLoggedRef.current = true;
                }
            } finally {
                if (cancelled) return;
                timer = window.setTimeout(poll, Math.max(1000, pollIntervalMs));
            }
        };

        poll();
        return () => {
            cancelled = true;
            if (timer) {
                window.clearTimeout(timer);
            }
        };
    }, [enabled, pollIntervalMs]);

    const latestMessages = useMemo(() => messages, [messages]);

    return { messages: latestMessages, status };
};

export type { ChatMessage } from "../services/chatFeedService";
