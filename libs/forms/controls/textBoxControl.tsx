import React, { useEffect, useState } from "react";
import type { ControlRenderer } from "./types";

export const renderTextBox: ControlRenderer = ({ props }, { resolveStyle, raiseEvent }) => {
    const value = (props?.value as string | undefined) ?? "";
    const placeholder = props?.placeholder as string | undefined;
    const readOnly = (props?.readOnly as boolean | undefined) ?? false;
    const password = (props?.password as boolean | undefined) ?? false;
    const multiline = (props?.multiline as boolean | undefined) ?? false;
    const rows = (props?.rows as number | undefined) ?? 3;
    const maxLength = props?.maxLength as number | undefined;
    const className = (props?.className as string | undefined) ?? "";
    const style = resolveStyle(props);

    const onChange = props?.onChange as string | undefined;
    const onFocus = props?.onFocus as string | undefined;
    const onBlur = props?.onBlur as string | undefined;
    const onKeyPress = props?.onKeyPress as string | undefined;

    const [currentValue, setCurrentValue] = useState(value);

    useEffect(() => {
        setCurrentValue(value);
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setCurrentValue(e.target.value);
        if (onChange && raiseEvent) {
            raiseEvent(onChange, { value: e.target.value, event: e });
        }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (onFocus && raiseEvent) {
            raiseEvent(onFocus, { event: e });
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (onBlur && raiseEvent) {
            raiseEvent(onBlur, { event: e });
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (onKeyPress && raiseEvent) {
            raiseEvent(onKeyPress, { key: e.key, event: e });
        }
    };

    if (multiline) {
        return (
            <textarea
                className={`textbox textbox-multiline ${className}`.trim()}
                style={style}
                value={currentValue}
                placeholder={placeholder}
                readOnly={readOnly}
                rows={rows}
                maxLength={maxLength}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyPress={handleKeyPress}
            />
        );
    }

    return (
        <input
            type={password ? "password" : "text"}
            className={`textbox ${className}`.trim()}
            style={style}
            value={currentValue}
            placeholder={placeholder}
            readOnly={readOnly}
            maxLength={maxLength}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyPress={handleKeyPress}
        />
    );
};
