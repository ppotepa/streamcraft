import { WF } from "@streamcraft/forms";
import type { CanvasItem } from "../../domain/types";
import type { ContextRenderCtx } from "../adapterTypes";

type EffectsTabProps = {
    item: CanvasItem;
    ctx: ContextRenderCtx;
};

export const renderEffectsTab = ({ item, ctx }: EffectsTabProps) =>
    WF.Element("div", { className: "context-window-section" },
        WF.Element("div", { className: "context-window-note" }, "Attach visual/audio effects for this component."),
        Array.isArray(item.triggerRules) && item.triggerRules.length > 0
            ? WF.Element("div", { className: "context-window-list" },
                ...item.triggerRules.map((rule) =>
                    WF.Element("div", { key: `ctx-effect-${rule.ruleId}`, className: "context-window-list-row" },
                        `${rule.effectTemplateName} (${rule.effectId})`
                    )
                ))
            : WF.Element("div", { className: "context-window-note" }, "No effects linked through trigger rules."),
        WF.Row(
            { Style: "justify-content: flex-end;" },
            WF.Element("button", {
                className: "button",
                onClick: () => ctx.effectsCatalog.open(item.id)
            }, "Open Effects Catalog")
        )
    );
