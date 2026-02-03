import { element } from "../../../forms/core";
import type { CanvasItem } from "../domain/types";

type CanvasItemsProps = {
    items: CanvasItem[];
    selectedIds: string[];
    getItemStyle: (item: CanvasItem) => string;
    getDisplayLabel: (item: CanvasItem) => string;
    getProgressPercent: (item: CanvasItem) => number;
    beginResize: (itemId: string, handle: "nw" | "ne" | "sw" | "se") => (event: React.MouseEvent<HTMLDivElement>) => void;
    handleItemMouseDown: (itemId: string) => (event: React.MouseEvent<HTMLDivElement>) => void;
};

export const buildCanvasItems = ({
    items,
    selectedIds,
    getItemStyle,
    getDisplayLabel,
    getProgressPercent,
    beginResize,
    handleItemMouseDown
}: CanvasItemsProps) =>
    items.map((item) => {
        const selected = selectedIds.includes(item.id);
        const progressPercent = item.type === "progress" ? getProgressPercent(item) : 0;
        const progressStyle = item.progressStyle ?? "blocks";
        const progressNode = item.type === "progress"
            ? element(
                "div",
                { className: "progressbar", style: "width: 100%; height: 100%;" },
                element(
                    "div",
                    {
                        className: `progressbar-fill ${progressStyle === "blocks" ? "progressbar-blocks" : ""}`.trim(),
                        style: `width: ${progressPercent}%;`
                    },
                    progressStyle === "blocks"
                        ? element("div", { className: "progressbar-blocks-pattern" })
                        : null
                )
            )
            : null;

        return element(
            "div",
            {
                key: item.id,
                className: `canvas-item canvas-item-${item.type} ${selected ? "canvas-item-selected" : ""}`.trim(),
                style: getItemStyle(item),
                onMouseDown: handleItemMouseDown(item.id)
            },
            element("div", { className: "canvas-item-handles" },
                element("div", { className: "canvas-item-handle canvas-item-handle-nw", onMouseDown: beginResize(item.id, "nw") }),
                element("div", { className: "canvas-item-handle canvas-item-handle-ne", onMouseDown: beginResize(item.id, "ne") }),
                element("div", { className: "canvas-item-handle canvas-item-handle-sw", onMouseDown: beginResize(item.id, "sw") }),
                element("div", { className: "canvas-item-handle canvas-item-handle-se", onMouseDown: beginResize(item.id, "se") })
            ),
            progressNode,
            element("span", { className: "canvas-item-label" }, getDisplayLabel(item))
        );
    });
