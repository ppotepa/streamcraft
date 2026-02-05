import React from "react";
import type { ControlRenderer } from "./types";
import { coercePositiveInt, coerceNumber } from "../core/layout";

export const renderTableLayoutPanel: ControlRenderer = ({ props, children }, { renderChildren, resolveStyle }) => {
    const rows = coercePositiveInt(props?.rows, 1);
    const cols = coercePositiveInt(props?.cols, 1);
    const className = (props?.className as string | undefined) ?? "";
    const style = resolveStyle(props);

    const tableStyle: React.CSSProperties = {
        ...style,
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, auto)`,
        gap: style?.gap ?? "8px"
    };

    // Process children to apply row/col/rowSpan/colSpan
    const processedChildren = React.Children.map(renderChildren(children), (child, index) => {
        if (!React.isValidElement(child)) return child;

        const childProps = child.props as any;
        const row = coerceNumber(childProps?.row, undefined);
        const col = coerceNumber(childProps?.col, undefined);
        const rowSpan = coercePositiveInt(childProps?.rowSpan, 1);
        const colSpan = coercePositiveInt(childProps?.colSpan, 1);

        const cellStyle: React.CSSProperties = {
            ...(childProps?.style ?? {}),
            gridRow: row !== undefined ? `${row + 1} / span ${rowSpan}` : undefined,
            gridColumn: col !== undefined ? `${col + 1} / span ${colSpan}` : undefined
        };

        return React.cloneElement(child, { style: cellStyle } as any);
    });

    return (
        <div className={`table-layout-panel ${className}`.trim()} style={tableStyle}>
            {processedChildren}
        </div>
    );
};
