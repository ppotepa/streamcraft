import React from "react";
import { element, node } from "../../../forms/core";
import { ControlKind } from "../../../forms/controlKinds";
import { UiText } from "../../uiText";

export interface WorkerDetailsDialogProps {
    workerDetails: {
        id: string;
        type: string;
        label: string;
        sourceId?: string;
        endpointPath?: string;
        fieldPath?: string;
        trigger?: string;
        intervalMs?: number;
        debounceMs?: number;
    };
    workerDetailsItem: {
        id: string;
        workerEnabled?: boolean;
    } | null;
    onStart: () => void;
    onStop: () => void;
    onClose: () => void;
}

export const createWorkerDetailsDialog = (props: WorkerDetailsDialogProps) => {
    return node(
        ControlKind.window,
        {
            title: UiText.playground2.workerDetailsTitle,
            dialog: true,
            draggable: true,
            onClose: "closeWorkerDetails",
            style: "position: absolute; right: 24px; top: 180px; width: fit-content; max-width: 520px;"
        },
        element("div", { className: "canvas-properties" },
            element("div", { className: "canvas-properties-section" },
                element("div", { style: "font-weight: 600; margin-bottom: 6px;" }, props.workerDetails.label),
                element("div", { className: "canvas-properties-row" },
                    element("label", null, UiText.playground2.labels.type),
                    element("div", { className: "canvas-properties-readonly" }, props.workerDetails.type)
                ),
                element("div", { className: "canvas-properties-row" },
                    element("label", null, UiText.playground2.labels.source),
                    element("div", { className: "canvas-properties-readonly" }, props.workerDetails.sourceId)
                ),
                element("div", { className: "canvas-properties-row" },
                    element("label", null, UiText.playground2.labels.endpoint),
                    element("div", { className: "canvas-properties-readonly" }, props.workerDetails.endpointPath)
                ),
                element("div", { className: "canvas-properties-row" },
                    element("label", null, UiText.playground2.labels.field),
                    element("div", { className: "canvas-properties-readonly" }, props.workerDetails.fieldPath)
                ),
                element("div", { className: "canvas-properties-row" },
                    element("label", null, UiText.playground2.labels.trigger),
                    element("div", { className: "canvas-properties-readonly" }, props.workerDetails.trigger ?? "interval")
                ),
                element("div", { className: "canvas-properties-row" },
                    element("label", null, UiText.playground2.labels.interval),
                    element("div", { className: "canvas-properties-readonly" }, String(props.workerDetails.intervalMs ?? 5000))
                ),
                element("div", { className: "canvas-properties-row" },
                    element("label", null, UiText.playground2.labels.debounce),
                    element("div", { className: "canvas-properties-readonly" }, String(props.workerDetails.debounceMs ?? 300))
                )
            ),
            element("div", { style: "display: flex; justify-content: flex-end; gap: 8px; padding: 8px 12px;" },
                element("button", {
                    className: "canvas-properties-button",
                    onClick: props.onStart
                }, UiText.playground2.buttons.start),
                element("button", {
                    className: "canvas-properties-button",
                    onClick: props.onStop
                }, UiText.playground2.buttons.stop),
                element("button", {
                    className: "canvas-properties-button",
                    onClick: props.onClose
                }, UiText.playground2.buttons.close)
            )
        )
    );
};
