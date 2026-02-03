import type { ApiFieldSpec } from "../domain/types";

export const formatCategoryLabel = (id?: string, label?: string) => {
    if (label && label.trim().length > 0) return label;
    if (!id) return "";
    const cleaned = id.replace(/^public-/, "").replace(/^system-/, "");
    const words = cleaned.split("-").filter(Boolean);
    if (words.length === 0) return id;
    return words.map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
};

export const parsePathTokens = (path: string) => {
    const tokens: Array<string | number> = [];
    const regex = /([^.[\]]+)|\[(\d+)\]/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(path)) !== null) {
        if (match[1] !== undefined) {
            tokens.push(match[1]);
        } else if (match[2] !== undefined) {
            tokens.push(Number(match[2]));
        }
    }
    return tokens;
};

export const buildFieldSpecs = (value: unknown) => {
    const fields: ApiFieldSpec[] = [];

    const walk = (node: unknown, path: string) => {
        const isContainer = node !== null && typeof node === "object";
        if (path) {
            const typeLabel = Array.isArray(node) ? "array" : typeof node;
            fields.push({
                path,
                type: typeLabel,
                example: isContainer ? null : (node as any),
                isContainer
            });
        }

        if (!isContainer) return;

        if (Array.isArray(node)) {
            if (node.length > 0) {
                walk(node[0], `${path}[0]`);
            }
            return;
        }

        const entries = Object.entries(node as Record<string, unknown>);
        for (const [key, child] of entries) {
            const childPath = path ? `${path}.${key}` : key;
            walk(child, childPath);
        }
    };

    if (value !== undefined) {
        walk(value, "");
    }

    return fields;
};
