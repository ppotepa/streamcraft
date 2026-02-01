import React from "react";
import type { ControlRenderer } from "./types";

export const renderGrid: ControlRenderer = ({ props, children }, { renderChildren }) => {
    const className = (props?.className as string | undefined) ?? "";
    return <section className={`grid-layer ${className}`.trim()}>{renderChildren(children)}</section>;
};
