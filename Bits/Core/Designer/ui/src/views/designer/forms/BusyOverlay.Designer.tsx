import React from "react";
import { createPortal } from "react-dom";

export interface BusyOverlayProps {
    title: string;
    step: string;
    progress?: number;
    showProgress?: boolean;
    log?: string[];
}

export const buildBusyOverlay = (props: BusyOverlayProps) => {
    if (typeof document === "undefined") return null;

    const progress = typeof props.progress === "number"
        ? Math.min(100, Math.max(0, props.progress))
        : 100;
    const showProgress = props.showProgress !== false;
    const log = Array.isArray(props.log) ? props.log : [];

    return createPortal(
        <div className="designer-loading-overlay">
            <div className="window designer-loading-window" role="dialog" aria-modal="true">
                <div className="title-bar">
                    <div className="title-bar-text">{props.title}</div>
                </div>
                <div className="window-body designer-loading-body">
                    <div className="designer-loading-step">{props.step}</div>
                    {showProgress ? (
                        <div className="progressbar" style={{ width: "100%" }}>
                            <div
                                className="progressbar-fill progressbar-blocks"
                                style={{ width: `${progress}%` }}
                            >
                                <div className="progressbar-blocks-pattern"></div>
                            </div>
                        </div>
                    ) : null}
                    {log.length > 0 ? (
                        <div className="designer-loading-log">
                            {log.map((entry, index) => (
                                <div key={`${index}-${entry}`} className="designer-loading-log-entry">{entry}</div>
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>,
        document.body
    );
};
