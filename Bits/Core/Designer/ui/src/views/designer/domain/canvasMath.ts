import type { CanvasItem } from "./types";

export const getDefaultSize = (toolType: string) => {
    switch (toolType) {
        case "text":
            return { width: 180, height: 36 };
        case "image":
            return { width: 220, height: 140 };
        case "progress":
            return { width: 200, height: 22 };
        case "rect":
            return { width: 180, height: 120 };
        case "ellipse":
            return { width: 160, height: 120 };
        case "line":
            return { width: 180, height: 2 };
        case "polygon":
            return { width: 140, height: 140 };
        default:
            return { width: 160, height: 100 };
    }
};

export const applyResize = (
    item: CanvasItem,
    dx: number,
    dy: number,
    handle: "nw" | "ne" | "sw" | "se"
) => {
    const minSize = 8;
    let x = item.x;
    let y = item.y;
    let width = item.width;
    let height = item.height;

    if (handle === "nw") {
        x = item.x + dx;
        y = item.y + dy;
        width = item.width - dx;
        height = item.height - dy;
    } else if (handle === "ne") {
        y = item.y + dy;
        width = item.width + dx;
        height = item.height - dy;
    } else if (handle === "sw") {
        x = item.x + dx;
        width = item.width - dx;
        height = item.height + dy;
    } else if (handle === "se") {
        width = item.width + dx;
        height = item.height + dy;
    }

    if (width < minSize) {
        if (handle === "nw" || handle === "sw") {
            x = item.x + (item.width - minSize);
        }
        width = minSize;
    }
    if (height < minSize) {
        if (handle === "nw" || handle === "ne") {
            y = item.y + (item.height - minSize);
        }
        height = minSize;
    }

    if (item.type === "line") {
        height = 2;
    }

    return { x, y, width, height };
};
