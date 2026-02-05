export const coerceNumber = (value: unknown, fallback?: number) => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === "number" && !Number.isNaN(value)) return value;
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.length === 0) return fallback;
        const parsed = Number(trimmed);
        if (!Number.isNaN(parsed)) return parsed;
    }
    return fallback;
};

export const coercePositiveInt = (value: unknown, fallback: number) => {
    const num = coerceNumber(value, fallback);
    if (num === undefined) return fallback;
    return Math.max(1, Math.floor(num));
};

export const coercePercent = (value: unknown, fallback: number) => {
    const num = coerceNumber(value, fallback);
    if (num === undefined) return fallback;
    return Math.max(0, Math.min(100, num));
};

export const normalizeOrientation = (value?: string) => {
    if (!value) return "horizontal";
    const normalized = value.toLowerCase();
    return normalized === "vertical" ? "vertical" : "horizontal";
};