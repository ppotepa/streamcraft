/**
 * Canvas-related type definitions
 */

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
    type: "move" | "resize";
    itemId: string;
    handle?: "nw" | "ne" | "sw" | "se";
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    originW: number;
    originH: number;
};

export type DragStartState = {
    x: number;
    y: number;
    canvasRect: DOMRect;
};

export type PanState = {
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
    container: HTMLDivElement;
};

export type CanvasState = {
    scale: number;
    activeTool: string | null;
    selectionBox: SelectionBox;
    placementBox: PlacementBox;
    isTransforming: boolean;
};
