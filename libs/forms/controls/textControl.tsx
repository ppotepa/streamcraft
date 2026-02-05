import React from "react";
import type { ControlRenderer } from "./types";

export const renderText: ControlRenderer = ({ children }, { renderChildren }) => (
    <>{renderChildren(children)}</>
);
