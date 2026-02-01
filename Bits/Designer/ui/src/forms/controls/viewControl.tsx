import React from "react";
import type { ControlRenderer } from "./types";

export const renderView: ControlRenderer = ({ props, children }, { DraggableContainer, renderChildren }) => {
    const className = (props?.className as string | undefined) ?? "";
    const draggable = props?.draggable as boolean | undefined;
    const dragBounds = props?.dragBounds as string | undefined;
    const dragHandle = props?.dragHandle as string | undefined;
    return (
        <DraggableContainer
            tag="section"
            className={`view ${className}`.trim()}
            draggable={draggable}
            dragBounds={dragBounds}
            dragHandle={dragHandle}
        >
            {renderChildren(children)}
        </DraggableContainer>
    );
};
