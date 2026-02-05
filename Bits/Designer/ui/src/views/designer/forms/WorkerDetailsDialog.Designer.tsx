import { WF } from "../../../../../../libs/forms";
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

export const buildWorkerDetailsDialog = (props: WorkerDetailsDialogProps) => {
    return WF.Window(
        {
            Text: UiText.playground2.workerDetailsTitle,
            Dialog: true,
            Draggable: true,
            OnClose: "closeWorkerDetails",
            Style: "position: absolute; right: 24px; top: 180px; width: fit-content; max-width: 520px;"
        },
        WF.Element(
            "div",
            { className: "canvas-properties" },
            WF.Element(
                "div",
                { className: "canvas-properties-section" },
                WF.Element("div", { style: "font-weight: 600; margin-bottom: 6px;" }, props.workerDetails.label),
                WF.Field(
                    UiText.playground2.labels.type,
                    WF.Element("div", { className: "canvas-properties-readonly" }, props.workerDetails.type)
                ),
                WF.Field(
                    UiText.playground2.labels.source,
                    WF.Element("div", { className: "canvas-properties-readonly" }, props.workerDetails.sourceId)
                ),
                WF.Field(
                    UiText.playground2.labels.endpoint,
                    WF.Element("div", { className: "canvas-properties-readonly" }, props.workerDetails.endpointPath)
                ),
                WF.Field(
                    UiText.playground2.labels.field,
                    WF.Element("div", { className: "canvas-properties-readonly" }, props.workerDetails.fieldPath)
                ),
                WF.Field(
                    UiText.playground2.labels.trigger,
                    WF.Element("div", { className: "canvas-properties-readonly" }, props.workerDetails.trigger ?? "interval")
                ),
                WF.Field(
                    UiText.playground2.labels.interval,
                    WF.Element("div", { className: "canvas-properties-readonly" }, String(props.workerDetails.intervalMs ?? 5000))
                ),
                WF.Field(
                    UiText.playground2.labels.debounce,
                    WF.Element("div", { className: "canvas-properties-readonly" }, String(props.workerDetails.debounceMs ?? 300))
                )
            ),
            WF.Element(
                "div",
                { style: "display: flex; justify-content: flex-end; gap: 8px; padding: 8px 12px;" },
                WF.Element("button", { className: "canvas-properties-button", onClick: props.onStart }, UiText.playground2.buttons.start),
                WF.Element("button", { className: "canvas-properties-button", onClick: props.onStop }, UiText.playground2.buttons.stop),
                WF.Element("button", { className: "canvas-properties-button", onClick: props.onClose }, UiText.playground2.buttons.close)
            )
        )
    );
};
