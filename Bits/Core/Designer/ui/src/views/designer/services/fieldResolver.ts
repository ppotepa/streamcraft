import type { CanvasItem, DataSource } from "../domain/types";
import { buildDataKey, parsePathTokens } from "./dataSourceService";

export const resolveFieldValue = (
    sourceId: string | undefined,
    endpointPath: string | undefined,
    fieldPath: string | undefined,
    sources: DataSource[],
    liveData: Map<string, unknown>,
    virtualState: Record<string, unknown>,
    isSystemSource: (source?: DataSource | null) => boolean
): unknown => {
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
};

export const getBindingSummary = (
    item: CanvasItem | undefined | null,
    sources: DataSource[],
    isSystemSource: (source?: DataSource | null) => boolean
): string => {
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
};

export const getDisplayLabel = (
    item: CanvasItem,
    sources: DataSource[],
    liveData: Map<string, unknown>,
    virtualState: Record<string, unknown>,
    isSystemSource: (source?: DataSource | null) => boolean
): string => {
    if (item.type === "text" && item.sourceId && item.fieldPath) {
        const source = sources.find((candidate) => candidate.id === item.sourceId);
        const bound = resolveFieldValue(
            item.sourceId,
            item.endpointPath,
            item.fieldPath,
            sources,
            liveData,
            virtualState,
            isSystemSource
        );
        if (bound !== undefined && bound !== null && (isSystemSource(source) || item.endpointPath)) {
            const value = Array.isArray(bound) ? bound[0] : bound;
            if (item.format === "uppercase" && typeof value === "string") return value.toUpperCase();
            if (item.format === "json") return JSON.stringify(value, null, 2);
            return String(value);
        }
    }
    return item.label ?? "";
};

export const getProgressValue = (
    item: CanvasItem,
    sources: DataSource[],
    liveData: Map<string, unknown>,
    virtualState: Record<string, unknown>,
    isSystemSource: (source?: DataSource | null) => boolean
): number => {
    let value = typeof item.value === "number" ? item.value : 0;
    if (item.sourceId && item.fieldPath) {
        const source = sources.find((candidate) => candidate.id === item.sourceId);
        const bound = resolveFieldValue(
            item.sourceId,
            item.endpointPath,
            item.fieldPath,
            sources,
            liveData,
            virtualState,
            isSystemSource
        );
        if (bound !== undefined && bound !== null && (isSystemSource(source) || item.endpointPath)) {
            const raw = Array.isArray(bound) ? bound[0] : bound;
            const parsed = typeof raw === "number" ? raw : typeof raw === "string" ? Number.parseFloat(raw) : NaN;
            if (Number.isFinite(parsed)) {
                value = parsed;
            }
        }
    }
    return value;
};

export const getProgressPercent = (
    item: CanvasItem,
    sources: DataSource[],
    liveData: Map<string, unknown>,
    virtualState: Record<string, unknown>,
    isSystemSource: (source?: DataSource | null) => boolean
): number => {
    const min = typeof item.minimum === "number" ? item.minimum : 0;
    const max = typeof item.maximum === "number" ? item.maximum : 100;
    const value = getProgressValue(item, sources, liveData, virtualState, isSystemSource);
    if (max <= min) return 0;
    return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
};

export const resolveImageSource = (
    item: CanvasItem,
    sources: DataSource[],
    liveData: Map<string, unknown>,
    virtualState: Record<string, unknown>,
    isSystemSource: (source?: DataSource | null) => boolean
): string => {
    if (item.type === "image" && item.sourceId && item.fieldPath) {
        const source = sources.find((candidate) => candidate.id === item.sourceId);
        const bound = resolveFieldValue(
            item.sourceId,
            item.endpointPath,
            item.fieldPath,
            sources,
            liveData,
            virtualState,
            isSystemSource
        );
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
};

export const getVideoSource = (
    item: CanvasItem,
    sources: DataSource[],
    liveData: Map<string, unknown>,
    virtualState: Record<string, unknown>,
    isSystemSource: (source?: DataSource | null) => boolean
): string => {
    if (item.type !== "image" || !item.sourceId || !item.fieldPath) return "";
    const bound = resolveFieldValue(
        item.sourceId,
        item.endpointPath,
        item.fieldPath,
        sources,
        liveData,
        virtualState,
        isSystemSource
    ) as any;
    if (!bound) return "";
    if (typeof bound === "string" && bound.toLowerCase().endsWith(".mp4")) return bound;
    if (typeof bound === "object") {
        const localUrl = (bound as any).localUrl as string | undefined;
        if (localUrl && localUrl.toLowerCase().endsWith(".mp4")) return localUrl;
    }
    return "";
};
