import type { ContextAdapter } from "../adapterTypes";

const shapeTabs = [
    { id: "general", title: "General" as const },
    { id: "appearance", title: "Appearance" as const },
    { id: "triggers", title: "Triggers" as const },
    { id: "effects", title: "Effects" as const }
];

export const rectAdapter: ContextAdapter = {
    id: "rect",
    supports: (item) => item.type === "rect",
    tabs: shapeTabs,
    getDefaultTab: () => "general"
};

export const ellipseAdapter: ContextAdapter = {
    id: "ellipse",
    supports: (item) => item.type === "ellipse",
    tabs: shapeTabs,
    getDefaultTab: () => "general"
};

export const lineAdapter: ContextAdapter = {
    id: "line",
    supports: (item) => item.type === "line",
    tabs: shapeTabs,
    getDefaultTab: () => "general"
};
