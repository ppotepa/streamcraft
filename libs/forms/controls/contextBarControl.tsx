import React from "react";
import type { ControlRenderer } from "./types";
import type { FormChild } from "../core";

export const renderContextBar: ControlRenderer = ({ props }, { renderChildren }) => {
    const left = React.Children.toArray(renderChildren(props?.left as FormChild[]));
    const center = React.Children.toArray(renderChildren(props?.center as FormChild[]));
    const right = React.Children.toArray(renderChildren(props?.right as FormChild[]));
    const items = React.Children.toArray(renderChildren(props?.items as FormChild[]));

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
