const explicitBackendBase = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.trim();

const inferDevBackendBase = () => {
    if (typeof window === "undefined") return "";
    const { hostname, port, protocol } = window.location;
    if (hostname === "localhost" && port === "5174") {
        return `${protocol}//localhost:5000`;
    }
    return "";
};

const resolveApiBase = () => explicitBackendBase || inferDevBackendBase() || window.location.origin;

export const buildApiUrl = (path: string) => {
    const raw = path.trim();
    if (/^https?:\/\//i.test(raw)) {
        return raw;
    }

    const normalized = raw.startsWith("/") ? raw : `/${raw.replace(/^\.?\/*/, "")}`;

    return new URL(normalized, resolveApiBase()).toString();
};

export const apiFetch = (path: string, init?: RequestInit) => fetch(buildApiUrl(path), init);
