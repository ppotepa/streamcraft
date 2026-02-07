import { useCallback } from "react";
import type { CanvasItem, DataSource } from "../views/designer/domain/types";
import { buildDataKey, parsePathTokens } from "../views/designer/services/dataSourceService";

type UseItemOperationsProps = {
    sources: DataSource[];
    liveData: Map<string, unknown>;
    virtualState: Record<string, unknown>;
};

export const useItemOperations = ({ sources, liveData, virtualState }: UseItemOperationsProps) => {
    const isSystemSource = useCallback((source?: DataSource | null) => {
        if (!source) return false;
        const kind = source.kind ?? "";
        return kind.startsWith("system") || source.id.startsWith("system-");
    }, []);

    const resolveFieldValue = useCallback((sourceId?: string, endpointPath?: string, fieldPath?: string) => {
        if (!sourceId || !fieldPath) return undefined;
        const source = sources.find((candidate) => candidate.id === sourceId);
        const isSystem = isSystemSource(source);
        const key = isSystem ? sourceId : buildDataKey(sourceId, endpointPath);
        if (!key) return undefined;
        const data = isSystem ? liveData.get(sourceId) : virtualState[key];
        if (!data) return undefined;
        const trimmed = fieldPath.replace(/^response\./, "").replace(/^response/, "").replace(/^\./, "");
        const tokens = parsePathTokens(trimmed);
        let current: any = data;
        for (const token of tokens) {
            if (current === undefined || current === null) break;
            current = (current as any)[token as any];
        }
        return current;
    }, [isSystemSource, liveData, sources, virtualState]);

    const getBindingSummary = useCallback((item?: CanvasItem | null) => {
        if (!item?.sourceId) return "Not bound";
        const source = sources.find((candidate) => candidate.id === item.sourceId);
        const sourceLabel = source?.name ?? item.sourceId;
        if (isSystemSource(source)) {
            if (!item.fieldPath) return `${sourceLabel}`;
            return `${sourceLabel} → ${item.fieldPath}`;
        }
        if (!item.endpointPath) return `${sourceLabel}`;
        if (!item.fieldPath) return `${sourceLabel} → ${item.endpointPath}`;
        return `${sourceLabel} → ${item.endpointPath} → ${item.fieldPath}`;
    }, [isSystemSource, sources]);

    const getDisplayLabel = useCallback((item: CanvasItem) => {
        if (item.type === "text" && item.sourceId && item.fieldPath) {
            const source = sources.find((candidate) => candidate.id === item.sourceId);
            const bound = resolveFieldValue(item.sourceId, item.endpointPath, item.fieldPath);
            if (bound !== undefined && bound !== null && (isSystemSource(source) || item.endpointPath)) {
                const value = Array.isArray(bound) ? bound[0] : bound;
                if (item.format === "uppercase" && typeof value === "string") return value.toUpperCase();
                if (item.format === "json") return JSON.stringify(value, null, 2);
                return String(value);
            }
        }
        return item.label ?? "";
    }, [isSystemSource, resolveFieldValue, sources]);

    const getProgressValue = useCallback((item: CanvasItem) => {
        let value = typeof item.value === "number" ? item.value : 0;
        if (item.sourceId && item.fieldPath) {
            const source = sources.find((candidate) => candidate.id === item.sourceId);
            const bound = resolveFieldValue(item.sourceId, item.endpointPath, item.fieldPath);
            if (bound !== undefined && bound !== null && (isSystemSource(source) || item.endpointPath)) {
                const raw = Array.isArray(bound) ? bound[0] : bound;
                const parsed = typeof raw === "number" ? raw : typeof raw === "string" ? Number.parseFloat(raw) : NaN;
                if (Number.isFinite(parsed)) {
                    value = parsed;
                }
            }
        }
        return value;
    }, [isSystemSource, resolveFieldValue, sources]);

    const getProgressPercent = useCallback((item: CanvasItem) => {
        const min = typeof item.minimum === "number" ? item.minimum : 0;
        const max = typeof item.maximum === "number" ? item.maximum : 100;
        const value = getProgressValue(item);
        if (max <= min) return 0;
        return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
    }, [getProgressValue]);

    const resolveImageSource = useCallback((item: CanvasItem) => {
        if (item.type === "image" && item.sourceId && item.fieldPath) {
            const source = sources.find((candidate) => candidate.id === item.sourceId);
            const bound = resolveFieldValue(item.sourceId, item.endpointPath, item.fieldPath);
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
    }, [isSystemSource, resolveFieldValue, sources]);

    const getVideoSource = useCallback((item: CanvasItem) => {
        if (item.type !== "image" || !item.sourceId || !item.fieldPath) return "";
        const bound = resolveFieldValue(item.sourceId, item.endpointPath, item.fieldPath) as any;
        if (!bound) return "";
        if (typeof bound === "string" && bound.toLowerCase().endsWith(".mp4")) return bound;
        if (typeof bound === "object") {
            const localUrl = (bound as any).localUrl as string | undefined;
            if (localUrl && localUrl.toLowerCase().endsWith(".mp4")) return localUrl;
        }
        return "";
    }, [resolveFieldValue]);

    const hasBindingForItem = useCallback((item?: CanvasItem | null) => {
        if (!item?.sourceId || !item?.fieldPath) return false;
        const source = sources.find((candidate) => candidate.id === item.sourceId);
        if (!source) return false;
        if (isSystemSource(source)) return true;
        return Boolean(item.endpointPath);
    }, [isSystemSource, sources]);

    const getFieldDepth = useCallback((path: string) => {
        const normalized = path.replace(/\[(\d+)\]/g, ".$1");
        const parts = normalized.split(".").filter(Boolean);
        return Math.max(0, parts.length - 1);
    }, []);

    const formatJsonValue = useCallback((value: unknown) => {
        if (value === null) return "null";
        if (value === undefined) return "undefined";
        if (typeof value === "string") {
            const trimmed = value.length > 140 ? `${value.slice(0, 140)}…` : value;
            return `"${trimmed}"`;
        }
        if (typeof value === "number" || typeof value === "boolean") return String(value);
        return String(value);
    }, []);

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
        getFieldDepth,
        formatJsonValue
    };
};
