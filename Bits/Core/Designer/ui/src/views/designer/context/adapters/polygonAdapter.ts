import type { ContextAdapter } from "../adapterTypes";

export const polygonAdapter: ContextAdapter = {
    id: "polygon",
    supports: (item) => item.type === "polygon",
    tabs: [{ id: "general", title: "General" }],
    getDefaultTab: () => "general"
};
