import { element } from "@streamcraft/forms/core";
import type { CanvasItem } from "../domain/types";

type CanvasItemsProps = {
    items: CanvasItem[];
    selectedIds: string[];
    getItemStyle: (item: CanvasItem) => string;
    getDisplayLabel: (item: CanvasItem) => string;
    getChatLines: (item: CanvasItem) => string[];
    getProgressPercent: (item: CanvasItem) => number;
    getImageSource: (item: CanvasItem) => string;
    getVideoSource: (item: CanvasItem) => string;
    beginResize: (itemId: string, handle: "nw" | "ne" | "sw" | "se") => (event: React.MouseEvent<HTMLDivElement>) => void;
    handleItemMouseDown: (itemId: string) => (event: React.MouseEvent<HTMLDivElement>) => void;
    handleItemDoubleClick: (itemId: string) => (event: React.MouseEvent<HTMLDivElement>) => void;
};

export const buildCanvasItems = ({
    items,
    selectedIds,
    getItemStyle,
    getDisplayLabel,
    getChatLines,
    getProgressPercent,
    getImageSource,
    getVideoSource,
    beginResize,
    handleItemMouseDown,
    handleItemDoubleClick
}: CanvasItemsProps) =>
    items.map((item) => {
        const selected = selectedIds.includes(item.id);
        const progressPercent = item.type === "progress" ? getProgressPercent(item) : 0;
        const progressStyle = item.progressStyle ?? "blocks";
        const imageSource = item.type === "image" ? getImageSource(item) : "";
        const videoSource = item.type === "image" ? getVideoSource(item) : "";
        const videoNode = item.type === "image" && videoSource
            ? element("video", {
                src: videoSource,
                autoPlay: true,
                muted: true,
                loop: true,
                playsInline: true,
                style: "width: 100%; height: 100%; object-fit: cover;"
            })
            : null;
        const imagePlaceholder = item.type === "image" && !videoNode && !imageSource
            ? element(
                "div",
                { className: "canvas-item-image-placeholder" },
                element("div", { className: "canvas-item-image-placeholder-text" }, "YOUR"),
                element("div", { className: "canvas-item-image-placeholder-text" }, "IMAGE"),
                element("div", { className: "canvas-item-image-placeholder-text" }, "GOES HERE")
            )
            : null;
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

        const chatLines = item.type === "chat"
            ? (() => {
                const lines = getChatLines(item);
                return element(
                    "div",
                    { className: "canvas-item-chat" },
                    element("div", { className: "canvas-item-chat-title" }, item.chatTitle ?? "Live Chat"),
                    element(
                        "div",
                        { className: "canvas-item-chat-lines" },
                        ...lines.map((line, index) =>
                            element("div", { key: `${item.id}-chat-line-${index}`, className: "canvas-item-chat-line" }, line)
                        )
                    )
                );
            })()
            : null;

        return element(
            "div",
            {
                key: item.id,
                className: `canvas-item canvas-item-${item.type} ${selected ? "canvas-item-selected" : ""}`.trim(),
                style: getItemStyle(item),
                onMouseDown: handleItemMouseDown(item.id),
                onDoubleClick: handleItemDoubleClick(item.id)
            },
            element("div", { className: "canvas-item-handles" },
                element("div", { className: "canvas-item-handle canvas-item-handle-nw", onMouseDown: beginResize(item.id, "nw") }),
                element("div", { className: "canvas-item-handle canvas-item-handle-ne", onMouseDown: beginResize(item.id, "ne") }),
                element("div", { className: "canvas-item-handle canvas-item-handle-sw", onMouseDown: beginResize(item.id, "sw") }),
                element("div", { className: "canvas-item-handle canvas-item-handle-se", onMouseDown: beginResize(item.id, "se") })
            ),
            element(
                "div",
                { className: "canvas-item-body" },
                videoNode,
                imagePlaceholder,
                progressNode,
                chatLines,
                item.type === "chat" ? null : element("span", { className: "canvas-item-label" }, getDisplayLabel(item))
            )
        );
    });

