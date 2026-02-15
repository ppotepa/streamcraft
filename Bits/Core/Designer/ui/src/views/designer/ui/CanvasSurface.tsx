import { WF } from "@streamcraft/forms";
import type { FormNode } from "@streamcraft/forms/core";
import { buildCanvasItems } from "./CanvasItems";
import type { CanvasItem, ChatRenderEntry } from "../domain/types";

type CanvasSurfaceProps = {
    items: CanvasItem[];
    selectedIds: string[];
    getItemStyle: (item: CanvasItem) => string;
    getDisplayLabel: (item: CanvasItem) => string;
    getChatLines: (item: CanvasItem) => string[];
    getChatEntries: (item: CanvasItem) => ChatRenderEntry[];
    getProgressPercent: (item: CanvasItem) => number;
    getImageSource: (item: CanvasItem) => string;
    getVideoSource: (item: CanvasItem) => string;
    beginResize: (itemId: string, handle: "nw" | "ne" | "sw" | "se") => (event: React.MouseEvent<HTMLDivElement>) => void;
    handleItemMouseDown: (itemId: string) => (event: React.MouseEvent<HTMLDivElement>) => void;
    handleItemDoubleClick: (itemId: string) => (event: React.MouseEvent<HTMLDivElement>) => void;
    selectionBox: { active: boolean; x: number; y: number; width: number; height: number };
    placementBox: { active: boolean; x: number; y: number; width: number; height: number };
    onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
    onMouseMove: (event: React.MouseEvent<HTMLDivElement>) => void;
    onMouseUp: (event: React.MouseEvent<HTMLDivElement>) => void;
    isPreviewMode?: boolean;
    previewBackground?: "transparent" | "white";
    liveEffectsNode?: FormNode | null;
};

export const buildCanvasSurfaceNode = (props: CanvasSurfaceProps) => {
    const itemNodes = buildCanvasItems({
        items: props.items,
        selectedIds: props.selectedIds,
        getItemStyle: props.getItemStyle,
        getDisplayLabel: props.getDisplayLabel,
        getChatLines: props.getChatLines,
        getChatEntries: props.getChatEntries,
        getProgressPercent: props.getProgressPercent,
        getImageSource: props.getImageSource,
        getVideoSource: props.getVideoSource,
        beginResize: props.beginResize,
        handleItemMouseDown: props.handleItemMouseDown,
        handleItemDoubleClick: props.handleItemDoubleClick
    });

    return WF.LayoutCanvas(
        {
            GridSize: props.isPreviewMode ? 0 : 24,
            GridColor: props.isPreviewMode ? "transparent" : "var(--sc-canvas-grid)",
            Background: props.isPreviewMode
                ? (props.previewBackground === "white" ? "#ffffff" : "transparent")
                : "var(--sc-canvas-bg)",
            ShowGrid: !props.isPreviewMode,
            ClassName: props.isPreviewMode ? "layout-canvas-preview" : "",
            Style: props.isPreviewMode
                ? `width: 1920px; height: 1080px; position: relative; background: ${props.previewBackground === "white" ? "#ffffff" : "transparent"};`
                : "width: 1920px; height: 1080px; position: relative;",
            OnMouseDown: props.onMouseDown,
            OnMouseMove: props.onMouseMove,
            OnMouseUp: props.onMouseUp
        },
        ...itemNodes,
        props.liveEffectsNode ?? null,
        props.selectionBox.active
            ? WF.Element("div", {
                className: "canvas-selection-box",
                style: `left: ${props.selectionBox.x}px; top: ${props.selectionBox.y}px; width: ${props.selectionBox.width}px; height: ${props.selectionBox.height}px;`
            })
            : null,
        props.placementBox.active
            ? WF.Element("div", {
                className: "canvas-placement-box",
                style: `left: ${props.placementBox.x}px; top: ${props.placementBox.y}px; width: ${props.placementBox.width}px; height: ${props.placementBox.height}px;`
            })
            : null
    );
};

