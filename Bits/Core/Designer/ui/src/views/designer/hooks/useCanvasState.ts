/**
 * Hook for managing canvas state (items, selection, transformation)
 */

import { useState, useCallback, useRef, useMemo } from "react";
import type { CanvasItem } from "../domain/types";
import type { SelectionBox, PlacementBox, TransformState, DragStartState, PanState } from "../types";
import { copyToClipboard, pasteFromClipboard, type ClipboardState } from "../domain/clipboard";
import { createCanvasItem } from "../domain/itemCommands";
import type { Layer } from "../types/layer.types";

const DEFAULT_SELECTION_BOX: SelectionBox = {
    active: false,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    addMode: false
};

const DEFAULT_PLACEMENT_BOX: PlacementBox = {
    active: false,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    type: null
};

export const useCanvasState = () => {
    const [items, setItems] = useState<CanvasItem[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectionBox, setSelectionBox] = useState<SelectionBox>(DEFAULT_SELECTION_BOX);
    const [placementBox, setPlacementBox] = useState<PlacementBox>(DEFAULT_PLACEMENT_BOX);
    const [activeTool, setActiveTool] = useState<string | null>("select");
    const [canvasScale, setCanvasScale] = useState(1);
    const [isTransforming, setIsTransforming] = useState(false);

    // Refs for interaction state
    const dragStart = useRef<DragStartState | null>(null);
    const placementStart = useRef<DragStartState | null>(null);
    const panRef = useRef<PanState | null>(null);
    const transformRef = useRef<TransformState | null>(null);
    const clipboardRef = useRef<ClipboardState | null>(null);
    const nameCounters = useRef<Record<string, number>>({});
    const transformHoldUntil = useRef(0);

    const getNextName = useCallback((toolType: string) => {
        const base = toolType.charAt(0).toUpperCase() + toolType.slice(1);
        const next = (nameCounters.current[base] ?? 0) + 1;
        nameCounters.current[base] = next;
        return `${base}${next}`;
    }, []);

    const updateItem = useCallback((itemId: string, updates: Partial<CanvasItem>) => {
        setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item)));
    }, []);

    const addItem = useCallback(
        (
            toolType: string,
            x: number,
            y: number,
            width: number,
            height: number,
            activeLayerId: string,
            layers: Layer[]
        ) => {
            const created = createCanvasItem({
                toolType,
                x,
                y,
                width,
                height,
                items,
                activeLayerId,
                layers,
                getNextName
            });
            setItems((prev) => [...prev, created.item]);
            setSelectedIds([created.id]);
            setActiveTool("select");
            return created;
        },
        [getNextName, items]
    );

    const copySelection = useCallback(() => {
        const nextClipboard = copyToClipboard(items, selectedIds);
        if (!nextClipboard) return null;
        clipboardRef.current = nextClipboard;
        return nextClipboard;
    }, [items, selectedIds]);

    const deleteSelection = useCallback(() => {
        if (selectedIds.length === 0) return;
        setItems((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
        setSelectedIds([]);
    }, [selectedIds]);

    const pasteSelection = useCallback(() => {
        if (!clipboardRef.current) return null;
        const result = pasteFromClipboard(clipboardRef.current, items, getNextName);
        setItems(result.items);
        setSelectedIds(result.selectedIds);
        clipboardRef.current = result.nextClipboard;
        return result;
    }, [getNextName, items]);

    const beginTransformHold = useCallback(() => {
        setIsTransforming(true);
        transformHoldUntil.current = Date.now() + 300;
    }, []);

    const endTransformHold = useCallback(() => {
        setIsTransforming(false);
        transformHoldUntil.current = Date.now() + 300;
    }, []);

    const zoomIn = useCallback(() => {
        setCanvasScale((prev) => Math.min(3, Math.round((prev + 0.1) * 100) / 100));
    }, []);

    const zoomOut = useCallback(() => {
        setCanvasScale((prev) => Math.max(0.1, Math.round((prev - 0.1) * 100) / 100));
    }, []);

    const zoomReset = useCallback(() => {
        setCanvasScale(1);
    }, []);

    return {
        // State
        items,
        selectedIds,
        selectionBox,
        placementBox,
        activeTool,
        canvasScale,
        isTransforming,

        // Setters
        setItems,
        setSelectedIds,
        setSelectionBox,
        setPlacementBox,
        setActiveTool,
        setCanvasScale,
        setIsTransforming,

        // Refs
        dragStart,
        placementStart,
        panRef,
        transformRef,
        clipboardRef,
        transformHoldUntil,
        nameCounters,

        // Operations
        updateItem,
        addItem,
        copySelection,
        deleteSelection,
        pasteSelection,
        beginTransformHold,
        endTransformHold,
        getNextName,

        // Zoom operations
        zoomIn,
        zoomOut,
        zoomReset
    };
};
