import React from "react";
import type { ControlRenderer } from "./types";

export const renderGroupBox: ControlRenderer = ({ props, children }, { renderChildren, resolveStyle }) => {
    const text = props?.text as string | undefined;
    const className = (props?.className as string | undefined) ?? "";
    const style = resolveStyle(props);

    return (
        <fieldset className={`group-box ${className}`.trim()} style={style}>
            {text && <legend className="group-box-legend">{text}</legend>}
            <div className="group-box-content">
                {renderChildren(children)}
            </div>
        </fieldset>
    );
};
