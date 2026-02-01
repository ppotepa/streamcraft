import React from "react";
import type { ControlRenderer } from "./types";
import type { FormChild } from "../core";

export const renderDocBar: ControlRenderer = ({ props }, { renderChildren }) => (
    <section className="doc-bar">
        <div className="doc-tabs">{renderChildren(props?.left as FormChild[])}</div>
        <div className="doc-controls">{renderChildren(props?.right as FormChild[])}</div>
    </section>
);
