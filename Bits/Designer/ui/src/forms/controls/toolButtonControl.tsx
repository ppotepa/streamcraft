import React from "react";
import type { ControlRenderer } from "./types";

export const renderToolButton: ControlRenderer = ({ props }, _context) => {
    const label = props?.label as string | undefined;
    const pressed = props?.pressed as boolean | undefined;
    const hasFlyout = props?.hasFlyout as boolean | undefined;
    const onClick = props?.onClick as (() => void) | undefined;
    return (
        <button className={`tool-tile button ${pressed ? "active" : ""}`} onClick={onClick}>
            <span>{label}</span>
            {hasFlyout ? <span className="tool-flyout">▼</span> : null}
        </button>
    );
};
