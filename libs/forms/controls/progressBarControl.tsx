import React from "react";
import { ControlRenderer } from "./types";

export const renderProgressBar: ControlRenderer = (node, context) => {
    const {
        value = "0",
        minimum = "0",
        maximum = "100",
        progressStyle = "continuous", // continuous, blocks
        style = ""
    } = node.props;

    const min = parseFloat(minimum);
    const max = parseFloat(maximum);
    const val = parseFloat(value);

    // Calculate percentage
    const percentage = Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100));

    const isBlocks = progressStyle === "blocks";

    const combinedStyle = context.resolveStyle?.(node.props) || {};
    if (style) {
        Object.assign(combinedStyle, context.parseStyleString?.(style) || {});
    }

    return (
        <div className="progressbar" style={combinedStyle}>
            <div
                className={`progressbar-fill ${isBlocks ? "progressbar-blocks" : ""}`}
                style={{ width: `${percentage}%` }}
            >
                {isBlocks && (
                    <div className="progressbar-blocks-pattern"></div>
                )}
            </div>
        </div>
    );
};
