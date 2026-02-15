import React from "react";
import { WF } from "@streamcraft/forms";
import type { CanvasItem } from "../../domain/types";
import type { ContextRenderCtx } from "../adapterTypes";

type SourceTabProps = {
    item: CanvasItem;
    ctx: ContextRenderCtx;
};

export const renderSourceTab = ({ item, ctx }: SourceTabProps) =>
    WF.Element("div", { className: "context-window-section" },
        WF.Field(
            "Static source",
            WF.Element("input", {
                className: "textbox context-window-input",
                type: "text",
                value: item.src ?? "",
                placeholder: "https://.../image.png",
                onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                    ctx.updateItem(item.id, { src: event.target.value })
            })
        ),
        WF.Element("div", { className: "context-window-note" }, "For image components you can use static URL or bind via Data tab.")
    );
