import React, { useMemo, useRef, useState } from "react";
import { getNextWindowZIndex } from "../core";
import type { ControlRenderer } from "./types";
import { renderIcon } from "./iconHelpers";

let cascadeOffset = 0;
const CASCADE_STEP = 16;
const CASCADE_RESET = 160;

export const renderWindow: ControlRenderer = ({ props, children }, { DraggableContainer, renderChildren, resolveStyle, raiseEvent }) => {
    const title = props?.title as string | undefined;
    const icon = props?.icon as string | undefined;
    const className = props?.className as string | undefined;
    const bodyClassName = props?.bodyClassName as string | undefined;
    const draggable = props?.draggable as boolean | undefined;
    const dragBounds = props?.dragBounds as string | undefined;
    const dragHandle = props?.dragHandle as string | undefined;
    const onDragStartEvent = props?.onDragStart as string | undefined;
    const onDragMoveEvent = props?.onDragMove as string | undefined;
    const onDragEndEvent = props?.onDragEnd as string | undefined;
    const dialog = (props?.dialog as boolean | undefined) ?? false;
    const isDocked = (props?.isDocked as boolean | undefined) ?? false;
    const onUndock = props?.onUndock as string | undefined;
    const undockIcon = (props?.undockIcon as string | undefined) ?? "pin";
    let showMinimize = dialog ? false : ((props?.minimize as boolean | undefined) ?? true);
    let showMaximize = dialog ? false : ((props?.maximize as boolean | undefined) ?? true);
    let showClose = (props?.close as boolean | undefined) ?? true;
    if (isDocked) {
        showMinimize = false;
        showMaximize = false;
        showClose = false;
    }
    const onClose = props?.onClose as string | undefined;
    const startMaximized = (props?.startMaximized as boolean | undefined) ?? false;
    const style = resolveStyle?.(props) ?? {};
    const startPosition = (props?.startPosition as string | undefined)?.toLowerCase() ?? "manual";

    const [isMaximized, setIsMaximized] = useState(startMaximized);
    const [initialZIndex] = useState(() => getNextWindowZIndex());
    const [restoredBounds, setRestoredBounds] = useState<React.CSSProperties | null>(null);
    const lastBoundsRef = useRef<React.CSSProperties | null>(null);

    const hasLeft = style.left !== undefined;
    const hasTop = style.top !== undefined;
    const hasTransform = (style as React.CSSProperties).transform !== undefined;

    if (!hasLeft && !hasTop) {
        if (startPosition === "centerscreen" || startPosition === "centerparent") {
            if (!style.position) {
                style.position = "absolute";
            }
            style.left = "50%";
            style.top = "50%";
            if (!hasTransform) {
                style.transform = "translate(-50%, -50%)";
            }
        } else if (startPosition === "cascade") {
            if (!style.position) {
                style.position = "absolute";
            }
            const offset = cascadeOffset;
            cascadeOffset = (cascadeOffset + CASCADE_STEP) % CASCADE_RESET;
            style.left = `calc(50% + ${offset}px)`;
            style.top = `calc(50% + ${offset}px)`;
            if (!hasTransform) {
                style.transform = "translate(-50%, -50%)";
            }
        }
    }

    const handleDragStart = ({ left, top, zIndex }: { left: number; top: number; zIndex?: number }) => {
        if ((style as React.CSSProperties).transform && !hasLeft && !hasTop) {
            style.left = `${left}px`;
            style.top = `${top}px`;
            delete (style as React.CSSProperties).transform;
        }
        if (onDragStartEvent && raiseEvent) {
            raiseEvent(onDragStartEvent, { left, top, zIndex, sender: props });
        }
    };

    const handleDragEnd = ({ left, top }: { left: number; top: number }) => {
        if (onDragEndEvent && raiseEvent) {
            raiseEvent(onDragEndEvent, { left, top, sender: props });
        }
    };

    const handleDragMove = ({ left, top }: { left: number; top: number }) => {
        if (onDragMoveEvent && raiseEvent) {
            raiseEvent(onDragMoveEvent, { left, top, sender: props });
        }
    };

    const windowStyle = useMemo(() => {
        if (isMaximized) {
            return {
                ...style,
                position: "fixed",
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
                width: "100vw",
                height: "100vh",
                transform: undefined,
                margin: 0,
                zIndex: initialZIndex
            } as React.CSSProperties;
        }
        return {
            ...style,
            ...(restoredBounds ?? {}),
            zIndex: initialZIndex
        } as React.CSSProperties;
    }, [initialZIndex, isMaximized, restoredBounds, style]);

    const windowProps = { style: windowStyle };

    const toggleMaximize = () => {
        if (isMaximized) {
            setIsMaximized(false);
            return;
        }
        const snapshot = {
            left: style.left,
            top: style.top,
            width: style.width,
            height: style.height,
            position: style.position,
            transform: (style as React.CSSProperties).transform
        } as React.CSSProperties;
        lastBoundsRef.current = snapshot;
        setRestoredBounds(snapshot);
        setIsMaximized(true);
    };

    return (
        <DraggableContainer
            tag="div"
            className={`window window-shell${isDocked ? " window-docked" : ""}${className ? ` ${className}` : ""}`}
            draggable={draggable && !isMaximized}
            dragBounds={dragBounds}
            dragHandle={dragHandle ?? ".title-bar"}
            props={windowProps}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
        >
            <div className="title-bar">
                <div className="title-bar-text">
                    <span className="sc-icon-inline">
                        {renderIcon(icon)}
                        <span className="sc-icon-text">{title}</span>
                    </span>
                </div>
                <div className="title-bar-controls">
                    {isDocked ? (
                        <button
                            aria-label="Unpin"
                            className="title-bar-unpin"
                            onClick={() => {
                                if (onUndock && raiseEvent) {
                                    raiseEvent(onUndock, { sender: props });
                                }
                            }}
                        >
                            {renderIcon(undockIcon)}
                        </button>
                    ) : null}
                    {showMinimize ? <button aria-label="Minimize" /> : null}
                    {showMaximize ? <button aria-label={isMaximized ? "Restore" : "Maximize"} onClick={toggleMaximize} /> : null}
                    {showClose ? (
                        <button
                            aria-label="Close"
                            onClick={() => {
                                if (onClose && raiseEvent) {
                                    raiseEvent(onClose, { sender: props });
                                }
                            }}
                        />
                    ) : null}
                </div>
            </div>
            <div className={`window-body designer-body${bodyClassName ? ` ${bodyClassName}` : ""}`}>{renderChildren(children)}</div>
        </DraggableContainer>
    );
};
