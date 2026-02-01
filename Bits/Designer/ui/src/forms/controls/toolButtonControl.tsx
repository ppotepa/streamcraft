import React from "react";
import type { ControlRenderer } from "./types";
import { renderIcon } from "./iconHelpers";

export const renderToolButton: ControlRenderer = ({ props }, _context) => {
    const label = props?.label as string | undefined;
    const icon = props?.icon as string | undefined;
    const iconPosition = (props?.iconPosition as string | undefined) ?? "left";
    const iconOnly = (props?.iconOnly as boolean | undefined) ?? false;
    const pressed = props?.pressed as boolean | undefined;
    const hasFlyout = props?.hasFlyout as boolean | undefined;
    const onClick = props?.onClick as (() => void) | undefined;
    return (
        <button className={`tool-tile button ${pressed ? "active" : ""}`} onClick={onClick}>
            <span className={`sc-icon-inline ${iconOnly ? "sc-icon-only" : ""}`.trim()}>
                {iconPosition === "left" ? renderIcon(icon) : null}
                {iconOnly ? null : <span className="sc-icon-text">{label}</span>}
                {iconPosition === "right" ? renderIcon(icon) : null}
            </span>
            {hasFlyout ? <span className="tool-flyout">▼</span> : null}
        </button>
    );
};
