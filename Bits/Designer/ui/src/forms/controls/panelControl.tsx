import React from "react";
import type { ControlRenderer } from "./types";

export const renderPanel: ControlRenderer = ({ props, children }, { DraggableContainer, renderChildren, resolveStyle }) => {
    const title = props?.title as string | undefined;
    const className = (props?.className as string | undefined) ?? "";
    const draggable = props?.draggable as boolean | undefined;
    const dragBounds = props?.dragBounds as string | undefined;
    const dragHandle = props?.dragHandle as string | undefined;
    const showMinimize = (props?.minimize as boolean | undefined) ?? true;
    const showMaximize = (props?.maximize as boolean | undefined) ?? false;
    const showClose = (props?.close as boolean | undefined) ?? false;
    const style = resolveStyle(props);
    if (!title) {
        return (
            <DraggableContainer
                tag="div"
                className={`panel ${className}`.trim()}
                draggable={draggable}
                dragBounds={dragBounds}
                dragHandle={dragHandle}
                props={style ? { style } : undefined}
            >
                {renderChildren(children)}
            </DraggableContainer>
        );
    }
    return (
        <DraggableContainer
            tag="div"
            className={`window panel ${className}`.trim()}
            draggable={draggable}
            dragBounds={dragBounds}
            dragHandle={dragHandle ?? ".title-bar"}
            props={style ? { style } : undefined}
        >
            <div className="title-bar">
                <div className="title-bar-text">{title}</div>
                <div className="title-bar-controls">
                    {showMinimize ? <button aria-label="Minimize" /> : null}
                    {showMaximize ? <button aria-label="Maximize" /> : null}
                    {showClose ? <button aria-label="Close" /> : null}
                </div>
            </div>
            <div className="window-body">{renderChildren(children)}</div>
        </DraggableContainer>
    );
};
