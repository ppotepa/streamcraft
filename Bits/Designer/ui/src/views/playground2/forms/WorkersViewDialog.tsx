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
}

export interface WorkersViewDialogProps {
    activeWorkers: WorkerInfo[];
    selectedWorkerId: string | null;
    onWorkerSelect: (workerId: string) => void;
    onWorkerDoubleClick: (workerId: string) => void;
    onStart: (workerId: string) => void;
    onStop: (workerId: string) => void;
    onDetails: (workerId: string) => void;
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
            title: UiText.playground2.workersViewTitle,
            dialog: true,
            draggable: true,
            close: false,
            style: "position: absolute; right: 24px; top: 88px; width: 860px; height: 480px;"
        },
        element("div", { className: "canvas-properties", style: "height: 100%; display: flex; flex-direction: column;" },
            // Header summary
            element("div", { style: "padding: 8px 12px; font-size: 12px; color: #5a5a5a;" },
                `Running Workers (${runningCount} active, ${stoppedCount} stopped, 0 errors)`
            ),
            
            // Table header
            element("div", { style: "display: flex; background: #d6d6d6; border: 1px solid #9a9a9a; padding: 6px 8px; font-weight: 600; font-size: 12px;" },
                element("div", { style: "flex: 0 0 200px;" }, "Name"),
                element("div", { style: "flex: 0 0 100px;" }, "Status"),
                element("div", { style: "flex: 0 0 180px;" }, "Data Source"),
                element("div", { style: "flex: 0 0 100px;" }, "Interval"),
                element("div", { style: "flex: 1;" }, "Last Run")
            ),
            
            // Table body
            element("div", { style: "flex: 1; overflow-y: auto; border: 1px solid #e0e0e0; border-top: none;" },
                ...(props.activeWorkers.length > 0
                    ? props.activeWorkers.map((worker) => {
                        const isSelected = worker.id === props.selectedWorkerId;
                        return element(
                            "div",
                            {
                                style: `display: flex; padding: 8px; border-bottom: 1px solid #e0e0e0; cursor: pointer; ${
                                    isSelected ? "background: #000080; color: #fff;" : "background: #f8f8f8;"
                                }`,
                                onClick: () => props.onWorkerSelect(worker.id),
                                onDoubleClick: () => props.onWorkerDoubleClick(worker.id)
                            },
                            element("div", { style: "flex: 0 0 200px; font-size: 12px;" }, worker.label),
                            element("div", { style: "flex: 0 0 100px; display: flex; align-items: center; gap: 6px; font-size: 12px;" },
                                element("div", { 
                                    style: `width: 10px; height: 10px; border-radius: 50%; background: ${
                                        worker.workerEnabled ? "#28a745" : "#6c757d"
                                    };` 
                                }),
                                worker.workerEnabled ? "Running" : "Stopped"
                            ),
                            element("div", { style: "flex: 0 0 180px; font-size: 12px;" }, worker.sourceId || "N/A"),
                            element("div", { style: "flex: 0 0 100px; font-size: 12px;" }, `${worker.intervalMs || 5000} ms`),
                            element("div", { style: "flex: 1; font-size: 12px;" }, formatTimeAgo(worker.lastExecutionTime))
                        );
                    })
                    : [element("div", { style: "padding: 24px; text-align: center; color: #5a5a5a;" }, 
                        UiText.playground2.empty.noActiveWorkers)]
                )
            ),
            
            // Separator
            element("div", { style: "height: 1px; background: #9a9a9a; margin: 8px 0;" }),
            
            // Selected worker details
            element("div", { style: "padding: 8px 12px;" },
                element("div", { style: "font-size: 12px; color: #5a5a5a; margin-bottom: 8px;" }, "Selected Worker Details"),
                selectedWorker
                    ? element("div", { style: "display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;" },
                        element("div", { style: "display: flex; gap: 8px;" },
                            element("span", { style: "color: #5a5a5a;" }, "Field Path:"),
                            element("span", null, selectedWorker.fieldPath || "N/A")
                        ),
                        element("div", { style: "display: flex; gap: 8px;" },
                            element("span", { style: "color: #5a5a5a;" }, "Success Rate:"),
                            element("span", null, `${selectedWorker.successRate?.toFixed(1) || "0.0"}%`)
                        ),
                        element("div", { style: "display: flex; gap: 8px;" },
                            element("span", { style: "color: #5a5a5a;" }, "Total Executions:"),
                            element("span", null, String(selectedWorker.totalExecutions || 0))
                        ),
                        element("div", { style: "display: flex; gap: 8px;" },
                            element("span", { style: "color: #5a5a5a;" }, "Next Run:"),
                            element("span", null, selectedWorker.workerEnabled ? `in ${selectedWorker.intervalMs || 5000} ms` : "N/A")
                        )
                    )
                    : element("div", { style: "color: #5a5a5a; font-size: 12px;" }, "No worker selected")
            ),
            
            // Action buttons
            element("div", { style: "display: flex; justify-content: flex-end; gap: 8px; padding: 8px 12px; border-top: 1px solid #e0e0e0;" },
                element("button", { 
                    className: "canvas-properties-button",
                    disabled: !selectedWorker,
                    onClick: () => selectedWorker && props.onStart(selectedWorker.id)
                }, UiText.playground2.buttons.start),
                element("button", { 
                    className: "canvas-properties-button",
                    disabled: !selectedWorker,
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
    );
};
