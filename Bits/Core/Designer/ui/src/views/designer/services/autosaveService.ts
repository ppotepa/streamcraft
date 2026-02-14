import { apiFetch } from "./apiClient";

export const loadAutosave = async (sessionId?: string) => {
    const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : "";
    const res = await apiFetch(`/designer/autosave${query}`, { cache: "no-store" });
    if (res.status === 204) return "";
    if (!res.ok) throw new Error(await res.text());
    return await res.text();
};

export const saveAutosave = async (json: string, sessionId?: string) => {
    const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : "";
    const res = await apiFetch(`/designer/autosave${query}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: json
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }
};

export const saveLayout = async (layoutId: string, json: string) => {
    const res = await apiFetch(`/designer/layout?layoutId=${encodeURIComponent(layoutId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: json
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }
};
