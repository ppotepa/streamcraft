import type { CanvasItem } from "../views/designer/domain/types";

export type SelectionBox = {
    active: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
    addMode: boolean;
};

export type PlacementBox = {
    active: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
    type: string | null;
};

export type TransformState = {
    isTransforming: boolean;
    transformHoldUntil?: number;
};

export type DragStartState = {
    itemId: string;
    offsetX: number;
    offsetY: number;
    originalPositions: Map<string, { x: number; y: number }>;
};

export type PanState = {
    isPanning: boolean;
    panStartX: number;
    panStartY: number;
    panOffsetX: number;
    panOffsetY: number;
};

export type CanvasState = {
    items: CanvasItem[];
    selectedIds: string[];
    selectionBox: SelectionBox;
    placementBox: PlacementBox;
    canvasScale: number;
    isTransforming: boolean;
    transformHoldUntil?: number;
    imageDisplaySrc: Record<string, string>;

    // Actions
    setItems: (items: CanvasItem[] | ((prev: CanvasItem[]) => CanvasItem[])) => void;
    setSelectedIds: (ids: string[] | ((prev: string[]) => string[])) => void;
    setSelectionBox: (box: SelectionBox | ((prev: SelectionBox) => SelectionBox)) => void;
    setPlacementBox: (box: PlacementBox | ((prev: PlacementBox) => PlacementBox)) => void;
    setCanvasScale: (scale: number | ((prev: number) => number)) => void;
    setIsTransforming: (transforming: boolean) => void;
    setTransformHoldUntil: (until?: number) => void;

    updateItem: (itemId: string, updates: Partial<CanvasItem>) => void;
    addItem: (toolType: string, x: number, y: number, width: number, height: number) => void;
    copySelection: () => void;
    deleteSelection: () => void;
    pasteSelection: () => void;
};
