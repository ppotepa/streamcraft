import React from "react";
import type { ControlRenderer } from "./types";

export const renderRadioButton: ControlRenderer = ({ props }, { resolveStyle, raiseEvent }) => {
    const text = props?.text as string | undefined;
    const group = props?.group as string | undefined;
    const checked = (props?.checked as boolean | undefined) ?? false;
    const enabled = (props?.enabled as boolean | undefined) ?? true;
    const className = (props?.className as string | undefined) ?? "";
    const style = resolveStyle(props);

    const onChange = props?.onChange as string | undefined;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!enabled) return;
        if (onChange && raiseEvent) {
            raiseEvent(onChange, { checked: e.target.checked, group, event: e });
        }
    };

    return (
        <label className={`radio-label ${className}`.trim()} style={style}>
            <input
                type="radio"
                className="radio"
                name={group}
                checked={checked}
                disabled={!enabled}
                onChange={handleChange}
            />
            {text && <span className="radio-text">{text}</span>}
        </label>
    );
};
