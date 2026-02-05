import type { FormNode } from "../../../../libs/forms/core";

export type DesignerUiExtension = {
    id: string;
    group?: string;
    title?: string;
    targets?: string[];
    order?: number;
    form?: FormNode | FormNode[] | null;
    data?: Record<string, any>;
};

export type GoogleFontFamily = {
    family: string;
    category: string;
    variants: string[];
    subsets: string[];
    version?: string;
    lastModified?: string;
    popularityRank?: number;
    files?: Record<string, string>;
};

export type DockPrefs = {
    version: 1;
    isDockCollapsed: boolean;
    dockedWindows: string[];
    showLayersToolbox: boolean;
    showOverlayVideoPreview: boolean;
    showDataSourceExplorer: boolean;
    showTextStyleEditor: boolean;
    showSchedulerOverview: boolean;
};

export type LoadingState = {
    active: boolean;
    step: string;
    progress: number;
    log: string[];
};

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

export type TransformRef = {
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

export type DragStart = {
    x: number;
    y: number;
    canvasRect: DOMRect;
};

export type PanRef = {
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
    container: HTMLDivElement;
};

export type ScheduleTick = {
    intervalMs: number;
    tick: number;
};
