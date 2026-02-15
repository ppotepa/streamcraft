import React from "react";
import { WF } from "@streamcraft/forms";
import type { CanvasItem } from "../../domain/types";
import type { ContextRenderCtx } from "../adapterTypes";

type GeneralTabProps = {
    item: CanvasItem;
    ctx: ContextRenderCtx;
};

export const renderGeneralTab = ({ item, ctx }: GeneralTabProps) =>
    WF.Element("div", { className: "context-window-section" },
        item.type === "polygon"
            ? WF.Element("div", { className: "context-window-note" }, "Polygon context is coming soon.")
            : null,
        WF.Field(
            "Name",
            WF.Element("input", {
                className: "textbox context-window-input",
                type: "text",
                value: item.name ?? "",
                onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                    ctx.updateItem(item.id, { name: event.target.value })
            })
        ),
        WF.Element("div", { className: "context-window-grid" },
            WF.Field(
                "X",
                WF.Element("input", {
                    className: "textbox context-window-input",
                    type: "number",
                    value: item.x,
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                        ctx.updateItem(item.id, { x: Number(event.target.value) || 0 })
                })
            ),
            WF.Field(
                "Y",
                WF.Element("input", {
                    className: "textbox context-window-input",
                    type: "number",
                    value: item.y,
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                        ctx.updateItem(item.id, { y: Number(event.target.value) || 0 })
                })
            ),
            WF.Field(
                "W",
                WF.Element("input", {
                    className: "textbox context-window-input",
                    type: "number",
                    value: item.width,
                    min: 2,
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                        ctx.updateItem(item.id, { width: Math.max(2, Number(event.target.value) || 2) })
                })
            ),
            WF.Field(
                "H",
                WF.Element("input", {
                    className: "textbox context-window-input",
                    type: "number",
                    value: item.height,
                    min: 2,
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                        ctx.updateItem(item.id, { height: Math.max(2, Number(event.target.value) || 2) })
                })
            )
        ),
        WF.Element("div", { className: "context-window-grid" },
            WF.Field(
                "Visible",
                WF.Element("label", { className: "checkbox-label" },
                    WF.Element("input", {
                        className: "checkbox",
                        type: "checkbox",
                        checked: item.visible !== false,
                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                            ctx.updateItem(item.id, { visible: event.target.checked })
                    }),
                    WF.Element("span", { className: "checkbox-text" }, item.visible !== false ? "Shown" : "Hidden")
                )
            ),
            WF.Field(
                "Locked",
                WF.Element("label", { className: "checkbox-label" },
                    WF.Element("input", {
                        className: "checkbox",
                        type: "checkbox",
                        checked: item.locked === true,
                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                            ctx.updateItem(item.id, { locked: event.target.checked })
                    }),
                    WF.Element("span", { className: "checkbox-text" }, item.locked ? "Locked" : "Unlocked")
                )
            ),
            WF.Field(
                "Layer",
                WF.Element("div", { className: "canvas-properties-readonly" }, item.layerId ?? "layer-1")
            ),
            WF.Field(
                "Z-Index",
                WF.Element("input", {
                    className: "textbox context-window-input",
                    type: "number",
                    value: item.zIndex ?? 1,
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                        ctx.updateItem(item.id, { zIndex: Number(event.target.value) || 1 })
                })
            )
        )
    );
