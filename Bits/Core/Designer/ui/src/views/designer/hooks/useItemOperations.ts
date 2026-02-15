/**
 * Hook for item operations (field resolution, rendering helpers)
 */

import { useCallback } from "react";
import type { CanvasItem, ChatRenderEntry, DataSource } from "../domain/types";
import { buildDataKey, parsePathTokens } from "../services/dataSourceService";

export const useItemOperations = (
    sources: DataSource[],
    liveData: Map<string, unknown>,
    virtualState: Record<string, unknown>
) => {
    const isChatSource = useCallback((source?: DataSource | null) => {
        if (!source) return false;
        const kind = source.kind ?? "";
        const category = source.categoryId ?? "";
        return kind.startsWith("chat") || category.startsWith("chat") || source.id === "system-chat";
    }, []);

    const isSystemSource = useCallback((source?: DataSource | null) => {
        if (!source) return false;
        const kind = source.kind ?? "";
        return kind.startsWith("system") || source.id.startsWith("system-");
    }, []);

    const resolveFieldValue = useCallback(
        (sourceId?: string, endpointPath?: string, fieldPath?: string) => {
            if (!sourceId || !fieldPath) return undefined;
            const source = sources.find((candidate) => candidate.id === sourceId);
            const isSystem = isSystemSource(source);
            const key = isSystem ? sourceId : buildDataKey(sourceId, endpointPath);
            if (!key) return undefined;
            const data = isSystem ? liveData.get(sourceId) : virtualState[key];
            if (!data) return undefined;
            const trimmed = fieldPath
                .replace(/^response\./, "")
                .replace(/^response/, "")
                .replace(/^\./, "");
            const tokens = parsePathTokens(trimmed);
            let current: any = data;
            for (const token of tokens) {
                current = current?.[token];
            }
            return current;
        },
        [isSystemSource, liveData, sources, virtualState]
    );

    const getBindingSummary = useCallback(
        (item?: CanvasItem | null) => {
            if (!item?.sourceId) return "";
            const source = sources.find((candidate) => candidate.id === item.sourceId);
            const sourceLabel = source?.name ?? item.sourceId;
            if (isSystemSource(source) || isChatSource(source)) {
                return `${sourceLabel} → ${item.fieldPath ?? ""}`;
            }
            if (!item.endpointPath) return "";
            if (!item.fieldPath) return "";
            return `${sourceLabel} → ${item.endpointPath} → ${item.fieldPath}`;
        },
        [isChatSource, isSystemSource, sources]
    );

    const getDisplayLabel = useCallback(
        (item: CanvasItem) => {
            if ((item.type === "text" || item.type === "chat") && item.sourceId && item.fieldPath) {
                const source = sources.find((candidate) => candidate.id === item.sourceId);
                const resolved = resolveFieldValue(item.sourceId, item.endpointPath, item.fieldPath);

                if (resolved !== undefined && resolved !== null && (isSystemSource(source) || item.endpointPath)) {
                    const value = Array.isArray(resolved) ? resolved[0] : resolved;
                    if (item.format === "uppercase" && typeof value === "string") return value.toUpperCase();
                    if (item.format === "json") return JSON.stringify(value, null, 2);
                    if (typeof value === "object") {
                        const maybeMessage = (value as any)?.message;
                        if (typeof maybeMessage === "string" && maybeMessage.trim().length > 0) {
                            return maybeMessage;
                        }
                        return JSON.stringify(value);
                    }
                    return String(value);
                }
            }
            return item.label ?? "";
        },
        [resolveFieldValue, isSystemSource, sources]
    );

    const getProgressValue = useCallback(
        (item: CanvasItem) => {
            let value = typeof item.value === "number" ? item.value : 0;
            if (item.sourceId && item.fieldPath) {
                const source = sources.find((candidate) => candidate.id === item.sourceId);
                const resolved = resolveFieldValue(item.sourceId, item.endpointPath, item.fieldPath);

                if (resolved !== undefined && resolved !== null && (isSystemSource(source) || item.endpointPath)) {
                    const raw = Array.isArray(resolved) ? resolved[0] : resolved;
                    const parsed = typeof raw === "number" ? raw : typeof raw === "string" ? Number.parseFloat(raw) : NaN;
                    if (Number.isFinite(parsed)) {
                        value = parsed;
                    }
                }
            }
            return value;
        },
        [resolveFieldValue, isSystemSource, sources]
    );

    const getProgressPercent = useCallback(
        (item: CanvasItem) => {
            const min = typeof item.minimum === "number" ? item.minimum : 0;
            const max = typeof item.maximum === "number" ? item.maximum : 100;
            const value = getProgressValue(item);
            if (max <= min) return 0;
            return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
        },
        [getProgressValue]
    );

    const resolveImageSource = useCallback(
        (item: CanvasItem) => {
            if (item.type === "image" && item.sourceId && item.fieldPath) {
                const source = sources.find((candidate) => candidate.id === item.sourceId);
                const bound = resolveFieldValue(item.sourceId, item.endpointPath, item.fieldPath) as any;

                if (isSystemSource(source) || item.endpointPath) {
                    const value = Array.isArray(bound) ? bound[0] : bound;
                    if (typeof value === "string" && value.length > 0) return value;
                    if (value && typeof value === "object") {
                        const localUrl = (value as any).localUrl as string | undefined;
                        const previewImage = (value as any).previewImage as string | undefined;
                        if (previewImage) return previewImage;
                        if (localUrl && !localUrl.toLowerCase().endsWith(".mp4")) return localUrl;
                    }
                }
            }
            return item.src ?? "";
        },
        [resolveFieldValue, isSystemSource, sources]
    );

    const getVideoSource = useCallback(
        (item: CanvasItem) => {
            if (item.type !== "image" || !item.sourceId || !item.fieldPath) return "";
            const bound = resolveFieldValue(item.sourceId, item.endpointPath, item.fieldPath) as any;
            if (!bound) return "";
            if (typeof bound === "string" && bound.toLowerCase().endsWith(".mp4")) return bound;
            if (typeof bound === "object") {
                const localUrl = (bound as any).localUrl as string | undefined;
                if (localUrl && localUrl.toLowerCase().endsWith(".mp4")) return localUrl;
            }
            return "";
        },
        [resolveFieldValue]
    );

    const hasBindingForItem = useCallback(
        (item?: CanvasItem | null) => {
            if (!item?.sourceId || !item?.fieldPath) return false;
            const source = sources.find((candidate) => candidate.id === item.sourceId);
            if (!source || isSystemSource(source) || isChatSource(source)) return true;
            return Boolean(item.endpointPath);
        },
        [isChatSource, isSystemSource, sources]
    );

    const getChatEntries = useCallback(
        (item: CanvasItem): ChatRenderEntry[] => {
            if (item.type !== "chat") return [];

            if (!item.workerEnabled || !item.sourceId) {
                return [];
            }

            const source = sources.find((candidate) => candidate.id === item.sourceId);
            if (!source || !isChatSource(source)) {
                return [];
            }

            const payload = liveData.get(item.sourceId) as any;
            const messages = Array.isArray(payload?.messages) ? payload.messages : [];
            if (messages.length === 0) {
                return [];
            }

            const lineCount = Math.min(10, Math.max(1, item.chatLines ?? 4));
            const recent = messages
                .slice(-lineCount)
                .map((entry: any, index: number): ChatRenderEntry | null => {
                    const message = typeof entry?.message === "string" ? entry.message.trim() : "";
                    if (!message) return null;
                    const timestamp = Number(entry?.timestamp ?? Date.now());
                    const username = typeof entry?.username === "string" && entry.username.trim().length > 0
                        ? entry.username
                        : "user";
                    const badges = Array.isArray(entry?.badges)
                        ? entry.badges.filter((badge: unknown): badge is string => typeof badge === "string")
                        : [];
                    return {
                        id: String(entry?.id ?? `${item.id}-chat-${index}-${timestamp}`),
                        username,
                        message,
                        timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(),
                        badges,
                        role: typeof entry?.role === "string" ? entry.role : undefined,
                        avatarUrl: typeof entry?.avatarUrl === "string" ? entry.avatarUrl : undefined
                    };
                })
                .filter((entry): entry is ChatRenderEntry => Boolean(entry));

            return item.chatMessageFlow === "top" ? [...recent].reverse() : recent;
        },
        [isChatSource, liveData, sources]
    );

    const getChatLines = useCallback(
        (item: CanvasItem) => {
            const entries = getChatEntries(item);
            if (entries.length === 0) {
                const fallback = (item.label && item.label.trim().length > 0)
                    ? item.label
                    : "Chat is waiting for messages";
                return [fallback];
            }
            const showUsername = item.chatShowUsername !== false;
            const showTimestamp = item.chatShowTimestamp === true;
            const showBadges = item.chatShowBadges === true;

            return entries.map((entry) => {
                const prefixes: string[] = [];
                if (showTimestamp) {
                    prefixes.push(new Date(entry.timestamp).toLocaleTimeString());
                }
                if (showBadges && entry.badges.length > 0) {
                    prefixes.push(`[${entry.badges.join(", ")}]`);
                }
                if (showUsername) {
                    prefixes.push(`${entry.username}:`);
                }

                return `${prefixes.join(" ")} ${entry.message}`.trim();
            });
        },
        [getChatEntries]
    );

    return {
        isSystemSource,
        resolveFieldValue,
        getBindingSummary,
        getDisplayLabel,
        getProgressValue,
        getProgressPercent,
        resolveImageSource,
        getVideoSource,
        hasBindingForItem,
        getChatEntries,
        getChatLines
    };
};
