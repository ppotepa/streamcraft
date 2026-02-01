import React from "react";
import type { ControlRenderer } from "./types";

export const renderTableLayoutPanel: ControlRenderer = ({ props, children }, { renderChildren, resolveStyle }) => {
    const rows = (props?.rows as number | undefined) ?? 1;
    const cols = (props?.cols as number | undefined) ?? 1;
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
        const row = childProps?.row as number | undefined;
        const col = childProps?.col as number | undefined;
        const rowSpan = childProps?.rowSpan as number | undefined;
        const colSpan = childProps?.colSpan as number | undefined;

        const cellStyle: React.CSSProperties = {
            ...(childProps?.style ?? {}),
            gridRow: row !== undefined ? `${row + 1} / span ${rowSpan ?? 1}` : undefined,
            gridColumn: col !== undefined ? `${col + 1} / span ${colSpan ?? 1}` : undefined
        };

        return React.cloneElement(child, { style: cellStyle } as any);
    });

    return (
        <div className={`table-layout-panel ${className}`.trim()} style={tableStyle}>
            {processedChildren}
        </div>
    );
};
