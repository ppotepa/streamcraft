import React, { useRef } from "react";
import type { ControlRenderer } from "./types";

export const renderCanvas: ControlRenderer = ({ children }, { renderChildren, useCanvasScale }) => {
    const canvasRef = useRef<HTMLElement>(null);
    useCanvasScale(canvasRef);
    return (
        <main ref={canvasRef} className="canvas-center">
            {renderChildren(children)}
        </main>
    );
};
