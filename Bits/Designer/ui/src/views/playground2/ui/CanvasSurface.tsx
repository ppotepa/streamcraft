import { element, node } from "../../../forms/core";
import { ControlKind } from "../../../forms/controlKinds";
import { buildCanvasItems } from "./CanvasItems";
import type { CanvasItem } from "../domain/types";

type CanvasSurfaceProps = {
    items: CanvasItem[];
    selectedIds: string[];
    getItemStyle: (item: CanvasItem) => string;
    getDisplayLabel: (item: CanvasItem) => string;
    getProgressPercent: (item: CanvasItem) => number;
    beginResize: (itemId: string, handle: "nw" | "ne" | "sw" | "se") => (event: React.MouseEvent<HTMLDivElement>) => void;
    handleItemMouseDown: (itemId: string) => (event: React.MouseEvent<HTMLDivElement>) => void;
    selectionBox: { active: boolean; x: number; y: number; width: number; height: number };
    placementBox: { active: boolean; x: number; y: number; width: number; height: number };
    onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
    onMouseMove: (event: React.MouseEvent<HTMLDivElement>) => void;
    onMouseUp: (event: React.MouseEvent<HTMLDivElement>) => void;
};

export const buildCanvasSurfaceNode = (props: CanvasSurfaceProps) => {
    const itemNodes = buildCanvasItems({
        items: props.items,
        selectedIds: props.selectedIds,
        getItemStyle: props.getItemStyle,
        getDisplayLabel: props.getDisplayLabel,
        getProgressPercent: props.getProgressPercent,
        beginResize: props.beginResize,
        handleItemMouseDown: props.handleItemMouseDown
    });

    return node(
        ControlKind.layoutCanvas,
        {
            gridSize: 24,
            gridColor: "rgba(255,255,255,0.12)",
            background: "#0b6a6a",
            style: "width: 1920px; height: 1080px; position: relative;",
            onMouseDown: props.onMouseDown,
            onMouseMove: props.onMouseMove,
            onMouseUp: props.onMouseUp
        },
        ...itemNodes,
        props.selectionBox.active
            ? element("div", {
                className: "canvas-selection-box",
                style: `left: ${props.selectionBox.x}px; top: ${props.selectionBox.y}px; width: ${props.selectionBox.width}px; height: ${props.selectionBox.height}px;`
            })
            : null,
        props.placementBox.active
            ? element("div", {
                className: "canvas-placement-box",
                style: `left: ${props.placementBox.x}px; top: ${props.placementBox.y}px; width: ${props.placementBox.width}px; height: ${props.placementBox.height}px;`
            })
            : null
    );
};
