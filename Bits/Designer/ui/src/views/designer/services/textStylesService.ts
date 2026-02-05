import type { GoogleFontFamily } from "../types/designer.types";
import type { TextStyleCatalogEntry } from "@streamcraft/forms/TextStylesDialog";

export const loadGoogleFontsFromExtension = async (
    remoteKey: string,
    search: string,
    categoryId: string,
    weightFilter: string,
    caseFilter: string,
    shadowFilter: string,
    page: number,
    pageSize: number,
    resolveGoogleCategory: (categoryId: string) => string
): Promise<{ styles: TextStyleCatalogEntry[]; total: number } | null> => {
    try {
        const queryParams = new URLSearchParams({
            search,
            category: resolveGoogleCategory(categoryId),
            weight: weightFilter,
            case: caseFilter,
            shadow: shadowFilter,
            page: String(page),
            pageSize: String(pageSize)
        });

        const res = await fetch(`/designer/extensions/${remoteKey}/data?${queryParams.toString()}`, {
            cache: "no-store"
        });

        if (!res.ok) return null;

        const data = (await res.json()) as {
            styles?: TextStyleCatalogEntry[];
            total?: number;
        };

        return {
            styles: data.styles ?? [],
            total: data.total ?? 0
        };
    } catch {
        return null;
    }
};

export const ensureTextStylesFontFaces = (styles: TextStyleCatalogEntry[]): void => {
    if (typeof window === "undefined" || !window.document) return;

    const loadedFonts = new Set<string>();
    const existingLinks = Array.from(document.head.querySelectorAll("link[data-text-style-font]"));
    existingLinks.forEach((link) => {
        const family = link.getAttribute("data-text-style-font");
        if (family) loadedFonts.add(family);
    });

    styles.forEach((style) => {
        if (!style.fontFamily) return;
        const family = style.fontFamily;
        if (loadedFonts.has(family)) return;

        loadedFonts.add(family);
        const encodedFamily = encodeURIComponent(family);
        const weights = ["400", "700"];
        const variants = weights.flatMap((weight) => [`${weight}`, `${weight}italic`]);
        const href = `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@${variants.join(";")}&display=swap`;

        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        link.setAttribute("data-text-style-font", family);
        document.head.appendChild(link);
    });
};

export const filterTextStyles = (
    baseStyles: TextStyleCatalogEntry[],
    search: string,
    categoryId: string,
    weightFilter: string,
    caseFilter: string,
    shadowFilter: string
): TextStyleCatalogEntry[] => {
    return baseStyles.filter((style) => {
        if (categoryId && categoryId !== "all" && style.category !== categoryId) return false;

        if (weightFilter && weightFilter !== "All") {
            const weight = style.fontWeight ?? "normal";
            const numericWeight = typeof weight === "number" ? weight : weight === "bold" ? 700 : 400;

            if (weightFilter === "Light" && numericWeight >= 400) return false;
            if (weightFilter === "Regular" && (numericWeight < 400 || numericWeight >= 700)) return false;
            if (weightFilter === "Bold" && numericWeight < 700) return false;
        }

        if (caseFilter && caseFilter !== "Mixed") {
            const transform = style.textTransform ?? "none";
            if (caseFilter === "Uppercase" && transform !== "uppercase") return false;
            if (caseFilter === "Lowercase" && transform !== "lowercase") return false;
            if (caseFilter === "Normal" && transform !== "none") return false;
        }

        if (shadowFilter && shadowFilter !== "Any") {
            const hasShadow = (style.textShadowX ?? 0) !== 0 ||
                (style.textShadowY ?? 0) !== 0 ||
                (style.textShadowBlur ?? 0) !== 0;

            if (shadowFilter === "Shadow" && !hasShadow) return false;
            if (shadowFilter === "NoShadow" && hasShadow) return false;
        }

        return true;
    });
};

export const buildTextStylesById = (
    localStyles: TextStyleCatalogEntry[],
    remoteCache: { styles: TextStyleCatalogEntry[]; total: number } | null
): Map<string, TextStyleCatalogEntry> => {
    const map = new Map<string, TextStyleCatalogEntry>();

    localStyles.forEach((style) => {
        map.set(style.id, style);
    });

    remoteCache?.styles.forEach((style) => {
        if (!map.has(style.id)) {
            map.set(style.id, style);
        }
    });

    return map;
};

export const buildTextStyleCategories = (
    styles: TextStyleCatalogEntry[]
): Array<{ id: string; label: string; count: number }> => {
    const counts = new Map<string, number>();

    styles.forEach((style) => {
        const category = style.category ?? "other";
        counts.set(category, (counts.get(category) ?? 0) + 1);
    });

    const categories = Array.from(counts.entries()).map(([id, count]) => ({
        id,
        label: id.charAt(0).toUpperCase() + id.slice(1),
        count
    }));

    categories.sort((a, b) => a.label.localeCompare(b.label));
    categories.unshift({ id: "all", label: "All", count: styles.length });

    return categories;
};

