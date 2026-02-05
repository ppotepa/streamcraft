import React from "react";
import type { ControlRenderer } from "./types";

export const renderDock: ControlRenderer = ({ props, children }, { DraggableContainer, renderChildren }) => {
    const className = (props?.className as string | undefined) ?? "";
    const draggable = props?.draggable as boolean | undefined;
    const dragBounds = props?.dragBounds as string | undefined;
    const dragHandle = props?.dragHandle as string | undefined;
    return (
        <DraggableContainer
            tag="aside"
            className={`dock ${className}`.trim()}
            draggable={draggable}
            dragBounds={dragBounds}
            dragHandle={dragHandle}
        >
            {renderChildren(children)}
        </DraggableContainer>
    );
};
