import React, { useState, useRef, useEffect } from "react";
import type { ControlRenderer } from "./types";
import { coercePercent, normalizeOrientation } from "../core/layout";

export const renderSplitContainer: ControlRenderer = ({ props, children }, { renderChildren, resolveStyle }) => {
    const orientation = normalizeOrientation(props?.orientation as string | undefined);
    const initialSplit = (props?.splitPosition as string | number | undefined) ?? "50";
    const fixedPanel = (props?.fixedPanel as string | undefined) ?? "none";
    const className = (props?.className as string | undefined) ?? "";
    const style = resolveStyle(props);

    const [splitPos, setSplitPos] = useState<number>(coercePercent(initialSplit, 50));
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const isHorizontal = orientation === "horizontal";

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();

            if (isHorizontal) {
                const newPos = ((e.clientX - rect.left) / rect.width) * 100;
                setSplitPos(Math.max(10, Math.min(90, newPos)));
            } else {
                const newPos = ((e.clientY - rect.top) / rect.height) * 100;
                setSplitPos(Math.max(10, Math.min(90, newPos)));
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, isHorizontal]);

    const containerStyle: React.CSSProperties = {
        ...style,
        display: "flex",
        flexDirection: isHorizontal ? "row" : "column",
        width: "100%",
        height: "100%",
        position: "relative"
    };

    const panel1Style: React.CSSProperties = {
        flexShrink: fixedPanel === "panel1" ? 0 : 1,
        flexBasis: `${splitPos}%`,
        overflow: "auto"
    };

    const panel2Style: React.CSSProperties = {
        flexShrink: fixedPanel === "panel2" ? 0 : 1,
        flexBasis: `${100 - splitPos}%`,
        overflow: "auto"
    };

    const splitterStyle: React.CSSProperties = {
        flexShrink: 0,
        background: "var(--button-face, #c0c0c0)",
        cursor: isHorizontal ? "col-resize" : "row-resize",
        width: isHorizontal ? "4px" : "100%",
        height: isHorizontal ? "100%" : "4px",
        borderLeft: isHorizontal ? "1px solid var(--border-dark, #808080)" : "none",
        borderRight: isHorizontal ? "1px solid var(--border-light, #fff)" : "none",
        borderTop: !isHorizontal ? "1px solid var(--border-dark, #808080)" : "none",
        borderBottom: !isHorizontal ? "1px solid var(--border-light, #fff)" : "none"
    };

    const childArray = React.Children.toArray(renderChildren(children));
    const panel1Content = childArray[0] ?? null;
    const panel2Content = childArray[1] ?? null;

    return (
        <div ref={containerRef} className={`split-container ${className}`.trim()} style={containerStyle}>
            <div className="split-panel split-panel-1" style={panel1Style}>
                {panel1Content}
            </div>
            <div
                className="split-splitter"
                style={splitterStyle}
                onMouseDown={() => setIsDragging(true)}
            />
            <div className="split-panel split-panel-2" style={panel2Style}>
                {panel2Content}
            </div>
        </div>
    );
};
