import React from "react";
import type { ControlRenderer } from "./types";

export const renderButton: ControlRenderer = ({ props, children }, { renderChildren, resolveStyle, raiseEvent }) => {
    const text = props?.text as string | undefined;
    const enabled = (props?.enabled as boolean | undefined) ?? true;
    const isDefault = (props?.default as boolean | undefined) ?? false;
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
            {content}
        </button>
    );
};
