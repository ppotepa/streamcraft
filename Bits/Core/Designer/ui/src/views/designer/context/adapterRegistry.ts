import type { CanvasItem } from "../domain/types";
import type { ContextAdapter, ContextCapabilities, ContextTabId } from "./adapterTypes";
import { chatAdapter } from "./adapters/chatAdapter";
import { defaultAdapter } from "./adapters/defaultAdapter";
import { ellipseAdapter, lineAdapter, rectAdapter } from "./adapters/shapeAdapters";
import { imageAdapter } from "./adapters/imageAdapter";
import { polygonAdapter } from "./adapters/polygonAdapter";
import { progressAdapter } from "./adapters/progressAdapter";
import { textAdapter } from "./adapters/textAdapter";

const orderedAdapters: ContextAdapter[] = [
    chatAdapter,
    textAdapter,
    imageAdapter,
    progressAdapter,
    rectAdapter,
    ellipseAdapter,
    lineAdapter,
    polygonAdapter
];

const dynamicAdapters: ContextAdapter[] = [];

export const registerAdapter = (adapter: ContextAdapter) => {
    const existing = dynamicAdapters.findIndex((entry) => entry.id === adapter.id);
    if (existing >= 0) {
        dynamicAdapters[existing] = adapter;
        return;
    }
    dynamicAdapters.push(adapter);
};

export const resolveAdapter = (item: CanvasItem | null): ContextAdapter => {
    if (!item) return defaultAdapter;

    const custom = dynamicAdapters.find((adapter) => adapter.supports(item));
    if (custom) return custom;

    const predefined = orderedAdapters.find((adapter) => adapter.supports(item));
    return predefined ?? defaultAdapter;
};

export const getSupportedTabs = (item: CanvasItem | null) => resolveAdapter(item).tabs;

const ALL_TAB_IDS: ContextTabId[] = [
    "general",
    "data",
    "runtime",
    "style",
    "source",
    "appearance",
    "triggers",
    "effects"
];

export const getContextCapabilities = (item: CanvasItem | null): ContextCapabilities => {
    const supported = new Set(getSupportedTabs(item).map((tab) => tab.id));
    return {
        general: supported.has("general"),
        data: supported.has("data"),
        runtime: supported.has("runtime"),
        style: supported.has("style"),
        source: supported.has("source"),
        appearance: supported.has("appearance"),
        triggers: supported.has("triggers"),
        effects: supported.has("effects")
    };
};

export const isSupportedTab = (item: CanvasItem | null, tabId: ContextTabId): boolean => {
    if (!ALL_TAB_IDS.includes(tabId)) return false;
    const tabs = getSupportedTabs(item);
    return tabs.some((tab) => tab.id === tabId);
};
