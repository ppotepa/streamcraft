import React from "react";
import type { ControlRenderer } from "../controls/types";
import { controlRegistry } from "../registry";

const renderBadge: ControlRenderer = ({ props, children }, { renderChildren, resolveStyle }) => {
    const text = (props?.text as string | undefined) ?? "Badge";
    const className = (props?.className as string | undefined) ?? "";
    const style = resolveStyle(props);
    return (
        <span className={`sc-badge ${className}`.trim()} style={style}>
            {text}
            {renderChildren(children)}
        </span>
    );
};

export const registerSamplePlugin = () => {
    controlRegistry.register("badge", renderBadge, {
        aliases: ["Badge"],
        defaults: {
            text: "Badge"
        },
        validate: (props) => {
            const errors: string[] = [];
            if (props.text !== undefined && typeof props.text !== "string") {
                errors.push("badge text must be a string.");
            }
            return errors;
        }
    });
};
