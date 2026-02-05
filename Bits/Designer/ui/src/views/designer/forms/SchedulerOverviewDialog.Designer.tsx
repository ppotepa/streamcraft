import React from "react";
import { WF } from "../../../../../../libs/forms";
import { UiText } from "../../uiText";

export interface SchedulerOverviewItem {
    id: string;
    label: string;
    bindingSummary: string;
    intervalLabel: string;
    lastRunLabel: string;
}

export interface SchedulerOverviewDialogProps {
    scheduleEpoch: number;
    items: SchedulerOverviewItem[];
}

export const buildSchedulerOverviewDialog = (props: SchedulerOverviewDialogProps) => {
    const COLORS = {
        text: "var(--sc-text)",
        textMuted: "var(--sc-text-muted)",
        surfaceStrong: "var(--sc-surface-strong)",
        border: "var(--sc-border-dark)",
        borderMuted: "var(--sc-border-muted)"
    };

    return WF.Window(
        {
            Text: "Scheduler Stats",
            Dialog: true,
            Draggable: true,
            OnClose: "closeSchedulerOverview",
            Style: "position: absolute; right: 24px; top: 88px; width: 840px; height: 360px;"
        },
        WF.Element(
            "div",
            { className: "canvas-properties", style: "height: 100%; display: flex; flex-direction: column;" },
            WF.Element(
                "div",
                { style: `padding: 8px 12px; font-size: 12px; color: ${COLORS.textMuted}; border-bottom: 1px solid ${COLORS.borderMuted};` },
                `Synced from ${new Date(props.scheduleEpoch).toLocaleTimeString()} · ${props.items.length} bound item(s)`
            ),
            WF.Element(
                "div",
                { style: `display: flex; background: ${COLORS.surfaceStrong}; border-bottom: 1px solid ${COLORS.border}; padding: 6px 8px; font-weight: 600; font-size: 12px; color: ${COLORS.text};` },
                WF.Element("div", { style: "flex: 0 0 180px;" }, "Item"),
                WF.Element("div", { style: "flex: 1 1 auto;" }, "Binding"),
                WF.Element("div", { style: "flex: 0 0 120px; text-align: right;" }, "Interval"),
                WF.Element("div", { style: "flex: 0 0 120px; text-align: right;" }, "Last Run")
            ),
            WF.Element(
                "div",
                { style: "flex: 1; overflow-y: auto;" },
                ...(props.items.length > 0
                    ? props.items.map((item) => (
                        WF.Element(
                            "div",
                            {
                                key: item.id,
                                style: `display: flex; padding: 6px 8px; border-bottom: 1px solid ${COLORS.borderMuted}; font-size: 12px; color: ${COLORS.text};`
                            },
                            WF.Element("div", { style: "flex: 0 0 180px;" }, item.label),
                            WF.Element("div", { style: `flex: 1 1 auto; color: ${COLORS.textMuted};` }, item.bindingSummary),
                            WF.Element("div", { style: "flex: 0 0 120px; text-align: right;" }, item.intervalLabel),
                            WF.Element("div", { style: "flex: 0 0 120px; text-align: right;" }, item.lastRunLabel)
                        )
                    ))
                    : [WF.Element("div", { className: "canvas-properties-empty" }, UiText.playground2.empty.noBinding)]
                )
            )
        )
    );
};
