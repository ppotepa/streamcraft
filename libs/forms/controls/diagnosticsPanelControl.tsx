import React, { useEffect, useState } from "react";
import type { ControlRenderer } from "./types";
import { clearDiagnostics, getDiagnostics, subscribeDiagnostics, type DiagnosticEntry } from "../core/diagnostics";

export const renderDiagnosticsPanel: ControlRenderer = ({ props }, { resolveStyle }) => {
    const title = (props?.title as string | undefined) ?? "Diagnostics";
    const maxItems = (props?.maxItems as number | undefined) ?? 10;
    const showClear = (props?.showClear as boolean | undefined) ?? true;
    const style = resolveStyle?.(props) ?? {};

    const [entries, setEntries] = useState<DiagnosticEntry[]>(getDiagnostics());

    useEffect(() => {
        return subscribeDiagnostics((next) => setEntries(next));
    }, []);

    const visible = entries.slice(-maxItems).reverse();

    return (
        <div className="diagnostics-panel" style={style}>
            <div className="diagnostics-header">
                <span className="diagnostics-title">{title}</span>
                {showClear ? (
                    <button className="button diagnostics-clear" onClick={clearDiagnostics}>
                        Clear
                    </button>
                ) : null}
            </div>
            <div className="diagnostics-body">
                {visible.length === 0 ? (
                    <div className="diagnostics-empty">No diagnostics</div>
                ) : (
                    visible.map((entry, index) => (
                        <div key={`${entry.timestamp}-${index}`} className={`diagnostics-item diagnostics-${entry.level}`}>
                            <div className="diagnostics-message">{entry.message}</div>
                            <div className="diagnostics-meta">
                                <span>{entry.level.toUpperCase()}</span>
                                <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
