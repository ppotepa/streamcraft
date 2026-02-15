import React from "react";
import { WF } from "@streamcraft/forms";
import type { CanvasItem } from "../../domain/types";
import type { ContextRenderCtx } from "../adapterTypes";

type StyleTabProps = {
    item: CanvasItem;
    ctx: ContextRenderCtx;
};

const normalizeColor = (value: string | undefined, fallback: string) =>
    value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;

export const renderStyleTab = ({ item, ctx }: StyleTabProps) => {
    if (item.type === "text") {
        return WF.Element("div", { className: "context-window-section" },
            WF.Field(
                "Font",
                WF.Element("input", {
                    className: "textbox context-window-input",
                    type: "text",
                    value: item.fontFamily ?? "Segoe UI",
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                        ctx.updateItem(item.id, { fontFamily: event.target.value })
                })
            ),
            WF.Element("div", { className: "context-window-grid" },
                WF.Field(
                    "Size",
                    WF.Element("input", {
                        className: "textbox context-window-input",
                        type: "number",
                        min: 8,
                        max: 72,
                        value: item.fontSize ?? 16,
                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                            ctx.updateItem(item.id, { fontSize: Math.max(8, Number(event.target.value) || 16) })
                    })
                ),
                WF.Field(
                    "Weight",
                    WF.Element("input", {
                        className: "textbox context-window-input",
                        type: "text",
                        value: item.fontWeight ?? "normal",
                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                            ctx.updateItem(item.id, { fontWeight: event.target.value })
                    })
                ),
                WF.Field(
                    "Color",
                    WF.Element("input", {
                        className: "context-window-input",
                        type: "color",
                        value: normalizeColor(item.textColor, "#222222"),
                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                            ctx.updateItem(item.id, { textColor: event.target.value })
                    })
                )
            )
        );
    }

    if (item.type === "chat") {
        return WF.Element("div", { className: "context-window-section" },
            WF.Element("div", { className: "context-window-note" }, "Chat style controls in unified context window."),
            WF.Element("div", { className: "context-window-grid" },
                WF.Field(
                    "Visible lines",
                    WF.Element("input", {
                        className: "textbox context-window-input",
                        type: "number",
                        min: 1,
                        max: 10,
                        value: item.chatLines ?? 4,
                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                            ctx.updateItem(item.id, { chatLines: Math.max(1, Math.min(10, Number(event.target.value) || 4)) })
                    })
                ),
                WF.Field(
                    "Font size",
                    WF.Element("input", {
                        className: "textbox context-window-input",
                        type: "number",
                        min: 11,
                        max: 22,
                        value: item.chatFontSize ?? 14,
                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                            ctx.updateItem(item.id, { chatFontSize: Math.max(11, Math.min(22, Number(event.target.value) || 14)) })
                    })
                ),
                WF.Field(
                    "Bubble color",
                    WF.Element("input", {
                        className: "context-window-input",
                        type: "color",
                        value: normalizeColor(item.chatBubbleColor, "#1b212b"),
                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                            ctx.updateItem(item.id, { chatBubbleColor: event.target.value })
                    })
                ),
                WF.Field(
                    "Text color",
                    WF.Element("input", {
                        className: "context-window-input",
                        type: "color",
                        value: normalizeColor(item.chatTextColor ?? item.textColor, "#f2f4f8"),
                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                            ctx.updateItem(item.id, { chatTextColor: event.target.value })
                    })
                )
            )
        );
    }

    if (item.type === "progress") {
        return WF.Element("div", { className: "context-window-section" },
            WF.Element("div", { className: "context-window-grid" },
                WF.Field(
                    "Minimum",
                    WF.Element("input", {
                        className: "textbox context-window-input",
                        type: "number",
                        value: item.minimum ?? 0,
                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                            ctx.updateItem(item.id, { minimum: Number(event.target.value) || 0 })
                    })
                ),
                WF.Field(
                    "Maximum",
                    WF.Element("input", {
                        className: "textbox context-window-input",
                        type: "number",
                        value: item.maximum ?? 100,
                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                            ctx.updateItem(item.id, { maximum: Number(event.target.value) || 100 })
                    })
                ),
                WF.Field(
                    "Value",
                    WF.Element("input", {
                        className: "textbox context-window-input",
                        type: "number",
                        value: item.value ?? 0,
                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                            ctx.updateItem(item.id, { value: Number(event.target.value) || 0 })
                    })
                ),
                WF.Field(
                    "Style",
                    WF.Element("select", {
                        className: "combobox context-window-input",
                        value: item.progressStyle ?? "blocks",
                        onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
                            ctx.updateItem(item.id, { progressStyle: event.target.value as "blocks" | "continuous" })
                    },
                    WF.Element("option", { value: "blocks" }, "Blocks"),
                    WF.Element("option", { value: "continuous" }, "Continuous"))
                )
            )
        );
    }

    return WF.Element("div", { className: "context-window-note" }, "No style settings for this component.");
};
