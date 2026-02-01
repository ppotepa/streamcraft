import React from "react";
import type { ControlRenderer } from "./types";
import { renderIcon } from "./iconHelpers";

export const renderButton: ControlRenderer = ({ props, children }, { renderChildren, resolveStyle, raiseEvent }) => {
    const text = props?.text as string | undefined;
    const enabled = (props?.enabled as boolean | undefined) ?? true;
    const isDefault = (props?.default as boolean | undefined) ?? false;
    const icon = props?.icon as string | undefined;
    const iconPosition = (props?.iconPosition as string | undefined) ?? "left";
    const iconOnly = (props?.iconOnly as boolean | undefined) ?? false;
    const className = (props?.className as string | undefined) ?? "";
    const style = resolveStyle(props);

    const onClick = props?.onClick as string | undefined;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!enabled) return;
        if (onClick && raiseEvent) {
            raiseEvent(onClick, { event: e });
        }
    };

    // If text prop is provided, use it; otherwise render children
    const content = text ?? renderChildren(children);
    const iconNode = renderIcon(icon);

    const buttonClass = `button ${isDefault ? "button-default" : ""} ${className}`.trim();

    return (
        <button
            type="button"
            className={buttonClass}
            style={style}
            disabled={!enabled}
            onClick={handleClick}
            data-default={isDefault || undefined}
        >
            <span className={`sc-icon-inline ${iconOnly ? "sc-icon-only" : ""}`.trim()}>
                {iconPosition === "left" ? iconNode : null}
                {iconOnly ? null : <span className="sc-icon-text">{content}</span>}
                {iconPosition === "right" ? iconNode : null}
            </span>
        </button>
    );
};
