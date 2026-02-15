import React from "react";
import { WF } from "@streamcraft/forms";
import type { CanvasItem } from "../../domain/types";
import type { ContextRenderCtx } from "../adapterTypes";
import { buildRuntimePatchForMode, clampRuntimeIntervalMs } from "../../runtime/runtimePolicy";

type RuntimeTabProps = {
    item: CanvasItem;
    ctx: ContextRenderCtx;
};

export const renderRuntimeTab = ({ item, ctx }: RuntimeTabProps) => {
    const runtimeMode = item.runtimeIntervalMode === "custom" ? "custom" : "global";
    const defaultRuntimeIntervalMs = ctx.dataSources.defaultRuntimeIntervalMs;
    const runtimeCustomIntervalMs = clampRuntimeIntervalMs(
        item.runtimeCustomIntervalMs ?? defaultRuntimeIntervalMs,
        defaultRuntimeIntervalMs
    );
    const effective = runtimeMode === "custom" ? runtimeCustomIntervalMs : clampRuntimeIntervalMs(defaultRuntimeIntervalMs);

    return WF.Element("div", { className: "context-window-section" },
        WF.Field(
            "Mode",
            WF.Element("label", { className: "checkbox-label" },
                WF.Element("input", {
                    className: "checkbox",
                    type: "checkbox",
                    checked: runtimeMode !== "custom",
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                        ctx.updateItem(item.id, {
                            workerEnabled: true,
                            ...buildRuntimePatchForMode(
                                event.target.checked ? "global" : "custom",
                                defaultRuntimeIntervalMs,
                                runtimeCustomIntervalMs
                            )
                        })
                }),
                WF.Element("span", { className: "checkbox-text" }, runtimeMode === "custom" ? "Custom interval" : "Use global interval")
            )
        ),
        WF.Field(
            "Global interval",
            WF.Element("div", { className: "canvas-properties-readonly" }, `${clampRuntimeIntervalMs(defaultRuntimeIntervalMs)} ms`)
        ),
        WF.Field(
            "Custom interval (ms)",
            WF.Element("input", {
                className: "textbox context-window-input",
                type: "number",
                min: 250,
                max: 60000,
                step: 50,
                disabled: runtimeMode !== "custom",
                value: runtimeCustomIntervalMs,
                onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                    ctx.updateItem(item.id, {
                        workerEnabled: true,
                        ...buildRuntimePatchForMode(
                            "custom",
                            defaultRuntimeIntervalMs,
                            clampRuntimeIntervalMs(Number(event.target.value), runtimeCustomIntervalMs)
                        )
                    })
            })
        ),
        WF.Field(
            "Effective interval",
            WF.Element("div", { className: "canvas-properties-readonly" }, `${effective} ms`)
        ),
        WF.Field(
            "Validation",
            runtimeMode === "custom" && runtimeCustomIntervalMs < 250
                ? WF.Element("div", { className: "context-window-note" }, "Custom interval must be >= 250 ms.")
                : WF.Element("div", { className: "canvas-properties-readonly" }, "Runtime configuration valid.")
        )
    );
};
