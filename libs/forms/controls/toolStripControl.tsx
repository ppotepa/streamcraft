import React from "react";
import type { ControlRenderer } from "./types";
import type { FormChild } from "../core";

export const renderToolStrip: ControlRenderer = ({ props }, { renderChildren }) => (
    <section className="tool-strip">
        <div className="tool-tiles">{renderChildren(props?.tiles as FormChild[])}</div>
        <div className="tool-options">{renderChildren(props?.options as FormChild[])}</div>
        <div className="tool-actions">{renderChildren(props?.actions as FormChild[])}</div>
    </section>
);
