import React from "react";
import type { ControlRenderer } from "./types";

export const renderStatusBar: ControlRenderer = ({ props }, _context) => {
    const segments = (props?.segments as string[]) ?? [];
    return (
        <footer className="status-bar">
            {segments.map((segment, index) => (
                <div key={index} className="status-bar-field">
                    {segment}
                </div>
            ))}
        </footer>
    );
};
