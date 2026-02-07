import { useState, useRef, useCallback, useEffect } from "react";
import type { CanvasItem } from "../views/designer/domain/types";
import type { CanvasState, SelectionBox, PlacementBox } from "../types/canvas.types";
import { copyToClipboard, pasteFromClipboard, type ClipboardState } from "../views/designer/domain/clipboard";

type UseCanvasStateProps = {
    setActiveTool: (tool: string | null) => void;
    setStatus: (status: string) => void;
};

export const useCanvasState = ({ setActiveTool, setStatus }: UseCanvasStateProps): CanvasState & {
    getNextName: (toolType: string) => string;
    pushHistory: (nextItems: CanvasItem[], nextSelected: string[]) => void;
    nameCounters: React.MutableRefObject<Record<string, number>>;
} => {
    const [items, setItems] = useState<CanvasItem[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectionBox, setSelectionBox] = useState<SelectionBox>({
        active: false,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        addMode: false
    });
    const [placementBox, setPlacementBox] = useState<PlacementBox>({
        active: false,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        type: null
    });
    const [canvasScale, setCanvasScale] = useState(1);
    const [isTransforming, setIsTransforming] = useState(false);
    const [transformHoldUntil, setTransformHoldUntil] = useState<number | undefined>(undefined);
    const [imageDisplaySrc, setImageDisplaySrc] = useState<Record<string, string>>({});

    const clipboardRef = useRef<ClipboardState | null>(null);
    const nameCounters = useRef<Record<string, number>>({});
    const historyRef = useRef<Array<{ items: CanvasItem[]; selectedIds: string[] }>>([]);
    const historyIndexRef = useRef(-1);
    const isApplyingHistoryRef = useRef(false);

    const updateItem = useCallback((itemId: string, updates: Partial<CanvasItem>) => {
        setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item)));
    }, []);

    const getNextName = useCallback((toolType: string) => {
        const base = toolType.charAt(0).toUpperCase() + toolType.slice(1);
        const next = (nameCounters.current[base] ?? 0) + 1;
        nameCounters.current[base] = next;
        return `${base}${next}`;
    }, []);

    // Note: addItem was moved to the main component since it needs access to layer management
    const addItem = useCallback((_toolType: string, _x: number, _y: number, _width: number, _height: number) => {
        // This is now a placeholder - actual implementation is in the main component
        setStatus("addItem should be overridden");
    }, [setStatus]);

    const copySelection = useCallback(() => {
        const nextClipboard = copyToClipboard(items, selectedIds);
        if (!nextClipboard) return;
        clipboardRef.current = nextClipboard;
    }, [items, selectedIds]);

    const deleteSelection = useCallback(() => {
        if (selectedIds.length === 0) return;
        setItems((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
        setSelectedIds([]);
    }, [selectedIds]);

    const pasteSelection = useCallback(() => {
        if (!clipboardRef.current) return;
        const result = pasteFromClipboard(clipboardRef.current, items, getNextName);
        setItems(result.items);
        setSelectedIds(result.selectedIds);
        clipboardRef.current = result.nextClipboard;
    }, [items, getNextName]);

    const pushHistory = useCallback((nextItems: CanvasItem[], nextSelected: string[]) => {
        if (isApplyingHistoryRef.current) return;
        const maxHistory = 50;
        const newIndex = historyIndexRef.current + 1;
        const newHistory = historyRef.current.slice(0, newIndex);
        newHistory.push({ items: nextItems, selectedIds: nextSelected });
        if (newHistory.length > maxHistory) {
            newHistory.shift();
            historyRef.current = newHistory;
            historyIndexRef.current = newHistory.length - 1;
        } else {
            historyRef.current = newHistory;
            historyIndexRef.current = newIndex;
        }
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
    }, []);

    useEffect(() => {
        if (isTransforming) {
            return;
        }
        pushHistory(items, selectedIds);
    }, [isTransforming, items, pushHistory, selectedIds]);

    return {
        items,
        selectedIds,
        selectionBox,
        placementBox,
        canvasScale,
        isTransforming,
        transformHoldUntil,
        imageDisplaySrc,

        setItems,
        setSelectedIds,
        setSelectionBox,
        setPlacementBox,
        setCanvasScale,
        setIsTransforming,
        setTransformHoldUntil,

        updateItem,
        addItem, // Placeholder - will be overridden in main component
        copySelection,
        deleteSelection,
        pasteSelection,

        getNextName,
        pushHistory,
        nameCounters
    };
};
