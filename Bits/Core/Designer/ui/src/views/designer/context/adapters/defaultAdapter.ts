import type { ContextAdapter } from "../adapterTypes";

export const defaultAdapter: ContextAdapter = {
    id: "default",
    supports: () => true,
    tabs: [
        { id: "general", title: "General" },
        { id: "triggers", title: "Triggers" },
        { id: "effects", title: "Effects" }
    ],
    getDefaultTab: () => "general"
};
