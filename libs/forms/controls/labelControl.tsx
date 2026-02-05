import React from "react";
import type { ControlRenderer } from "./types";

export const renderLabel: ControlRenderer = ({ props, children }, { renderChildren, resolveStyle }) => {
    const text = props?.text as string | undefined;
    const textAlign = (props?.textAlign as string | undefined) ?? "left";
    const className = (props?.className as string | undefined) ?? "";
    const style = resolveStyle(props);

    const combinedStyle = {
        ...style,
        textAlign: textAlign as any,
    };

    // If text prop is provided, use it; otherwise render children
    const content = text ?? renderChildren(children);

    return (
        <span className={`label ${className}`.trim()} style={combinedStyle}>
            {content}
        </span>
    );
};
