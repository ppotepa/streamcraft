import { element } from "../../../../libs/forms/core";

export const getFieldDepth = (path: string): number => {
    const normalized = path.replace(/\[(\d+)\]/g, ".$1");
    const parts = normalized.split(".").filter(Boolean);
    return Math.max(0, parts.length - 1);
};

export const formatJsonValue = (value: unknown): string => {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string") {
        const trimmed = value.length > 140 ? `${value.slice(0, 140)}…` : value;
        return `"${trimmed}"`;
    }
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return String(value);
};

export const renderJsonTree = (label: string, value: unknown, depth: number, path: string): any => {
    const isObject = value !== null && typeof value === "object";
    if (!isObject) {
        return element(
            "div",
            { className: "json-leaf", key: path },
            element("span", { className: "json-leaf-key" }, label),
            element("span", { className: "json-leaf-sep" }, ": "),
            element("span", { className: "json-leaf-value" }, formatJsonValue(value))
        );
    }

    const entries = Array.isArray(value)
        ? (value as unknown[]).map((entry, index) => [String(index), entry] as const)
        : Object.entries(value as Record<string, unknown>);
    const typeLabel = Array.isArray(value) ? "array" : "object";
    const summaryLabel = label ? `${label} (${typeLabel}, ${entries.length})` : `root (${typeLabel}, ${entries.length})`;

    return element(
        "details",
        { className: "json-node", open: depth < 1, key: path },
        element("summary", { className: "json-node-summary" }, summaryLabel),
        element(
            "div",
            { className: "json-node-children" },
            ...entries.map(([childKey, childValue]) => renderJsonTree(childKey, childValue, depth + 1, `${path}.${childKey}`))
        )
    );
};
