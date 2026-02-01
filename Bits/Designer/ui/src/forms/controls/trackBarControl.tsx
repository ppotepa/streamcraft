import React, { useState } from "react";
import { ControlRenderer } from "./types";

export const renderTrackBar: ControlRenderer = (node, context) => {
    const {
        value = "0",
        minimum = "0",
        maximum = "100",
        tickFrequency = "10",
        orientation = "horizontal", // horizontal, vertical
        enabled = "true",
        onChange = "",
        style = ""
    } = node.props;

    const min = parseFloat(minimum);
    const max = parseFloat(maximum);
    const [currentValue, setCurrentValue] = useState(parseFloat(value));
    const isEnabled = enabled === "true" || enabled === true;
    const isVertical = orientation === "vertical";

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = parseFloat(e.target.value);
        setCurrentValue(newValue);

        if (onChange && context.raiseEvent) {
            context.raiseEvent(onChange, {
                value: newValue,
                sender: node
            });
        }
    };

    const combinedStyle = context.resolveStyle?.(node.props) || {};
    if (style) {
        Object.assign(combinedStyle, context.parseStyleString?.(style) || {});
    }

    // Add orientation styling
    if (isVertical) {
        combinedStyle.writingMode = "bt-lr";
        combinedStyle.WebkitAppearance = "slider-vertical";
        combinedStyle.height = combinedStyle.height || "150px";
        combinedStyle.width = combinedStyle.width || "30px";
    } else {
        combinedStyle.width = combinedStyle.width || "200px";
    }

    return (
        <div className="trackbar-container" style={{ display: "inline-flex", flexDirection: "column", alignItems: isVertical ? "center" : "flex-start" }}>
            <input
                type="range"
                className={`trackbar ${isVertical ? "trackbar-vertical" : "trackbar-horizontal"}`}
                min={min}
                max={max}
                step={parseFloat(tickFrequency)}
                value={currentValue}
                onChange={handleChange}
                disabled={!isEnabled}
                style={combinedStyle}
                orient={isVertical ? "vertical" : "horizontal"}
            />
            <span className="trackbar-value" style={{ fontSize: "12px", marginTop: isVertical ? "0" : "5px" }}>
                {currentValue}
            </span>
        </div>
    );
};
