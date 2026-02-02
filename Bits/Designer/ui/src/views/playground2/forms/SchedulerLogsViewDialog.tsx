import React from "react";
import { element, node } from "../../../forms/core";
import { ControlKind } from "../../../forms/controlKinds";
import { ExecutionLog } from "../../workerRegistry";

// Unified Color Palette
const COLORS = {
    // Status colors
    success: '#4ec9b0',
    failed: '#f48771',
    running: '#4fc1ff',
    neutral: '#cccccc',

    // UI colors
    primary: '#007acc',
    background: '#ededed',
    surface: '#ffffff',
    border: '#9a9a9a',
    headerBg: '#d6d6d6',

    // Text colors
    text: '#1b1b1b',
    textMuted: '#5a5a5a',
    textLight: '#999',

    // Semantic colors
    info: '#e8f4f8',
    successBg: '#f0f8e8',
    errorBg: '#fff5f5',

    // Code syntax colors
    string: '#a31515',
    number: '#098658',
    boolean: '#0000ff',
    keyword: '#001080',
    gray: '#666'
};

interface SchedulerLogsViewDialogProps {
    workerId: string;
    workerLabel: string;
    logs: ExecutionLog[];
    selectedLogId?: string;
    expandedPaths?: Set<string>;
    onSelectLog: (logId: string) => void;
    onToggleExpand: (path: string) => void;
    onClose: () => void;
    onClearLogs: (workerId: string) => void;
    onExportLogs: (workerId: string) => void;
}

export const createSchedulerLogsViewDialog = (props: SchedulerLogsViewDialogProps) => {
    const formatTimestamp = (timestamp: number) => {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    const formatDuration = (ms: number) => {
        if (ms < 1000) return `${ms} ms`;
        return `${(ms / 1000).toFixed(2)} s`;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success': return COLORS.success;
            case 'failed': return COLORS.failed;
            case 'running': return COLORS.running;
            default: return COLORS.neutral;
        }
    };

    const successCount = props.logs.filter(log => log.status === 'success').length;
    const failedCount = props.logs.filter(log => log.status === 'failed').length;
    const runningCount = props.logs.filter(log => log.status === 'running').length;
    const avgDuration = props.logs.length > 0
        ? Math.round(props.logs.reduce((sum, log) => sum + log.duration, 0) / props.logs.length)
        : 0;
    const successRate = props.logs.length > 0
        ? ((successCount / props.logs.length) * 100).toFixed(1)
        : '0.0';
    const selectedLog = props.selectedLogId
        ? props.logs.find(log => log.id === props.selectedLogId)
        : props.logs[0];

    // Extract hostname from URL
    const getHostname = (url: string | undefined) => {
        if (!url) return 'N/A';
        try {
            // If it's a relative URL, return localhost
            if (url.startsWith('/')) return 'localhost (relative path)';
            const urlObj = new URL(url);
            return urlObj.hostname || 'N/A';
        } catch {
            return url;
        }
    };

    // Format JSON/object data in a hierarchical graph-like view with expand/collapse
    const renderTreeNode = (data: any, path: string = '', indent: number = 0): any => {
        if (data === null || data === undefined) {
            return element("div", { style: `margin-left: ${indent * 16}px; color: #999;` }, "null");
        }

        const expandedPaths = props.expandedPaths || new Set();
        const isExpanded = expandedPaths.has(path);

        if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
            const valueColor = typeof data === 'string' ? COLORS.string : typeof data === 'number' ? COLORS.number : COLORS.boolean;
            return element("span", { style: `color: ${valueColor};` },
                typeof data === 'string' ? `"${data}"` : String(data)
            );
        }

        if (Array.isArray(data)) {
            const icon = isExpanded ? '▼' : '▶';
            return element("div", { style: `margin-left: ${indent * 16}px;` },
                element("div", {
                    style: "cursor: pointer; user-select: none; color: #1b1b1b; font-weight: 600;",
                    onClick: () => props.onToggleExpand(path)
                },
                    element("span", { style: "color: #666; margin-right: 6px;" }, icon),
                    element("span", { style: "color: #0000ff;" }, `Array[${data.length}]`)
                ),
                isExpanded ? element("div", {},
                    ...data.map((item, i) =>
                        element("div", { key: i, style: "margin-left: 16px; margin-top: 4px;" },
                            element("span", { style: "color: #666; margin-right: 6px;" }, `[${i}]`),
                            renderTreeNode(item, `${path}.${i}`, 0)
                        )
                    )
                ) : element("div", {})
            );
        }

        if (typeof data === 'object') {
            const keys = Object.keys(data);
            const icon = isExpanded ? '▼' : '▶';

            return element("div", { style: `margin-left: ${indent * 16}px;` },
                element("div", {
                    style: "cursor: pointer; user-select: none; color: #1b1b1b; font-weight: 600;",
                    onClick: () => props.onToggleExpand(path)
                },
                    element("span", { style: "color: #666; margin-right: 6px;" }, icon),
                    element("span", { style: "color: #a31515;" }, `{${keys.length} properties}`)
                ),
                isExpanded ? element("div", {},
                    ...keys.map(key =>
                        element("div", { key: key, style: "margin-left: 16px; margin-top: 4px;" },
                            element("span", { style: "color: #001080; font-weight: 600; margin-right: 6px;" }, `${key}:`),
                            renderTreeNode(data[key], `${path}.${key}`, 0)
                        )
                    )
                ) : element("div", {})
            );
        }

        return element("span", {}, String(data));
    };

    return node(
        ControlKind.window,
        {
            title: `Scheduler Logs: ${props.workerLabel}`,
            dialog: true,
            draggable: true,
            close: false,
            style: "position: absolute; right: 24px; top: 88px; width: min(1200px, 85vw); height: min(650px, 80vh); resize: both; overflow: hidden; min-width: 800px; min-height: 400px;"
        },
        element("div", { className: "canvas-properties", style: `height: 100%; display: flex; flex-direction: column; overflow: hidden; background: ${COLORS.background}; color: ${COLORS.text};` },
            element("div", { style: `padding: 8px 12px; font-size: 12px; color: ${COLORS.textMuted}; background: ${COLORS.headerBg}; border-bottom: 1px solid ${COLORS.border}; display: flex; gap: 24px; flex-shrink: 0;` },
                element("span", {}, `Total: ${props.logs.length}`),
                element("span", { style: `color: ${COLORS.success};` }, `Success: ${successCount}`),
                element("span", { style: `color: ${COLORS.failed};` }, `Failed: ${failedCount}`),
                element("span", { style: `color: ${COLORS.running};` }, `Running: ${runningCount}`),
                element("span", {}, `Avg Duration: ${avgDuration}ms`),
                element("span", {}, `Success Rate: ${successRate}%`)
            ),
            element("div", { style: `display: flex; flex: 1; min-height: 0; gap: 12px; padding: 10px; background: ${COLORS.background};` },
                element("div", { style: `flex: 1 1 55%; display: flex; flex-direction: column; min-width: 320px; border: 1px solid ${COLORS.border}; background: ${COLORS.surface};` },
                    element("div", { style: `display: flex; background: ${COLORS.headerBg}; border-bottom: 1px solid ${COLORS.border}; padding: 6px 8px; font-weight: 600; font-size: 12px; flex-shrink: 0;` },
                        element("div", { style: "flex: 0 0 170px;" }, "Timestamp"),
                        element("div", { style: "flex: 0 0 90px;" }, "Status"),
                        element("div", { style: "flex: 0 0 90px; text-align: right;" }, "Duration"),
                        element("div", { style: "flex: 1;" }, "Message")
                    ),
                    element("div", {
                        id: "schedulerLogsView",
                        style: "flex: 1; overflow-y: auto; overflow-x: hidden; min-height: 0; position: relative;"
                    },
                        ...(props.logs.length > 0
                            ? props.logs.slice(0, 200).map((log, index) => {
                                const isSelected = selectedLog?.id === log.id;
                                const bgColor = isSelected ? COLORS.primary : index % 2 === 0 ? "#f8f8f8" : COLORS.surface;
                                return element(
                                    "div",
                                    {
                                        key: log.id,
                                        style: `display: flex; padding: 8px; border-bottom: 1px solid #e0e0e0; background: ${bgColor}; cursor: pointer; transition: background 0.15s ease;`,
                                        onClick: () => props.onSelectLog(log.id)
                                    },
                                    element("div", { style: `flex: 0 0 170px; font-size: 12px; color: ${isSelected ? "#ffffff" : COLORS.text};` },
                                        formatTimestamp(log.timestamp)
                                    ),
                                    element("div", { style: `flex: 0 0 90px; font-size: 12px; font-weight: 600; color: ${getStatusColor(log.status)};` },
                                        log.status.toUpperCase()
                                    ),
                                    element("div", { style: `flex: 0 0 90px; font-size: 12px; text-align: right; color: ${isSelected ? "#ffffff" : COLORS.text};` },
                                        formatDuration(log.duration)
                                    ),
                                    element("div", { style: `flex: 1; font-size: 12px; color: ${isSelected ? "#ffffff" : COLORS.text}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` },
                                        log.message
                                    )
                                );
                            })
                            : [element("div", { style: `padding: 24px; text-align: center; color: ${COLORS.textMuted};` },
                                "No logs available")]
                        )
                    )
                ),
                element("div", { style: `flex: 1 1 45%; display: flex; flex-direction: column; min-width: 280px; border: 1px solid ${COLORS.border}; background: ${COLORS.surface};` },
                    element("div", { style: `background: ${COLORS.headerBg}; border-bottom: 1px solid ${COLORS.border}; padding: 6px 8px; font-weight: 600; font-size: 12px; flex-shrink: 0;` },
                        `Log Details${selectedLog ? ` - ${selectedLog.status.toUpperCase()}` : ""}`
                    ),
                    element("div", { style: `flex: 1; overflow-y: auto; padding: 10px 12px; font-size: 12px; color: ${COLORS.text}; min-height: 0;` },
                        !selectedLog
                            ? element("div", { style: `color: ${COLORS.textMuted}; text-align: center; padding-top: 40px;` }, "Select a log entry to see details.")
                            : element("div", {},
                                // Server Info Section
                                element("div", { style: `font-weight: 600; color: ${COLORS.text}; margin-bottom: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; background: ${COLORS.info}; padding: 6px 8px; margin: -10px -12px 12px -12px;` }, "Server Info"),
                                element("div", { style: "margin-bottom: 4px;" }, `Timestamp: ${formatTimestamp(selectedLog.timestamp)}`),
                                element("div", { style: "margin-bottom: 4px;" }, `Status: ${selectedLog.status.toUpperCase()}`),
                                element("div", { style: "margin-bottom: 4px;" }, `Duration: ${formatDuration(selectedLog.duration)}`),
                                element("div", { style: "margin-bottom: 4px; word-break: break-all;" }, `Endpoint: ${selectedLog.request?.url || 'N/A'}`),
                                element("div", { style: "margin-bottom: 4px;" }, `Host: ${getHostname(selectedLog.request?.url)}`),
                                element("div", { style: "margin-bottom: 16px;" }, `Method: ${selectedLog.request?.method || 'N/A'}`),

                                // Response Section (Prominent)
                                element("div", { style: `font-weight: 600; color: ${COLORS.text}; margin-bottom: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; background: ${COLORS.successBg}; padding: 6px 8px; margin-left: -12px; margin-right: -12px;` }, "Response"),
                                element("div", { style: `margin-bottom: 8px; padding: 8px; background: #f8f8f8; border-left: 3px solid ${COLORS.success}; margin-left: -4px;` },
                                    `HTTP ${selectedLog.response?.statusCode || '—'} ${selectedLog.response?.statusText || ''}`
                                ),
                                selectedLog.response?.error
                                    ? element("div", { style: `margin-bottom: 12px; padding: 8px; background: ${COLORS.errorBg}; border-left: 3px solid ${COLORS.failed}; color: ${COLORS.failed}; font-weight: 600;` }, `Error: ${selectedLog.response.error}`)
                                    : element("div", {}),
                                element("div", { style: "margin-bottom: 6px; font-weight: 600; color: #2c5f2d; font-size: 11px; display: flex; align-items: center; gap: 6px;" },
                                    element("span", { style: `display: inline-block; width: 8px; height: 8px; background: ${COLORS.success}; border-radius: 2px;` }),
                                    "Response Body"
                                ),
                                element("div", {
                                    style: `background: linear-gradient(to right, #f8f8f8 0%, ${COLORS.surface} 20px); padding: 12px; padding-left: 20px; border-radius: 6px; font-family: 'Courier New', Consolas, monospace; font-size: 11px; line-height: 1.8; margin: 0 0 12px 0; overflow-x: auto; border: 1px solid #d0d0d0; border-left: 4px solid ${COLORS.success}; box-shadow: inset 0 0 8px rgba(0,0,0,0.03); max-height: 400px; overflow-y: auto;`
                                },
                                    selectedLog.response?.body
                                        ? renderTreeNode(
                                            typeof selectedLog.response.body === 'string'
                                                ? JSON.parse(selectedLog.response.body)
                                                : selectedLog.response.body,
                                            'root'
                                        )
                                        : element("div", { style: `color: ${COLORS.textLight}; font-style: italic;` }, "∅ empty response")
                                ),

                                // Request Details Section
                                element("div", { style: `font-weight: 600; color: ${COLORS.text}; margin-bottom: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; background: #f8f8f8; padding: 6px 8px; margin-left: -12px; margin-right: -12px;` }, "Request Details"),
                                selectedLog.request?.body
                                    ? element("div", {},
                                        element("div", { style: `margin-bottom: 6px; font-weight: 600; color: ${COLORS.textMuted}; font-size: 11px; display: flex; align-items: center; gap: 6px;` },
                                            element("span", { style: "display: inline-block; width: 8px; height: 8px; background: #6c757d; border-radius: 2px;" }),
                                            "Request Body"
                                        ),
                                        element("div", {
                                            style: `background: linear-gradient(to right, #f8f8f8 0%, ${COLORS.surface} 20px); padding: 12px; padding-left: 20px; border-radius: 6px; font-family: 'Courier New', Consolas, monospace; font-size: 11px; line-height: 1.8; margin: 0; overflow-x: auto; border: 1px solid #d0d0d0; border-left: 4px solid #6c757d; box-shadow: inset 0 0 8px rgba(0,0,0,0.03); max-height: 300px; overflow-y: auto;`
                                        },
                                            renderTreeNode(
                                                typeof selectedLog.request.body === 'string'
                                                    ? JSON.parse(selectedLog.request.body)
                                                    : selectedLog.request.body,
                                                'request'
                                            )
                                        )
                                    )
                                    : element("div", { style: `margin-bottom: 4px; color: ${COLORS.textLight}; font-style: italic;` }, "∅ no request body")
                            )
                    )
                )
            ),
            element("div", { style: `display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-top: 1px solid ${COLORS.border}; background: ${COLORS.background}; flex-shrink: 0;` },
                element("div", { style: `font-size: 11px; color: ${COLORS.textMuted};` },
                    `Showing ${Math.min(200, props.logs.length)} of ${props.logs.length} entries`
                ),
                element("div", { style: "display: flex; gap: 8px;" },
                    element("button", {
                        className: "canvas-properties-button",
                        onClick: () => props.onExportLogs(props.workerId)
                    }, "Export"),
                    element("button", {
                        className: "canvas-properties-button",
                        onClick: () => {
                            if (confirm(`Clear all logs for ${props.workerLabel}?`)) {
                                props.onClearLogs(props.workerId);
                            }
                        }
                    }, "Clear"),
                    element("button", {
                        className: "canvas-properties-button",
                        onClick: props.onClose
                    }, "Close")
                )
            )
        )
    );
};

