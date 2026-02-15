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
            : toolType === "chat"
                ? {
                    ...base,
                    label: "Welcome to chat",
                    chatTitle: "Live Chat",
                    chatShowBadges: false,
                    chatShowUsername: true,
                    chatShowTimestamp: false,
                    chatShowAvatars: false,
                    chatRoleColors: true,
                    chatLines: 4,
                    chatPresetId: "classic",
                    chatBackgroundMode: "solid",
                    chatContainerOpacity: 100,
                    chatBubbleOpacity: 100,
                    chatBorderIntensity: 70,
                    chatShadowIntensity: 35,
                    chatBlurPx: 0,
                    chatMessageFlow: "bottom",
                    chatMessageAlign: "left",
                    chatWidthMode: "full",
                    chatContainerColor: "#101318",
                    chatBorderColor: "#3d4652",
                    chatBubbleColor: "#1b212b",
                    chatTextColor: "#f2f4f8",
                    chatUsernameColor: "#8ec8ff",
                    chatTimestampColor: "#a9b2c0",
                    chatBadgeBgColor: "#ffd95a",
                    chatBadgeTextColor: "#2a2a2a",
                    chatFontSize: 14,
                    chatBubbleRadius: 7,
                    chatBubblePadding: 8,
                    chatRowGap: 6,
                    chatCustomCssEnabled: false,
                    chatCustomCss: "",
                    sourceId: "system-chat",
                    fieldPath: "response.messages",
                    workerEnabled: false,
                    workerTrigger: "interval",
                    workerIntervalMs: 2500,
                    fill: "#131418",
                    stroke: "#8a8d96"
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
                            stroke: "#2f2f2f"
                        };

    return { id, item: nextItem };
};
