import React from "react";
import type { ControlRenderer } from "./types";

export const renderPanelContainer: ControlRenderer = ({ props, children }, { renderChildren, resolveStyle }) => {
    const className = (props?.className as string | undefined) ?? "";
    const style = resolveStyle(props);
    return (
        <section className={`panel-container ${className}`.trim()} style={style}>
            {renderChildren(children)}
        </section>
    );
};
