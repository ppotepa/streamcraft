import React from "react";
import type { ControlRenderer } from "./types";
import { renderIcon } from "./iconHelpers";

export const renderMenuItemEntry: ControlRenderer = ({ props, children }, { renderChildren, resolveStyle, raiseEvent }) => {
    const className = (props?.className as string | undefined) ?? "";
    const icon = props?.icon as string | undefined;
    const iconPosition = (props?.iconPosition as string | undefined) ?? "left";
    const style = resolveStyle?.(props);
    const onClick = props?.onClick as string | undefined;

    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (onClick && raiseEvent) {
            raiseEvent(onClick, { event });
        }
    };

    return (
        <div
            className={`menu-dropdown-item ${className}`.trim()}
            style={style}
            onClick={handleClick}
        >
            <span className="sc-icon-inline">
                {iconPosition === "left" ? renderIcon(icon) : null}
                <span className="sc-icon-text">{renderChildren(children)}</span>
                {iconPosition === "right" ? renderIcon(icon) : null}
            </span>
        </div>
    );
};
