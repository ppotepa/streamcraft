import { WF } from "../../../../libs/forms";
import { buildCanvasItems } from "./CanvasItems";
import type { CanvasItem } from "../domain/types";

type CanvasSurfaceProps = {
    items: CanvasItem[];
    selectedIds: string[];
    getItemStyle: (item: CanvasItem) => string;
    getDisplayLabel: (item: CanvasItem) => string;
    getProgressPercent: (item: CanvasItem) => number;
    getImageSource: (item: CanvasItem) => string;
    getVideoSource: (item: CanvasItem) => string;
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
        getImageSource: props.getImageSource,
        getVideoSource: props.getVideoSource,
        beginResize: props.beginResize,
        handleItemMouseDown: props.handleItemMouseDown
    });

    return WF.LayoutCanvas(
        {
            GridSize: 24,
            GridColor: "rgba(255,255,255,0.12)",
            Background: "#0b6a6a",
            Style: "width: 1920px; height: 1080px; position: relative;",
            OnMouseDown: props.onMouseDown,
            OnMouseMove: props.onMouseMove,
            OnMouseUp: props.onMouseUp
        },
        ...itemNodes,
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
