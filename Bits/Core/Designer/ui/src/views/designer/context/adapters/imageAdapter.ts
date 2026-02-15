import type { ContextAdapter } from "../adapterTypes";

export const imageAdapter: ContextAdapter = {
    id: "image",
    supports: (item) => item.type === "image",
    tabs: [
        { id: "general", title: "General" },
        { id: "data", title: "Data" },
        { id: "runtime", title: "Runtime" },
        { id: "source", title: "Source" },
        { id: "triggers", title: "Triggers" },
        { id: "effects", title: "Effects" }
    ],
    getDefaultTab: () => "general"
};
