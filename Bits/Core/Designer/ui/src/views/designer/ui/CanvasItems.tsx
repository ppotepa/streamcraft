import { element } from "@streamcraft/forms/core";
import type { CanvasItem, ChatRenderEntry } from "../domain/types";

type CanvasItemsProps = {
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
};

const mapChatCssTags = (selector: string) =>
    selector
        .replace(/\.container\b/g, ".canvas-item-chat")
        .replace(/\.line\b/g, ".canvas-item-chat-line")
        .replace(/\.msg\b/g, ".canvas-item-chat-content")
        .replace(/\.meta\b/g, ".canvas-item-chat-meta")
        .replace(/\.username\b/g, ".canvas-item-chat-username")
        .replace(/\.timestamp\b/g, ".canvas-item-chat-timestamp")
        .replace(/\.badge\b/g, ".canvas-item-chat-badge")
        .replace(/\.text\b/g, ".canvas-item-chat-text");

const scopeChatCss = (rawCss: string, scopeSelector: string) => {
    const css = rawCss.trim();
    if (!css) return "";
    if (/@import\b/i.test(css)) return "";

    const blockRegex = /([^{}]+)\{([^{}]*)\}/g;
    const scopedBlocks: string[] = [];
    let match = blockRegex.exec(css);
    while (match) {
        const selectorPart = match[1]?.trim() ?? "";
        const bodyPart = match[2] ?? "";
        if (selectorPart.length > 0 && bodyPart.trim().length > 0) {
            const selectors = selectorPart
                .split(",")
                .map((selector) => mapChatCssTags(selector.trim()))
                .filter((selector) => selector.length > 0)
                .map((selector) => selector.startsWith(scopeSelector) ? selector : `${scopeSelector} ${selector}`);
            if (selectors.length > 0) {
                scopedBlocks.push(`${selectors.join(", ")} { ${bodyPart.trim()} }`);
            }
        }
        match = blockRegex.exec(css);
    }
    return scopedBlocks.join("\n");
};

export const buildCanvasItems = ({
    items,
    selectedIds,
    getItemStyle,
    getDisplayLabel,
    getChatLines,
    getChatEntries,
    getProgressPercent,
    getImageSource,
    getVideoSource,
    beginResize,
    handleItemMouseDown,
    handleItemDoubleClick
}: CanvasItemsProps) =>
    items.map((item) => {
        const chatScopeId = item.type === "chat" ? item.id.replace(/[^a-zA-Z0-9_-]/g, "-") : "";
        const chatScopeSelector = chatScopeId ? `[data-chat-scope="${chatScopeId}"]` : "";
        const customChatCssNode = item.type === "chat" && item.chatCustomCssEnabled === true && chatScopeSelector
            ? (() => {
                const scopedCss = scopeChatCss(item.chatCustomCss ?? "", chatScopeSelector);
                if (!scopedCss) return null;
                return element("style", { type: "text/css" }, scopedCss);
            })()
            : null;
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
                const entries = getChatEntries(item);
                const showUsername = item.chatShowUsername !== false;
                const showTimestamp = item.chatShowTimestamp === true;
                const showBadges = item.chatShowBadges === true;
                const showAvatars = item.chatShowAvatars === true;
                const useRoleColors = item.chatRoleColors !== false;
                const fallbackLines = getChatLines(item);
                return element(
                    "div",
                    {
                        className: [
                            "canvas-item-chat",
                            showAvatars ? "chat-show-avatars" : "",
                            useRoleColors ? "chat-role-colors" : ""
                        ].filter(Boolean).join(" ")
                    },
                    element("div", { className: "canvas-item-chat-title" }, item.chatTitle ?? "Live Chat"),
                    element(
                        "div",
                        { className: "canvas-item-chat-lines" },
                        ...(entries.length > 0
                            ? entries.map((entry, index) =>
                                element(
                                    "div",
                                    {
                                        key: `${item.id}-chat-entry-${entry.id}-${index}`,
                                        className: [
                                            "canvas-item-chat-line",
                                            useRoleColors && entry.role ? `chat-role-${entry.role.toLowerCase()}` : ""
                                        ].filter(Boolean).join(" "),
                                        "data-role": entry.role ?? "viewer"
                                    },
                                    showAvatars
                                        ? element("div", {
                                            className: "canvas-item-chat-avatar",
                                            style: entry.avatarUrl ? `background-image: url('${entry.avatarUrl}');` : ""
                                        })
                                        : null,
                                    element(
                                        "div",
                                        { className: "canvas-item-chat-content" },
                                        element(
                                            "div",
                                            { className: "canvas-item-chat-meta" },
                                            ...(showBadges
                                                ? entry.badges.map((badge, badgeIndex) =>
                                                    element("span", { key: `${entry.id}-badge-${badgeIndex}`, className: "canvas-item-chat-badge" }, badge)
                                                )
                                                : []),
                                            showUsername ? element("span", { className: "canvas-item-chat-username" }, entry.username) : null,
                                            showTimestamp
                                                ? element("span", { className: "canvas-item-chat-timestamp" }, new Date(entry.timestamp).toLocaleTimeString())
                                                : null
                                        ),
                                        element("div", { className: "canvas-item-chat-text" }, entry.message)
                                    )
                                )
                            )
                            : fallbackLines.map((line, index) =>
                                element("div", { key: `${item.id}-chat-line-${index}`, className: "canvas-item-chat-line" }, line)
                            ))
                    )
                );
            })()
            : null;

        return element(
            "div",
            {
                key: item.id,
                className: `canvas-item canvas-item-${item.type} ${selected ? "canvas-item-selected" : ""}`.trim(),
                "data-chat-scope": item.type === "chat" ? chatScopeId : undefined,
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
                customChatCssNode,
                chatLines,
                item.type === "chat" ? null : element("span", { className: "canvas-item-label" }, getDisplayLabel(item))
            )
        );
    });

