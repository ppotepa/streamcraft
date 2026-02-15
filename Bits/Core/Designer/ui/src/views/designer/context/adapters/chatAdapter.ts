import type { ContextAdapter } from "../adapterTypes";

export const chatAdapter: ContextAdapter = {
    id: "chat",
    supports: (item) => item.type === "chat",
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
