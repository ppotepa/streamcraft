import { useRef, useCallback } from "react";
import type { CanvasItem } from "../domain/types";
import { pushHistory as pushHistoryReducer, canUndo, canRedo } from "../domain/historyReducer";

export const useHistoryManager = (
    setItems: (items: CanvasItem[]) => void,
    setSelectedIds: (ids: string[]) => void
) => {
    const historyRef = useRef<Array<{ items: CanvasItem[]; selectedIds: string[] }>>([]);
    const historyIndexRef = useRef(-1);
    const isApplyingHistoryRef = useRef(false);

    const pushHistory = useCallback((nextItems: CanvasItem[], nextSelected: string[]) => {
        if (isApplyingHistoryRef.current) return;
        const next = pushHistoryReducer(historyRef.current, historyIndexRef.current, nextItems, nextSelected);
        historyRef.current = next.history;
        historyIndexRef.current = next.index;
    }, []);

    const applyHistory = useCallback((index: number) => {
        const entry = historyRef.current[index];
        if (!entry) return;
        isApplyingHistoryRef.current = true;
        setItems(entry.items);
        setSelectedIds(entry.selectedIds);
        historyIndexRef.current = index;
        requestAnimationFrame(() => {
            isApplyingHistoryRef.current = false;
        });
    }, [setItems, setSelectedIds]);

    const undo = useCallback(() => {
        if (canUndo(historyIndexRef.current)) {
            applyHistory(historyIndexRef.current - 1);
        }
    }, [applyHistory]);

    const redo = useCallback(() => {
        if (canRedo(historyRef.current, historyIndexRef.current)) {
            applyHistory(historyIndexRef.current + 1);
        }
    }, [applyHistory]);

    const resetHistory = useCallback(() => {
        historyRef.current = [];
        historyIndexRef.current = -1;
    }, []);

    return {
        historyRef,
        historyIndexRef,
        pushHistory,
        applyHistory,
        undo,
        redo,
        resetHistory,
        isApplyingHistoryRef,
        canUndo: canUndo(historyIndexRef.current),
        canRedo: canRedo(historyRef.current, historyIndexRef.current)
    };
};
