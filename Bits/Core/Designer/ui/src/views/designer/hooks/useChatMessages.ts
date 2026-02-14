import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage } from "../services/chatFeedService";
import { fetchChatHistory } from "../services/chatFeedService";

type ChatFeedStatus = "idle" | "ready" | "error";

type UseChatMessagesOptions = {
    pollIntervalMs?: number;
    enabled?: boolean;
    sourceIds?: string[];
};

const DEFAULT_INTERVAL_MS = 3500;

export const useChatMessages = (options?: UseChatMessagesOptions) => {
    const { pollIntervalMs = DEFAULT_INTERVAL_MS, enabled = true, sourceIds = ["system-chat"] } = options ?? {};
    const [messagesBySource, setMessagesBySource] = useState<Record<string, ChatMessage[]>>({});
    const [status, setStatus] = useState<ChatFeedStatus>("idle");
    const errorLoggedRef = useRef<Set<string>>(new Set());
    const normalizedSourceIds = useMemo(
        () => Array.from(new Set(sourceIds.filter((entry) => typeof entry === "string" && entry.trim().length > 0))),
        [sourceIds]
    );

    useEffect(() => {
        if (!enabled || normalizedSourceIds.length === 0) {
            setStatus("idle");
            return;
        }

        let cancelled = false;
        let timer: number | null = null;

        const poll = async () => {
            try {
                const settled = await Promise.allSettled(
                    normalizedSourceIds.map(async (sourceId) => ({
                        sourceId,
                        history: await fetchChatHistory(sourceId)
                    }))
                );
                if (cancelled) return;

                const next: Record<string, ChatMessage[]> = {};
                let hasSuccess = false;
                settled.forEach((result, index) => {
                    if (result.status === "fulfilled") {
                        hasSuccess = true;
                        next[result.value.sourceId] = result.value.history;
                        return;
                    }

                    const reason = result.reason;
                    const sourceId = normalizedSourceIds[index] ?? "unknown";
                    if (!errorLoggedRef.current.has(sourceId)) {
                        console.warn(`Chat history fetch failed (${sourceId})`, reason);
                        errorLoggedRef.current.add(sourceId);
                    }
                });
                setMessagesBySource(next);
                setStatus(hasSuccess ? "ready" : "error");
            } catch (err) {
                if (cancelled) return;
                setStatus("error");
                if (!errorLoggedRef.current.has("*")) {
                    console.warn("Chat history fetch failed", err);
                    errorLoggedRef.current.add("*");
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
    }, [enabled, normalizedSourceIds, pollIntervalMs]);

    return { messagesBySource, status };
};

export type { ChatMessage } from "../services/chatFeedService";
