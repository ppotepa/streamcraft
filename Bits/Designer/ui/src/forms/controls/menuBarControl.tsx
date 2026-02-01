import React from "react";
import type { ControlRenderer } from "./types";

export const renderMenuBar: ControlRenderer = ({ children }, { renderChildren }) => (
    <nav className="menu-bar">{renderChildren(children)}</nav>
);
