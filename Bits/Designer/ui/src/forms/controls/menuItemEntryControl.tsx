import React from "react";
import type { ControlRenderer } from "./types";

export const renderMenuItemEntry: ControlRenderer = ({ props, children }, { renderChildren, resolveStyle, raiseEvent }) => {
    const className = (props?.className as string | undefined) ?? "";
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
            {renderChildren(children)}
        </div>
    );
};
