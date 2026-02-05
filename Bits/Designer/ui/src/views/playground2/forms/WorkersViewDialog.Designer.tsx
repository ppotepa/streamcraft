import React from "react";
import { WF } from "../../../forms/winforms";
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

export const buildWorkersViewDialog = (props: WorkersViewDialogProps) => {
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

    return WF.Window(
        {
            Text: "Scheduler",
            Dialog: true,
            Draggable: true,
            close: false,
            Style: "position: absolute; right: 24px; top: 88px; width: 1060px; height: 420px;"
        },
        WF.Element("div", { className: "canvas-properties", style: "height: 100%; display: flex; flex-direction: column;" },
            // Header summary
            WF.Element("div", { style: "padding: 8px 12px; font-size: 12px; color: #5a5a5a; border-bottom: 1px solid #e0e0e0;" },
                `Active Workers: ${runningCount} running, ${stoppedCount} stopped`
            ),

            // Table header
            WF.Element("div", { style: "display: flex; background: #d6d6d6; border-bottom: 1px solid #9a9a9a; padding: 6px 8px; font-weight: 600; font-size: 12px;" },
                WF.Element("div", { style: "flex: 0 0 150px;" }, "Name"),
                WF.Element("div", { style: "flex: 0 0 70px;" }, "Enabled"),
                WF.Element("div", { style: "flex: 0 0 60px;" }, "Active"),
                WF.Element("div", { style: "flex: 0 0 70px;" }, "Status"),
                WF.Element("div", { style: "flex: 0 0 140px;" }, "Data Source"),
                WF.Element("div", { style: "flex: 0 0 80px; text-align: right;" }, "Interval"),
                WF.Element("div", { style: "flex: 0 0 100px;" }, "Last Run"),
                WF.Element("div", { style: "flex: 0 0 90px; text-align: right;" }, "Executions"),
                WF.Element("div", { style: "flex: 0 0 100px; text-align: right;" }, "Success Rate"),
                WF.Element("div", { style: "flex: 0 0 60px; text-align: center;" }, "Logs")
            ),

            // Table body
            WF.Element("div", { style: "flex: 1; overflow-y: auto; border-bottom: 1px solid #e0e0e0;" },
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

                        return WF.Element(
                            "div",
                            {
                                style: `display: flex; padding: 8px; border-bottom: 1px solid #e0e0e0; cursor: pointer; background: ${bgColor}; color: ${textColor};`,
                                onClick: () => props.onWorkerSelect(worker.id),
                                onDoubleClick: () => props.onWorkerDoubleClick(worker.id)
                            },
                            WF.Element("div", { style: `flex: 0 0 150px; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: ${textColor};` },
                                worker.label
                            ),
                            WF.Element("div", { style: "flex: 0 0 70px; display: flex; align-items: center; gap: 6px;" },
                                WF.Element("div", {
                                    style: `width: 10px; height: 10px; border-radius: 50%; background: ${isRunning ? "#28a745" : "#9a9a9a"
                                        };`
                                })
                            ),
                            WF.Element("div", { style: "flex: 0 0 60px; display: flex; align-items: center; gap: 6px;" },
                                WF.Element("div", {
                                    style: `width: 10px; height: 10px; border-radius: 50%; background: ${activityColor};`
                                })
                            ),
                            WF.Element("div", { style: `flex: 0 0 70px; font-size: 12px; color: ${textColor};` },
                                statusText
                            ),
                            WF.Element("div", { style: `flex: 0 0 140px; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: ${textColor};` },
                                worker.sourceId || "N/A"
                            ),
                            WF.Element("div", { style: `flex: 0 0 80px; font-size: 12px; text-align: right; color: ${textColor};` },
                                `${worker.intervalMs || 5000}ms`
                            ),
                            WF.Element("div", { style: `flex: 0 0 100px; font-size: 12px; color: ${textColor};` },
                                formatTimeAgo(worker.lastExecutionTime)
                            ),
                            WF.Element("div", { style: `flex: 0 0 90px; font-size: 12px; text-align: right; font-weight: 600; color: ${textColor};` },
                                String(worker.totalExecutions || 0)
                            ),
                            WF.Element("div", { style: `flex: 0 0 100px; font-size: 12px; text-align: right; font-weight: 600; color: ${textColor};` },
                                worker.totalExecutions && worker.totalExecutions > 0
                                    ? `${worker.successRate?.toFixed(1)}%`
                                    : "—"
                            ),
                            WF.Element("div", {
                                style: `flex: 0 0 60px; display: flex; align-items: center; justify-content: center;`
                            },
                                WF.Element("button", {
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
                    : [WF.Element("div", { style: "padding: 24px; text-align: center; color: #5a5a5a;" },
                        UiText.playground2.empty.noActiveWorkers)]
                )
            ),

            // Action buttons
            WF.Element("div", { style: "display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-top: 1px solid #e0e0e0; background: #ededed;" },
                WF.Element("div", { style: "font-size: 11px; color: #5a5a5a;" },
                    selectedWorker
                        ? `Selected: ${selectedWorker.label} → ${selectedWorker.fieldPath || "N/A"}`
                        : "No worker selected"
                ),
                WF.Element("div", { style: "display: flex; gap: 8px;" },
                    WF.Element("button", {
                        className: "canvas-properties-button",
                        disabled: !selectedWorker || selectedWorker.workerEnabled,
                        onClick: () => selectedWorker && props.onStart(selectedWorker.id)
                    }, UiText.playground2.buttons.start),
                    WF.Element("button", {
                        className: "canvas-properties-button",
                        disabled: !selectedWorker || !selectedWorker.workerEnabled,
                        onClick: () => selectedWorker && props.onStop(selectedWorker.id)
                    }, UiText.playground2.buttons.stop),
                    WF.Element("button", {
                        className: "canvas-properties-button",
                        disabled: !selectedWorker,
                        onClick: () => selectedWorker && props.onDetails(selectedWorker.id)
                    }, "Details..."),
                    WF.Element("button", {
                        className: "canvas-properties-button",
                        onClick: props.onClose
                    }, UiText.playground2.buttons.close)
                )
            )
        )
    );
};

