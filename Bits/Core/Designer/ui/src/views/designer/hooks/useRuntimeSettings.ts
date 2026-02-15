import { useCallback, useMemo, useState } from "react";
import {
    clampRuntimeIntervalMs,
    DEFAULT_RUNTIME_INTERVAL_MS
} from "../runtime/runtimePolicy";

const STORAGE_KEY = "designer.runtime.settings.v1";

type PersistedRuntimeSettings = {
    defaultIntervalMs?: number;
};

const loadDefaultInterval = () => {
    if (typeof window === "undefined") return DEFAULT_RUNTIME_INTERVAL_MS;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_RUNTIME_INTERVAL_MS;
        const parsed = JSON.parse(raw) as PersistedRuntimeSettings;
        return clampRuntimeIntervalMs(parsed.defaultIntervalMs ?? DEFAULT_RUNTIME_INTERVAL_MS);
    } catch {
        return DEFAULT_RUNTIME_INTERVAL_MS;
    }
};

export const useRuntimeSettings = () => {
    const [defaultIntervalMs, setDefaultIntervalMsState] = useState<number>(() => loadDefaultInterval());

    const setDefaultIntervalMs = useCallback((value: number) => {
        const next = clampRuntimeIntervalMs(value, DEFAULT_RUNTIME_INTERVAL_MS);
        setDefaultIntervalMsState(next);
        if (typeof window !== "undefined") {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ defaultIntervalMs: next }));
        }
    }, []);

    const resetRuntimeSettings = useCallback(() => {
        setDefaultIntervalMs(DEFAULT_RUNTIME_INTERVAL_MS);
    }, [setDefaultIntervalMs]);

    return useMemo(
        () => ({
            defaultIntervalMs,
            setDefaultIntervalMs,
            resetRuntimeSettings
        }),
        [defaultIntervalMs, resetRuntimeSettings, setDefaultIntervalMs]
    );
};
