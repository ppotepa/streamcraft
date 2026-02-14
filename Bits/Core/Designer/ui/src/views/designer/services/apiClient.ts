const normalizeBase = (base: string) => (base.endsWith("/") ? base : `${base}/`);

const baseUrl = normalizeBase(import.meta.env.BASE_URL ?? "/");

export const buildApiUrl = (path: string) => {
    const trimmed = path.replace(/^\/+/g, "");
    return new URL(trimmed, window.location.origin + baseUrl).toString();
};

export const apiFetch = (path: string, init?: RequestInit) => fetch(buildApiUrl(path), init);
