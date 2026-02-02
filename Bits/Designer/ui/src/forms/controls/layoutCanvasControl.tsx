import React from "react";
import type { ControlRenderer } from "./types";

export const renderLayoutCanvas: ControlRenderer = ({ props, children }, { resolveStyle, renderChildren, raiseEvent }) => {
    const gridSize = (props?.gridSize as number | string | undefined) ?? 24;
    const gridColor = (props?.gridColor as string | undefined) ?? "rgba(255, 255, 255, 0.08)";
    const background = (props?.background as string | undefined) ?? "#0b6a6a";
    const showGrid = (props?.showGrid as boolean | undefined) ?? true;
    const className = (props?.className as string | undefined) ?? "";
    const style = resolveStyle?.(props) ?? {};
    const onClick = props?.onClick as string | undefined;
    const onMouseDown = props?.onMouseDown as ((event: React.MouseEvent<HTMLDivElement>) => void) | undefined;
    const onMouseMove = props?.onMouseMove as ((event: React.MouseEvent<HTMLDivElement>) => void) | undefined;
    const onMouseUp = props?.onMouseUp as ((event: React.MouseEvent<HTMLDivElement>) => void) | undefined;
    const onWheel = props?.onWheel as ((event: React.WheelEvent<HTMLDivElement>) => void) | undefined;

    const sizeValue = typeof gridSize === "number" ? `${gridSize}px` : gridSize;
    const gridBackground = showGrid
        ? `linear-gradient(to right, ${gridColor} 1px, transparent 1px), linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)`
        : "none";

    const canvasStyle: React.CSSProperties = {
        ...style,
        width: "100%",
        height: "100%",
        backgroundColor: background,
        backgroundImage: gridBackground,
        backgroundSize: showGrid ? `${sizeValue} ${sizeValue}` : undefined,
        position: "relative",
        overflow: "hidden"
    };

    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (onClick && raiseEvent) {
            raiseEvent(onClick, { event });
        }
    };

    return (
        <div
            className={`layout-canvas ${className}`.trim()}
            style={canvasStyle}
            onClick={handleClick}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onWheel={onWheel}
        >
            {renderChildren(children)}
        </div>
    );
};
