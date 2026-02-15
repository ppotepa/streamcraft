import { WF } from "@streamcraft/forms";
import type { FormNode } from "@streamcraft/forms/core";
import type { CanvasItem } from "../../domain/types";
import type { ContextRenderCtx, ContextTabId } from "../adapterTypes";
import { renderAppearanceTab } from "./AppearanceTab";
import { renderDataTab } from "./DataTab";
import { renderEffectsTab } from "./EffectsTab";
import { renderGeneralTab } from "./GeneralTab";
import { renderRuntimeTab } from "./RuntimeTab";
import { renderSourceTab } from "./SourceTab";
import { renderStyleTab } from "./StyleTab";
import { renderTriggersTab } from "./TriggersTab";

type TabRendererArgs = {
    item: CanvasItem;
    ctx: ContextRenderCtx;
};

const rendererMap: Record<ContextTabId, (args: TabRendererArgs) => FormNode> = {
    general: renderGeneralTab,
    data: renderDataTab,
    runtime: renderRuntimeTab,
    style: renderStyleTab,
    source: renderSourceTab,
    appearance: renderAppearanceTab,
    triggers: renderTriggersTab,
    effects: renderEffectsTab
};

export const renderContextTab = (tabId: ContextTabId, item: CanvasItem, ctx: ContextRenderCtx): FormNode => {
    const renderer = rendererMap[tabId];
    if (!renderer) {
        return WF.Element("div", { className: "context-window-note" }, "Tab renderer not implemented.");
    }
    return renderer({ item, ctx });
};
