import React from "react";
import type { ControlRenderer } from "./types";

export const renderElement: ControlRenderer = ({ props, children }, { renderChildren, resolveStyle }) => {
    const tag = props?.tag as keyof JSX.IntrinsicElements | undefined;
    const {
        tag: _,
        style: __style,
        __eventHandlers,
        __raiseEvent,
        __bindingData,
        __updateBinding,
        ...rest
    } = props ?? {};
    const resolvedStyle = resolveStyle(props);
    const safeTag = typeof tag === "string" && tag.length > 0 ? tag : "div";
    const voidTags = new Set([
        "area",
        "base",
        "br",
        "col",
        "embed",
        "hr",
        "img",
        "input",
        "link",
        "meta",
        "param",
        "source",
        "track",
        "wbr"
    ]);
    if (voidTags.has(safeTag)) {
        return React.createElement(safeTag, { ...rest, style: resolvedStyle });
    }
    return React.createElement(safeTag, { ...rest, style: resolvedStyle }, renderChildren(children));
};
