import type { ContextAdapter } from "../adapterTypes";

export const textAdapter: ContextAdapter = {
    id: "text",
    supports: (item) => item.type === "text",
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
