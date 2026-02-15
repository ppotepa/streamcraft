import type { CanvasItem } from "../domain/types";

export type RuntimeIntervalMode = "global" | "custom";

export const MIN_RUNTIME_INTERVAL_MS = 250;
export const DEFAULT_RUNTIME_INTERVAL_MS = 1000;
export const MAX_RUNTIME_INTERVAL_MS = 60_000;

export const clampRuntimeIntervalMs = (value: number, fallback = DEFAULT_RUNTIME_INTERVAL_MS) => {
    if (!Number.isFinite(value)) return fallback;
    return Math.min(MAX_RUNTIME_INTERVAL_MS, Math.max(MIN_RUNTIME_INTERVAL_MS, Math.round(value)));
};

export const resolveEffectiveIntervalMs = (
    item: Pick<CanvasItem, "runtimeIntervalMode" | "runtimeCustomIntervalMs" | "scheduleIntervalMs" | "workerIntervalMs" | "workerEnabled">,
    defaultIntervalMs: number
) => {
    const normalizedDefault = clampRuntimeIntervalMs(defaultIntervalMs);
    const mode: RuntimeIntervalMode =
        item.runtimeIntervalMode === "custom"
            ? "custom"
            : "global";

    if (mode === "custom" && Number.isFinite(item.runtimeCustomIntervalMs)) {
        return clampRuntimeIntervalMs(Number(item.runtimeCustomIntervalMs), normalizedDefault);
    }

    if (Number.isFinite(item.scheduleIntervalMs) && Number(item.scheduleIntervalMs) > 0) {
        return clampRuntimeIntervalMs(Number(item.scheduleIntervalMs), normalizedDefault);
    }

    if (item.workerEnabled === true && Number.isFinite(item.workerIntervalMs) && Number(item.workerIntervalMs) > 0) {
        return clampRuntimeIntervalMs(Number(item.workerIntervalMs), normalizedDefault);
    }

    return normalizedDefault;
};

export const buildRuntimePatchForMode = (
    mode: RuntimeIntervalMode,
    defaultIntervalMs: number,
    customIntervalMs?: number
) => {
    if (mode === "custom") {
        const custom = clampRuntimeIntervalMs(customIntervalMs ?? defaultIntervalMs, defaultIntervalMs);
        return {
            runtimeIntervalMode: "custom" as const,
            runtimeCustomIntervalMs: custom,
            scheduleIntervalMs: custom
        };
    }

    const global = clampRuntimeIntervalMs(defaultIntervalMs);
    return {
        runtimeIntervalMode: "global" as const,
        runtimeCustomIntervalMs: undefined,
        scheduleIntervalMs: global
    };
};

export const buildRuntimePatchFromItem = (
    item: Pick<CanvasItem, "runtimeIntervalMode" | "runtimeCustomIntervalMs">,
    defaultIntervalMs: number
) => {
    const mode: RuntimeIntervalMode = item.runtimeIntervalMode === "custom" ? "custom" : "global";
    return buildRuntimePatchForMode(mode, defaultIntervalMs, item.runtimeCustomIntervalMs);
};
