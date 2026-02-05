import { useEffect, useRef } from "react";
import type { CanvasItem } from "../domain/types";

type HistoryEntry = {
    items: CanvasItem[];
    selectedIds: string[];
};

export const useCanvasHistory = (
    items: CanvasItem[],
    selectedIds: string[],
    isTransforming: boolean
) => {
    const historyRef = useRef<HistoryEntry[]>([]);
    const historyIndexRef = useRef(-1);
    const isApplyingHistoryRef = useRef(false);

    const pushHistory = (nextItems: CanvasItem[], nextSelected: string[]) => {
        if (isApplyingHistoryRef.current) return;

        const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
        newHistory.push({
            items: JSON.parse(JSON.stringify(nextItems)),
            selectedIds: [...nextSelected]
        });

        // Keep only last 50 entries
        if (newHistory.length > 50) {
            newHistory.shift();
        } else {
            historyIndexRef.current++;
        }

        historyRef.current = newHistory;
    };

    const applyHistory = (index: number): { items: CanvasItem[]; selectedIds: string[] } | null => {
        const entry = historyRef.current[index];
        if (!entry) return null;

        isApplyingHistoryRef.current = true;
        historyIndexRef.current = index;

        requestAnimationFrame(() => {
            isApplyingHistoryRef.current = false;
        });

        return {
            items: JSON.parse(JSON.stringify(entry.items)),
            selectedIds: [...entry.selectedIds]
        };
    };

    const undo = (): { items: CanvasItem[]; selectedIds: string[] } | null => {
        if (historyIndexRef.current <= 0) return null;
        return applyHistory(historyIndexRef.current - 1);
    };

    const redo = (): { items: CanvasItem[]; selectedIds: string[] } | null => {
        if (historyIndexRef.current >= historyRef.current.length - 1) return null;
        return applyHistory(historyIndexRef.current + 1);
    };

    const canUndo = (): boolean => {
        return historyIndexRef.current > 0;
    };

    const canRedo = (): boolean => {
        return historyIndexRef.current < historyRef.current.length - 1;
    };

    useEffect(() => {
        if (isTransforming) return;
        pushHistory(items, selectedIds);
    }, [items, selectedIds, isTransforming]);

    return {
        undo,
        redo,
        canUndo,
        canRedo,
        historyRef,
        historyIndexRef
    };
};
