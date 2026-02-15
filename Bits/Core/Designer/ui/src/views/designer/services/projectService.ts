import { apiFetch } from "./apiClient";

export type DesignerProjectSummary = {
    layoutId: string;
    updatedUtc: string;
};

export const listLayouts = async (limit = 20): Promise<DesignerProjectSummary[]> => {
    const normalizedLimit = Math.max(1, Math.min(100, Math.round(limit)));
    const res = await apiFetch(`/designer/layouts?limit=${encodeURIComponent(String(normalizedLimit))}`, { cache: "no-store" });
    if (!res.ok) {
        throw new Error(await res.text());
    }

    const payload = (await res.json()) as DesignerProjectSummary[] | null;
    if (!Array.isArray(payload)) {
        return [];
    }

    return payload
        .filter((entry) => entry && typeof entry.layoutId === "string")
        .map((entry) => ({
            layoutId: entry.layoutId,
            updatedUtc: typeof entry.updatedUtc === "string" ? entry.updatedUtc : ""
        }));
};

export const loadLayout = async (layoutId: string): Promise<string> => {
    const res = await apiFetch(`/designer/layout?layoutId=${encodeURIComponent(layoutId)}`, { cache: "no-store" });
    if (res.status === 204) return "";
    if (!res.ok) {
        throw new Error(await res.text());
    }

    return await res.text();
};
