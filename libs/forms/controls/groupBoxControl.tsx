import React from "react";
import type { ControlRenderer } from "./types";

export const renderGroupBox: ControlRenderer = ({ props, children }, { renderChildren, resolveStyle, raiseEvent }) => {
    const text = props?.text as string | undefined;
    const className = (props?.className as string | undefined) ?? "";
    const style = resolveStyle(props);
    const collapsible = Boolean(props?.collapsible);
    const collapsed = Boolean(props?.collapsed);
    const onToggle = props?.onToggle as string | undefined;

    const handleToggle = () => {
        if (!onToggle || !raiseEvent) return;
        raiseEvent(onToggle, { collapsed: !collapsed });
    };

    const classes = ["group-box", className];
    if (collapsible) classes.push("group-box-collapsible");
    if (collapsed) classes.push("group-box-collapsed");

    return (
        <fieldset className={classes.filter(Boolean).join(" ")} style={style}>
            {text && (
                <legend className="group-box-legend">
                    {collapsible ? (
                        <button
                            type="button"
                            className="group-box-legend-button"
                            onClick={handleToggle}
                            aria-expanded={!collapsed}
                        >
                            <span className="group-box-legend-caret">{collapsed ? "▸" : "▾"}</span>
                            {text}
                        </button>
                    ) : (
                        text
                    )}
                </legend>
            )}
            {!collapsed && (
                <div className="group-box-content">
                    {renderChildren(children)}
                </div>
            )}
        </fieldset>
    );
};
