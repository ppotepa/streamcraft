import React from "react";
import type { ControlRenderer } from "./types";
import type { FormChild } from "../core";

export const renderContextBar: ControlRenderer = ({ props }, { renderChildren }) => {
    const left = renderChildren(props?.left as FormChild[]) ?? [];
    const center = renderChildren(props?.center as FormChild[]) ?? [];
    const right = renderChildren(props?.right as FormChild[]) ?? [];
    const items = renderChildren(props?.items as FormChild[]) ?? [];

    return (
        <section className="context-bar">
            <div className="context-bar-group context-bar-left">
                {left.length > 0 ? left : items}
            </div>
            <div className="context-bar-group context-bar-center">{center}</div>
            <div className="context-bar-group context-bar-right">{right}</div>
        </section>
    );
};
