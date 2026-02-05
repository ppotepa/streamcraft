import type { CanvasItem } from "./types";
import { getDefaultSize } from "./canvasMath";

type CreateItemArgs = {
    toolType: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    items: CanvasItem[];
    activeLayerId: string;
    layers: Array<{ id: string; name: string }>;
    getNextName: (toolType: string) => string;
};

export const createCanvasItem = ({
    toolType,
    x,
    y,
    width,
    height,
    items,
    activeLayerId,
    layers,
    getNextName
}: CreateItemArgs) => {
    const size = getDefaultSize(toolType);
    const nextWidth = width ?? size.width;
    const nextHeight = height ?? size.height;

    const id = `item-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const name = getNextName(toolType);
    const maxZIndex = items.length > 0 ? Math.max(...items.map(item => item.zIndex ?? 1)) : 0;
    const targetLayerId = activeLayerId || layers[0]?.id || "layer-1";

    const base: CanvasItem = {
        id,
        type: toolType,
        name,
        x,
        y,
        width: nextWidth,
        height: nextHeight,
        zIndex: maxZIndex + 1,
        visible: true,
        locked: false,
        layerId: targetLayerId
    };

    const nextItem: CanvasItem =
        toolType === "text"
            ? {
                ...base,
                label: name,
                fontFamily: "Segoe UI",
                fontSize: 16,
                fontWeight: "normal",
                fontStyle: "normal",
                textColor: "#222222",
                textTransform: "none",
                letterSpacing: 0
            }
            : toolType === "image"
                ? {
                    ...base,
                    src: ""
                }
                : toolType === "progress"
                    ? {
                        ...base,
                        value: 40,
                        minimum: 0,
                        maximum: 100,
                        progressStyle: "blocks"
                    }
                    : toolType === "line"
                        ? {
                            ...base,
                            stroke: "#2f2f2f",
                            strokeWidth: Math.max(2, nextHeight)
                        }
                        : {
                            ...base,
                            fill: "transparent",
                            stroke: "rgba(0,0,0,0.35)"
                        };

    return { id, item: nextItem };
};
