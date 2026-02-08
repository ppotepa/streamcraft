import { useCallback, useEffect, useRef, useState } from "react";
import type { CanvasItem, DataSource, TestResponse } from "../domain/types";
import { buildDataKey } from "../services/dataSourceService";
import type { ScheduleTick } from "../types/designer.types";

export const useScheduler = (
    items: CanvasItem[],
    sources: DataSource[],
    isTransforming: boolean,
    transformHoldUntil: React.MutableRefObject<number>,
    isSystemSource: (source?: DataSource | null) => boolean,
    runTest: (sourceId: string, endpointPath: string) => Promise<void>
) => {
    const [scheduleEpoch, setScheduleEpoch] = useState<number>(() => Date.now());
    const [scheduleRuns, setScheduleRuns] = useState<Map<string, number>>(new Map());
    const scheduleEpochRef = useRef<number>(scheduleEpoch);
    const scheduleTickRef = useRef<Map<string, ScheduleTick>>(new Map());
    const scheduleRunningRef = useRef<Set<string>>(new Set());

    const isSchedulableItem = useCallback((item: CanvasItem): boolean => {
        if (!item.sourceId || !item.fieldPath) return false;
        const source = sources.find((candidate) => candidate.id === item.sourceId);
        if (!source || isSystemSource(source)) return false;
        if (!item.endpointPath) return false;
        const intervalMs = item.scheduleIntervalMs ?? 0;
        return intervalMs > 0;
    }, [isSystemSource, sources]);

    useEffect(() => {
        scheduleEpochRef.current = scheduleEpoch;
    }, [scheduleEpoch]);

    useEffect(() => {
        const timer = window.setInterval(() => {
            const now = Date.now();
            if (isTransforming || transformHoldUntil.current > now) return;
            const epoch = scheduleEpochRef.current;

            items.forEach((item) => {
                if (!isSchedulableItem(item)) return;
                const intervalMs = Math.max(250, item.scheduleIntervalMs ?? 0);
                const tick = Math.floor((now - epoch) / intervalMs);
                const lastEntry = scheduleTickRef.current.get(item.id);
                const lastTick = lastEntry && lastEntry.intervalMs === intervalMs ? lastEntry.tick : -1;
                if (tick <= lastTick) return;
                if (scheduleRunningRef.current.has(item.id)) return;

                scheduleTickRef.current.set(item.id, { intervalMs, tick });
                scheduleRunningRef.current.add(item.id);

                void runTest(item.sourceId ?? "", item.endpointPath ?? "")
                    .finally(() => {
                        scheduleRunningRef.current.delete(item.id);
                    });

                setScheduleRuns((prev) => {
                    const next = new Map(prev);
                    next.set(item.id, now);
                    return next;
                });
            });
        }, 250);

        return () => window.clearInterval(timer);
    }, [isSchedulableItem, isTransforming, items, runTest, transformHoldUntil]);

    const resetScheduleTimers = useCallback(() => {
        setScheduleEpoch(Date.now());
        scheduleTickRef.current.clear();
        setScheduleRuns(new Map());
    }, []);

    const formatTimeAgo = useCallback((timestamp?: number): string => {
        if (!timestamp) return "Never";
        const elapsed = Date.now() - timestamp;
        if (elapsed < 1000) return "Just now";
        if (elapsed < 60000) return `${Math.floor(elapsed / 1000)}s ago`;
        const minutes = Math.floor(elapsed / 60000);
        return `${minutes}m ago`;
    }, []);

    return {
        scheduleEpoch,
        scheduleRuns,
        isSchedulableItem,
        resetScheduleTimers,
        formatTimeAgo,
        // Expose scheduling state so higher-level handlers can reset/tune timers
        setScheduleEpoch,
        setScheduleRuns,
        scheduleEpochRef,
        scheduleTickRef
    };
};
