/**
 * Hook for item operations (field resolution, rendering helpers)
 */

import { useCallback, useMemo } from "react";
import type { CanvasItem, DataSource } from "../domain/types";
import { buildDataKey, parsePathTokens } from "../services/dataSourceService";

export const useItemOperations = (
    sources: DataSource[],
    liveData: Map<string, unknown>,
    virtualState: Record<string, unknown>
) => {
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
            if (isSystemSource(source)) {
                return `${sourceLabel} → ${item.fieldPath ?? ""}`;
            }
            if (!item.endpointPath) return "";
            if (!item.fieldPath) return "";
            return `${sourceLabel} → ${item.endpointPath} → ${item.fieldPath}`;
        },
        [isSystemSource, sources]
    );

    const getDisplayLabel = useCallback(
        (item: CanvasItem) => {
            if (item.type === "text" && item.sourceId && item.fieldPath) {
                const resolved = resolveFieldValue(item.sourceId, item.endpointPath, item.fieldPath);
                if (resolved !== undefined && resolved !== null) {
                    if (Array.isArray(resolved) && resolved.length > 0) {
                        return String(resolved[0] ?? item.label ?? "");
                    }
                    return String(resolved);
                }
            }
            return item.label ?? "";
        },
        [resolveFieldValue]
    );

    const getProgressValue = useCallback(
        (item: CanvasItem) => {
            let value = typeof item.value === "number" ? item.value : 0;
            if (item.sourceId && item.fieldPath) {
                const resolved = resolveFieldValue(item.sourceId, item.endpointPath, item.fieldPath);
                if (typeof resolved === "number") {
                    value = resolved;
                } else if (Array.isArray(resolved) && resolved.length > 0 && typeof resolved[0] === "number") {
                    value = resolved[0];
                }
            }
            return value;
        },
        [resolveFieldValue]
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
                const bound = resolveFieldValue(item.sourceId, item.endpointPath, item.fieldPath) as any;
                if (typeof bound === "string") {
                    return bound;
                }
                if (typeof bound === "object" && bound?.url) {
                    return String(bound.url);
                }
                if (Array.isArray(bound) && bound.length > 0) {
                    const first = bound[0];
                    if (typeof first === "string") return first;
                    if (typeof first === "object" && first?.url) return String(first.url);
                }
            }
            return item.src ?? "";
        },
        [resolveFieldValue]
    );

    const getVideoSource = useCallback(
        (item: CanvasItem) => {
            if (item.type !== "image" || !item.sourceId || !item.fieldPath) return "";
            const bound = resolveFieldValue(item.sourceId, item.endpointPath, item.fieldPath) as any;
            if (!bound) return "";
            if (typeof bound === "string" && bound.toLowerCase().endsWith(".mp4")) return bound;
            if (typeof bound === "object") {
                return String(bound.videoUrl ?? bound.url ?? "");
            }
            return "";
        },
        [resolveFieldValue]
    );

    const hasBindingForItem = useCallback(
        (item?: CanvasItem | null) => {
            if (!item?.sourceId || !item?.fieldPath) return false;
            const source = sources.find((candidate) => candidate.id === item.sourceId);
            if (!source || isSystemSource(source)) return true;
            return Boolean(item.endpointPath);
        },
        [isSystemSource, sources]
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
        hasBindingForItem
    };
};
