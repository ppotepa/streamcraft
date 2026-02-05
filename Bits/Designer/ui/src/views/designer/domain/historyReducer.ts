import type { CanvasItem } from "./types";

export type HistoryEntry = { items: CanvasItem[]; selectedIds: string[] };

export const pushHistory = (
    history: HistoryEntry[],
    index: number,
    nextItems: CanvasItem[],
    nextSelected: string[],
    maxEntries = 50
) => {
    const trimmed = history.slice(0, index + 1);
    trimmed.push({ items: nextItems, selectedIds: nextSelected });
    if (trimmed.length > maxEntries) {
        trimmed.shift();
    }
    return { history: trimmed, index: trimmed.length - 1 };
};

export const canUndo = (index: number) => index > 0;
export const canRedo = (history: HistoryEntry[], index: number) => index < history.length - 1;
