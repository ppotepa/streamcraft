import type { ContextAdapter } from "../adapterTypes";

export const progressAdapter: ContextAdapter = {
    id: "progress",
    supports: (item) => item.type === "progress",
    tabs: [
        { id: "general", title: "General" },
        { id: "data", title: "Data" },
        { id: "runtime", title: "Runtime" },
        { id: "style", title: "Style" },
        { id: "triggers", title: "Triggers" },
        { id: "effects", title: "Effects" }
    ],
    getDefaultTab: () => "general"
};
