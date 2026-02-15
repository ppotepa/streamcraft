import React from "react";
import { WF } from "@streamcraft/forms";
import type { CanvasItem } from "../../domain/types";
import type { ContextRenderCtx } from "../adapterTypes";
import { buildRuntimePatchForMode } from "../../runtime/runtimePolicy";

type DataTabProps = {
    item: CanvasItem;
    ctx: ContextRenderCtx;
};

const isBindableItem = (item: CanvasItem) =>
    item.type === "text" || item.type === "image" || item.type === "progress" || item.type === "chat";

const isChatCandidate = (source: { id: string; kind?: string; categoryId?: string }) =>
    source.id === "system-chat" || source.kind?.startsWith("chat") || source.categoryId?.startsWith("chat");

export const renderDataTab = ({ item, ctx }: DataTabProps) => {
    if (!isBindableItem(item)) {
        return WF.Element("div", { className: "context-window-note" }, "This component does not support data binding.");
    }

    const sourceOptions = item.type === "chat"
        ? ctx.dataSources.sources.filter(isChatCandidate)
        : ctx.dataSources.sources;
    const selectedSource = item.sourceId
        ? (ctx.dataSources.sources.find((entry) => entry.id === item.sourceId) ?? null)
        : null;
    const systemSource = ctx.dataSources.isSystemSource(selectedSource);
    const endpoints = selectedSource?.endpoints ?? [];
    const runtimeMode = item.runtimeIntervalMode === "custom" ? "custom" : "global";
    const runtimePatch = buildRuntimePatchForMode(runtimeMode, ctx.dataSources.defaultRuntimeIntervalMs, item.runtimeCustomIntervalMs);

    return WF.Element("div", { className: "context-window-section" },
        WF.Field(
            "Source",
            WF.Element("select", {
                className: "combobox context-window-input",
                value: item.sourceId ?? "",
                onChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
                    const sourceId = event.target.value || undefined;
                    if (!sourceId) {
                        ctx.updateItem(item.id, {
                            sourceId: undefined,
                            endpointPath: undefined,
                            fieldPath: undefined,
                            workerEnabled: false,
                            scheduleIntervalMs: 0
                        });
                        return;
                    }

                    ctx.updateItem(item.id, {
                        ...runtimePatch,
                        sourceId,
                        endpointPath: undefined,
                        fieldPath: undefined,
                        workerEnabled: true
                    });
                }
            },
            WF.Element("option", { value: "" }, "-- select --"),
            ...sourceOptions.map((source) => WF.Element("option", { key: `context-source-${source.id}`, value: source.id }, source.name)))
        ),
        !systemSource && item.type !== "chat"
            ? WF.Field(
                "Endpoint",
                WF.Element("select", {
                    className: "combobox context-window-input",
                    value: item.endpointPath ?? "",
                    onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
                        ctx.updateItem(item.id, {
                            ...runtimePatch,
                            endpointPath: event.target.value || undefined,
                            fieldPath: undefined,
                            workerEnabled: true
                        })
                },
                WF.Element("option", { value: "" }, "-- select --"),
                ...endpoints.map((endpoint) =>
                    WF.Element("option", { key: `context-endpoint-${endpoint.path}`, value: endpoint.path }, `${endpoint.method} ${endpoint.path}`)
                ))
            )
            : null,
        WF.Field(
            "Field path",
            WF.Element("input", {
                className: "textbox context-window-input",
                type: "text",
                value: item.fieldPath ?? "",
                placeholder: item.type === "chat" ? "response.messages" : "response.data.field",
                onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                    ctx.updateItem(item.id, {
                        ...runtimePatch,
                        fieldPath: event.target.value || undefined,
                        workerEnabled: true
                    })
            })
        ),
        WF.Field(
            "Validation",
            item.sourceId
                ? WF.Element("div", { className: "canvas-properties-readonly" }, "Source selected.")
                : WF.Element("div", { className: "context-window-note" }, "sourceId is required for bindable components.")
        ),
        !systemSource && item.type !== "chat"
            ? WF.Row(
                { Style: "justify-content: flex-end;" },
                WF.Element("button", {
                    className: "button",
                        disabled: !item.sourceId || !item.endpointPath,
                        onClick: () => {
                            if (!item.sourceId || !item.endpointPath) return;
                            ctx.dataSources.runTest(item.sourceId, item.endpointPath);
                        }
                    }, "Test Source")
            )
            : null
    );
};
