import React from "react";
import type { ControlRenderer } from "./types";

export const renderMenuItem: ControlRenderer = ({ props, children }, { renderChildren }) => {
    const label = props?.label as string | undefined;
    return (
        <div className="menu-item">
            {label}
            {children && children.length > 0 ? <div className="menu-dropdown">{renderChildren(children)}</div> : null}
        </div>
    );
};
