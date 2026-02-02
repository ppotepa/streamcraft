import React from "react";
import { element, node } from "../../../forms/core";
import { ControlKind } from "../../../forms/controlKinds";
import { UiText } from "../../uiText";

interface WorkerInfo {
    id: string;
    type: string;
    label: string;
    sourceId?: string;
    endpointPath?: string;
    fieldPath?: string;
    intervalMs?: number;
    lastExecutionTime?: number;
    totalExecutions?: number;
    successRate?: number;
    workerEnabled?: boolean;
    isExecuting?: boolean;
    lastExecutionHadError?: boolean;
    status?: 'idle' | 'running' | 'queued';
    queuePosition?: number;
}

export interface WorkersViewDialogProps {
    activeWorkers: WorkerInfo[];
    selectedWorkerId: string | null;
    onWorkerSelect: (workerId: string) => void;
    onWorkerDoubleClick: (workerId: string) => void;
    onStart: (workerId: string) => void;
    onStop: (workerId: string) => void;
    onDetails: (workerId: string) => void;
    onViewLogs: (workerId: string) => void;
    onClose: () => void;
}

export const createWorkersViewDialog = (props: WorkersViewDialogProps) => {
    const selectedWorker = props.selectedWorkerId
        ? props.activeWorkers.find(w => w.id === props.selectedWorkerId)
        : null;

    const runningCount = props.activeWorkers.filter(w => w.workerEnabled).length;
    const stoppedCount = props.activeWorkers.filter(w => !w.workerEnabled).length;

    const formatTimeAgo = (timestamp: number | undefined) => {
        if (!timestamp) return "Never";
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ago`;
    };

    return node(
        ControlKind.window,
        {
            title: "Scheduler",
            dialog: true,
            draggable: true,
            close: false,
            style: "position: absolute; right: 24px; top: 88px; width: 1060px; height: 420px;"
        },
        element("div", { className: "canvas-properties", style: "height: 100%; display: flex; flex-direction: column;" },
            // Header summary
            element("div", { style: "padding: 8px 12px; font-size: 12px; color: #5a5a5a; border-bottom: 1px solid #e0e0e0;" },
                `Active Workers: ${runningCount} running, ${stoppedCount} stopped`
            ),

            // Table header
            element("div", { style: "display: flex; background: #d6d6d6; border-bottom: 1px solid #9a9a9a; padding: 6px 8px; font-weight: 600; font-size: 12px;" },
                element("div", { style: "flex: 0 0 150px;" }, "Name"),
                element("div", { style: "flex: 0 0 70px;" }, "Enabled"),
                element("div", { style: "flex: 0 0 60px;" }, "Active"),
                element("div", { style: "flex: 0 0 70px;" }, "Status"),
                element("div", { style: "flex: 0 0 140px;" }, "Data Source"),
                element("div", { style: "flex: 0 0 80px; text-align: right;" }, "Interval"),
                element("div", { style: "flex: 0 0 100px;" }, "Last Run"),
                element("div", { style: "flex: 0 0 90px; text-align: right;" }, "Executions"),
                element("div", { style: "flex: 0 0 100px; text-align: right;" }, "Success Rate"),
                element("div", { style: "flex: 0 0 60px; text-align: center;" }, "Logs")
            ),

            // Table body
            element("div", { style: "flex: 1; overflow-y: auto; border-bottom: 1px solid #e0e0e0;" },
                ...(props.activeWorkers.length > 0
                    ? props.activeWorkers.map((worker) => {
                        const isSelected = worker.id === props.selectedWorkerId;
                        const isRunning = worker.workerEnabled === true;
                        const isExecuting = worker.isExecuting === true;
                        const hasError = worker.lastExecutionHadError === true;
                        const status = worker.status || 'idle';
                        const textColor = isSelected ? "#fff" : (isRunning ? "#1b1b1b" : "#a0a0a0");
                        const bgColor = isSelected ? "#000080" : (isRunning ? "#f8f8f8" : "#e8e8e8");

                        // Activity indicator color logic:
                        // - Disabled: gray
                        // - Queued: orange
                        // - Error (last execution failed): red
                        // - Running: light green
                        // - Idle: dark green
                        let activityColor = "#9a9a9a"; // default: disabled
                        if (isRunning) {
                            if (status === 'queued') {
                                activityColor = "#ffa500"; // orange: queued
                            } else if (hasError && status === 'idle') {
                                activityColor = "#dc3545"; // red: error
                            } else if (status === 'running') {
                                activityColor = "#90ee90"; // light green: running
                            } else {
                                activityColor = "#1e7e34"; // dark green: idle
                            }
                        }

                        // Status text
                        let statusText = "Idle";
                        if (!isRunning) {
                            statusText = "Disabled";
                        } else if (status === 'running') {
                            statusText = "Running";
                        } else if (status === 'queued') {
                            statusText = worker.queuePosition ? `Queue #${worker.queuePosition}` : "Queued";
                        }

                        return element(
                            "div",
                            {
                                style: `display: flex; padding: 8px; border-bottom: 1px solid #e0e0e0; cursor: pointer; background: ${bgColor}; color: ${textColor};`,
                                onClick: () => props.onWorkerSelect(worker.id),
                                onDoubleClick: () => props.onWorkerDoubleClick(worker.id)
                            },
                            element("div", { style: `flex: 0 0 150px; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: ${textColor};` },
                                worker.label
                            ),
                            element("div", { style: "flex: 0 0 70px; display: flex; align-items: center; gap: 6px;" },
                                element("div", {
                                    style: `width: 10px; height: 10px; border-radius: 50%; background: ${isRunning ? "#28a745" : "#9a9a9a"
                                        };`
                                })
                            ),
                            element("div", { style: "flex: 0 0 60px; display: flex; align-items: center; gap: 6px;" },
                                element("div", {
                                    style: `width: 10px; height: 10px; border-radius: 50%; background: ${activityColor};`
                                })
                            ),
                            element("div", { style: `flex: 0 0 70px; font-size: 12px; color: ${textColor};` },
                                statusText
                            ),
                            element("div", { style: `flex: 0 0 140px; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: ${textColor};` },
                                worker.sourceId || "N/A"
                            ),
                            element("div", { style: `flex: 0 0 80px; font-size: 12px; text-align: right; color: ${textColor};` },
                                `${worker.intervalMs || 5000}ms`
                            ),
                            element("div", { style: `flex: 0 0 100px; font-size: 12px; color: ${textColor};` },
                                formatTimeAgo(worker.lastExecutionTime)
                            ),
                            element("div", { style: `flex: 0 0 90px; font-size: 12px; text-align: right; font-weight: 600; color: ${textColor};` },
                                String(worker.totalExecutions || 0)
                            ),
                            element("div", { style: `flex: 0 0 100px; font-size: 12px; text-align: right; font-weight: 600; color: ${textColor};` },
                                worker.totalExecutions && worker.totalExecutions > 0
                                    ? `${worker.successRate?.toFixed(1)}%`
                                    : "—"
                            ),
                            element("div", {
                                style: `flex: 0 0 60px; display: flex; align-items: center; justify-content: center;`
                            },
                                element("button", {
                                    type: "button",
                                    style: `font-size: 11px; color: ${hasError ? "#ffa500" : "#4fc1ff"}; background: transparent; border: none; padding: 0; text-decoration: underline; cursor: pointer;`,
                                    onClick: (e: MouseEvent) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        props.onViewLogs(worker.id);
                                    }
                                }, "View")
                            )
                        );
                    })
                    : [element("div", { style: "padding: 24px; text-align: center; color: #5a5a5a;" },
                        UiText.playground2.empty.noActiveWorkers)]
                )
            ),

            // Action buttons
            element("div", { style: "display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-top: 1px solid #e0e0e0; background: #ededed;" },
                element("div", { style: "font-size: 11px; color: #5a5a5a;" },
                    selectedWorker
                        ? `Selected: ${selectedWorker.label} → ${selectedWorker.fieldPath || "N/A"}`
                        : "No worker selected"
                ),
                element("div", { style: "display: flex; gap: 8px;" },
                    element("button", {
                        className: "canvas-properties-button",
                        disabled: !selectedWorker || selectedWorker.workerEnabled,
                        onClick: () => selectedWorker && props.onStart(selectedWorker.id)
                    }, UiText.playground2.buttons.start),
                    element("button", {
                        className: "canvas-properties-button",
                        disabled: !selectedWorker || !selectedWorker.workerEnabled,
                        onClick: () => selectedWorker && props.onStop(selectedWorker.id)
                    }, UiText.playground2.buttons.stop),
                    element("button", {
                        className: "canvas-properties-button",
                        disabled: !selectedWorker,
                        onClick: () => selectedWorker && props.onDetails(selectedWorker.id)
                    }, "Details..."),
                    element("button", {
                        className: "canvas-properties-button",
                        onClick: props.onClose
                    }, UiText.playground2.buttons.close)
                )
            )
        )
    );
};
