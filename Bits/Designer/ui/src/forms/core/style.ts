import type React from "react";

const kebabToCamel = (str: string): string => {
    return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
};

export const parseStyleString = (value: string): React.CSSProperties => {
    const style: React.CSSProperties = {};
    value
        .split(";")
        .map((pair) => pair.trim())
        .filter(Boolean)
        .forEach((pair) => {
            const [key, ...rest] = pair.split(":");
            if (!key || rest.length === 0) return;
            const cssKey = kebabToCamel(key.trim());
            const cssValue = rest.join(":").trim();
            (style as Record<string, string>)[cssKey] = cssValue;
        });
    return style;
};

const resolveDockStyle = (dock?: string): React.CSSProperties | undefined => {
    if (!dock) return undefined;

    const dockLower = dock.toLowerCase();
    switch (dockLower) {
        case "top":
            return {
                position: "absolute",
                top: 0,
                left: 0,
                right: 0
            };
        case "bottom":
            return {
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0
            };
        case "left":
            return {
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0
            };
        case "right":
            return {
                position: "absolute",
                top: 0,
                bottom: 0,
                right: 0
            };
        case "fill":
            return {
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                right: 0
            };
        default:
            return undefined;
    }
};

const resolveAnchorStyle = (anchor?: string): React.CSSProperties | undefined => {
    if (!anchor) return undefined;

    const anchors = anchor.toLowerCase().split(",").map((a) => a.trim());
    const style: React.CSSProperties = {
        position: "absolute"
    };

    const hasTop = anchors.includes("top");
    const hasBottom = anchors.includes("bottom");
    const hasLeft = anchors.includes("left");
    const hasRight = anchors.includes("right");

    if (hasTop) style.top = "10px";
    if (hasBottom) style.bottom = "10px";
    if (hasLeft) style.left = "10px";
    if (hasRight) style.right = "10px";

    if (hasTop && hasBottom) {
        style.height = "auto";
    }

    if (hasLeft && hasRight) {
        style.width = "auto";
    }

    return style;
};

export const resolveLayoutStyle = (layout?: unknown): React.CSSProperties | undefined => {
    if (!layout) return undefined;
    if (typeof layout === "string") {
        return parseStyleString(layout);
    }
    if (typeof layout === "object" && !Array.isArray(layout)) {
        const layoutObj = layout as Record<string, unknown>;
        const style: React.CSSProperties = {};
        const map = ["width", "height", "minWidth", "minHeight", "padding", "margin", "gap"] as const;
        map.forEach((key) => {
            const value = layoutObj[key];
            if (value !== undefined) {
                (style as Record<string, unknown>)[key] = value;
            }
        });
        return Object.keys(style).length > 0 ? style : undefined;
    }
    return undefined;
};

export const resolveStyle = (props?: Record<string, unknown>): React.CSSProperties | undefined => {
    if (!props) return undefined;

    const dockStyle = resolveDockStyle(props.dock as string | undefined);
    const anchorStyle = resolveAnchorStyle(props.anchor as string | undefined);

    const layoutStyle = resolveLayoutStyle(props.layout);
    const rawStyle = props.style;
    let inlineStyle: React.CSSProperties | undefined;
    if (typeof rawStyle === "string") {
        inlineStyle = parseStyleString(rawStyle);
    } else if (typeof rawStyle === "object" && rawStyle !== null && !Array.isArray(rawStyle)) {
        inlineStyle = rawStyle as React.CSSProperties;
    }

    return {
        ...(dockStyle ?? {}),
        ...(anchorStyle ?? {}),
        ...(layoutStyle ?? {}),
        ...(inlineStyle ?? {})
    };
};