import React from "react";
import { WF } from "../../../../../../libs/forms";
import { UiText } from "../../uiText";

export interface ScheduleSetupDialogProps {
    targetLabel: string;
    bindingSummary: string;
    intervalMs: number;
    onUpdateInterval: (value: number) => void;
}

export const buildScheduleSetupDialog = (props: ScheduleSetupDialogProps) => {
    return WF.Window(
        {
            Text: "Scheduling",
            Dialog: true,
            Draggable: true,
            OnClose: "closeScheduleSetup",
            Style: "position: absolute; right: 320px; top: 200px; width: fit-content; max-width: 420px;"
        },
        WF.Element(
            "div",
            { className: "canvas-properties" },
            WF.Element(
                "div",
                { className: "canvas-properties-section" },
                WF.Field(
                    "Target",
                    WF.Element("div", { className: "canvas-properties-readonly" }, props.targetLabel)
                ),
                WF.Field(
                    "Binding",
                    WF.Element("div", { className: "canvas-properties-readonly" }, props.bindingSummary)
                ),
                WF.Field(
                    "Interval (ms)",
                    WF.Number({
                        Value: props.intervalMs,
                        Min: 0,
                        OnChange: (event) => props.onUpdateInterval(Math.max(0, Number(event.target.value) || 0))
                    })
                )
            ),
            WF.Element(
                "div",
                { className: "canvas-properties-section" },
                WF.Field(
                    "Presets",
                    WF.Element(
                        "div",
                        { className: "canvas-properties-actions" },
                        WF.Element("button", { className: "canvas-properties-button", onClick: () => props.onUpdateInterval(1000) }, "1s"),
                        WF.Element("button", { className: "canvas-properties-button", onClick: () => props.onUpdateInterval(2000) }, "2s"),
                        WF.Element("button", { className: "canvas-properties-button", onClick: () => props.onUpdateInterval(5000) }, "5s"),
                        WF.Element("button", { className: "canvas-properties-button", onClick: () => props.onUpdateInterval(10000) }, "10s"),
                        WF.Element("button", { className: "canvas-properties-button", onClick: () => props.onUpdateInterval(30000) }, "30s")
                    )
                )
            ),
            WF.Element(
                "div",
                { style: "display: flex; justify-content: flex-end; gap: 8px; padding: 8px 12px;" },
                WF.Element("button", { className: "canvas-properties-button", onClick: () => props.onUpdateInterval(0) }, "Disable"),
                WF.Element("button", { className: "canvas-properties-button", onClick: "closeScheduleSetup" }, UiText.playground2.buttons.close)
            )
        )
    );
};
