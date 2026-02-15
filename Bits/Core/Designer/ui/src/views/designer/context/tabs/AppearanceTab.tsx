import React from "react";
import { WF } from "@streamcraft/forms";
import type { CanvasItem } from "../../domain/types";
import type { ContextRenderCtx } from "../adapterTypes";

type AppearanceTabProps = {
    item: CanvasItem;
    ctx: ContextRenderCtx;
};

const normalizeColor = (value: string | undefined, fallback: string) =>
    value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;

export const renderAppearanceTab = ({ item, ctx }: AppearanceTabProps) => {
    if (item.type === "rect" || item.type === "ellipse") {
        return WF.Element("div", { className: "context-window-section" },
            WF.Element("div", { className: "context-window-grid" },
                WF.Field(
                    "Fill",
                    WF.Element("input", {
                        className: "context-window-input",
                        type: "color",
                        value: normalizeColor(item.fill && item.fill !== "transparent" ? item.fill : undefined, "#ffffff"),
                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                            ctx.updateItem(item.id, { fill: event.target.value })
                    })
                ),
                WF.Field(
                    "Stroke",
                    WF.Element("input", {
                        className: "context-window-input",
                        type: "color",
                        value: normalizeColor(item.stroke, "#2f2f2f"),
                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                            ctx.updateItem(item.id, { stroke: event.target.value })
                    })
                )
            )
        );
    }

    if (item.type === "line") {
        return WF.Element("div", { className: "context-window-section" },
            WF.Element("div", { className: "context-window-grid" },
                WF.Field(
                    "Stroke",
                    WF.Element("input", {
                        className: "context-window-input",
                        type: "color",
                        value: normalizeColor(item.stroke, "#2f2f2f"),
                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                            ctx.updateItem(item.id, { stroke: event.target.value })
                    })
                ),
                WF.Field(
                    "Thickness",
                    WF.Element("input", {
                        className: "textbox context-window-input",
                        type: "number",
                        min: 2,
                        value: item.strokeWidth ?? item.height,
                        onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                            const next = Math.max(2, Number(event.target.value) || 2);
                            ctx.updateItem(item.id, { strokeWidth: next, height: next });
                        }
                    })
                )
            )
        );
    }

    return WF.Element("div", { className: "context-window-note" }, "Appearance tab is not available for this component.");
};
