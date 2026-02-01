import React from "react";
import type { ControlRenderer } from "./types";
import { normalizeOrientation } from "../core/layout";

export const renderFlowLayoutPanel: ControlRenderer = ({ props, children }, { renderChildren, resolveStyle }) => {
    const direction = normalizeOrientation(props?.direction as string | undefined);
    const wrap = (props?.wrap as boolean | undefined) ?? true;
    const className = (props?.className as string | undefined) ?? "";
    const style = resolveStyle(props);

    const flowStyle: React.CSSProperties = {
        ...style,
        display: "flex",
        flexDirection: direction === "vertical" ? "column" : "row",
        flexWrap: wrap ? "wrap" : "nowrap",
        gap: style?.gap ?? "8px"
    };

    return (
        <div className={`flow-layout-panel ${className}`.trim()} style={flowStyle}>
            {renderChildren(children)}
        </div>
    );
};
