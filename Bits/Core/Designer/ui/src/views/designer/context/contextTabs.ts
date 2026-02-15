import type { CanvasItem } from "../domain/types";

export type ContextTabId = "data" | "binding" | "runtime" | "triggers" | "effects" | "style";
export type ContextTabScope = "default" | "dataSourceExplorer" | "chatSettings";

export type ContextTabDefinition = {
    id: ContextTabId;
    title: string;
};

export const CONTEXT_TABS: ContextTabDefinition[] = [
    { id: "data", title: "Data" },
    { id: "binding", title: "Binding" },
    { id: "runtime", title: "Runtime" },
    { id: "triggers", title: "Triggers" },
    { id: "effects", title: "Effects" },
    { id: "style", title: "Style" }
];

const SCOPE_TAB_ORDER: Record<ContextTabScope, ContextTabId[]> = {
    default: ["data", "binding", "runtime", "triggers", "effects", "style"],
    dataSourceExplorer: ["data", "binding", "runtime"],
    chatSettings: ["data", "style", "triggers", "effects"]
};

export type ComponentCapabilities = Record<ContextTabId, boolean>;

const BASE_CAPABILITIES: ComponentCapabilities = {
    data: true,
    binding: true,
    runtime: true,
    triggers: true,
    effects: true,
    style: false
};

export const getComponentCapabilities = (item: CanvasItem | null): ComponentCapabilities => {
    if (!item) {
        return { ...BASE_CAPABILITIES };
    }

    const isVisual = item.type === "text" || item.type === "image" || item.type === "progress" || item.type === "chat";
    const supportsBinding = isVisual;
    const supportsStyle = item.type === "text" || item.type === "chat" || item.type === "progress";

    return {
        data: supportsBinding,
        binding: supportsBinding,
        runtime: supportsBinding,
        triggers: true,
        effects: true,
        style: supportsStyle
    };
};

export const getVisibleContextTabs = (item: CanvasItem | null) => {
    const capabilities = getComponentCapabilities(item);
    return CONTEXT_TABS.filter((tab) => capabilities[tab.id]);
};

export const getVisibleContextTabsForScope = (
    item: CanvasItem | null,
    scope: ContextTabScope
) => {
    const visible = getVisibleContextTabs(item);
    const allowed = new Set(SCOPE_TAB_ORDER[scope]);
    return visible.filter((tab) => allowed.has(tab.id));
};
