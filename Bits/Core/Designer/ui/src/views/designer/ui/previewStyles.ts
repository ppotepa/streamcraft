import type { CanvasItem } from "../domain/types";

export const getPreviewItemStyle = (
    item: CanvasItem,
    resolveImageSource: (item: CanvasItem) => string | undefined,
    getImageSource: (item: CanvasItem) => string | undefined,
    getVideoSource: (item: CanvasItem) => string | undefined
) => {
    const toPercentX = (value: number) => (value / 1920) * 100;
    const toPercentY = (value: number) => (value / 1080) * 100;

    const parts = [
        `left: ${toPercentX(item.x)}%;`,
        `top: ${toPercentY(item.y)}%;`,
        `width: ${toPercentX(item.width)}%;`,
        `height: ${toPercentY(item.height)}%;`,
        `z-index: ${item.zIndex ?? 1};`,
        item.visible === false ? "display: none;" : ""
    ].filter(Boolean);

    if (item.type === "line") {
        const thickness = Math.max(2, item.strokeWidth ?? item.height);
        parts.push(`height: ${toPercentY(thickness)}%;`);
        parts.push(`background: ${item.stroke ?? "rgba(0,0,0,0.6)"};`);
        parts.push("border: none;");
        return parts.join(" ");
    }
    if (item.type === "text" || item.type === "chat") {
        parts.push(`font-family: ${item.fontFamily ?? "Segoe UI"};`);
        parts.push(`font-size: ${item.fontSize ?? (item.type === "chat" ? 13 : 16)}px;`);
        parts.push(`font-weight: ${item.fontWeight ?? "normal"};`);
        parts.push(`font-style: ${item.fontStyle ?? "normal"};`);
        parts.push(`color: ${item.textColor ?? (item.type === "chat" ? "#f2f4f8" : "#222222")};`);
        parts.push(`text-transform: ${item.textTransform ?? "none"};`);
        parts.push(`letter-spacing: ${item.letterSpacing ?? 0}px;`);
        const shadowX = item.textShadowX ?? 0;
        const shadowY = item.textShadowY ?? 0;
        const shadowBlur = item.textShadowBlur ?? 0;
        const shadowColor = item.textShadowColor ?? "#000000";
        parts.push(`text-shadow: ${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowColor};`);
        if (item.type === "chat") {
            parts.push(`background: ${item.fill ?? "rgba(19,20,24,0.88)"};`);
            parts.push(`border: 1px solid ${item.stroke ?? "rgba(255,255,255,0.26)"};`);
        }
    }
    if (item.type === "image") {
        const videoSource = getVideoSource(item);
        if (videoSource) {
            return parts.join(" ");
        }
        const source = getImageSource(item);
        if (source) {
            parts.push(`background-image: url('${source}');`);
            parts.push("background-size: cover;");
            parts.push("background-position: center;");
        }
    }
    if (item.type === "rect" || item.type === "ellipse") {
        parts.push(`background: ${item.fill ?? "transparent"};`);
        parts.push(`border: ${item.strokeWidth ?? 1}px solid ${item.stroke ?? "rgba(0,0,0,0.4)"};`);
    }
    if (item.type === "ellipse") {
        parts.push("border-radius: 999px;");
    }
    if (item.type === "text") {
        parts.push("white-space: pre-wrap;");
    }
    if (item.type === "chat") {
        parts.push("white-space: normal;");
    }

    return parts.join(" ");
};

export const getItemStyle = (
    item: CanvasItem,
    getImageSource: (item: CanvasItem) => string | undefined,
    getVideoSource: (item: CanvasItem) => string | undefined
) => {
    const parts = [
        `left: ${item.x}px;`,
        `top: ${item.y}px;`,
        `width: ${item.width}px;`,
        `height: ${item.height}px;`,
        `z-index: ${item.zIndex ?? 1};`,
        item.visible === false ? 'display: none;' : '',
        item.locked ? 'pointer-events: none;' : ''
    ].filter(Boolean);

    if (item.type === "line") {
        const thickness = Math.max(2, item.strokeWidth ?? item.height);
        parts.push(`height: ${thickness}px;`);
        parts.push(`background: ${item.stroke ?? "rgba(0,0,0,0.6)"};`);
        parts.push("border: none;");
        return parts.join(" ");
    }
    if (item.type === "text" || item.type === "chat") {
        parts.push(`font-family: ${item.fontFamily ?? "Segoe UI"};`);
        parts.push(`font-size: ${item.fontSize ?? (item.type === "chat" ? 13 : 16)}px;`);
        parts.push(`font-weight: ${item.fontWeight ?? "normal"};`);
        parts.push(`font-style: ${item.fontStyle ?? "normal"};`);
        parts.push(`color: ${item.textColor ?? (item.type === "chat" ? "#f2f4f8" : "#222222")};`);
        parts.push(`text-transform: ${item.textTransform ?? "none"};`);
        parts.push(`letter-spacing: ${item.letterSpacing ?? 0}px;`);
        const shadowX = item.textShadowX ?? 0;
        const shadowY = item.textShadowY ?? 0;
        const shadowBlur = item.textShadowBlur ?? 0;
        const shadowColor = item.textShadowColor ?? "#000000";
        parts.push(`text-shadow: ${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowColor};`);
        if (item.type === "chat") {
            parts.push(`background: ${item.fill ?? "rgba(19,20,24,0.88)"};`);
            parts.push(`border: 1px solid ${item.stroke ?? "rgba(255,255,255,0.26)"};`);
        }
    }
    if (item.type === "image") {
        const videoSource = getVideoSource(item);
        if (videoSource) {
            return parts.join(" ");
        }
        const source = getImageSource(item);
        if (source) {
            parts.push(`background-image: url('${source}');`);
            parts.push("background-size: cover;");
            parts.push("background-position: center;");
        }
    }
    if (item.type === "rect" || item.type === "ellipse") {
        parts.push(`background: ${item.fill ?? "transparent"};`);
        parts.push(`border: 1px solid ${item.stroke ?? "rgba(0,0,0,0.35)"};`);
    }
    return parts.join(" ");
};
