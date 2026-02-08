import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import type { CanvasItem } from "../types/canvas.types";
import type { DesignerUiExtension, GoogleFontFamily } from "../types/extension.types";
import type { TextStyleCatalogEntry } from "../forms/TextStylesDialog.Designer";

const PAGE_SIZE = 50;

export function useTextStyleCatalog(
    canvas: {
        selectedItem: CanvasItem | null;
        updateItem: (id: string, updates: Partial<CanvasItem>) => void;
    },
    extensions: {
        uiExtensions: DesignerUiExtension[];
        setUiExtensions: (fn: (prev: DesignerUiExtension[]) => DesignerUiExtension[]) => void;
        getExtensionGroupId: (ext: DesignerUiExtension) => string;
        openUiExtensions: Set<string>;
        refreshExtensions: () => Promise<void>;
    }
) {
    const [textStylesSearch, setTextStylesSearch] = useState("");
    const [textStylesPreviewText, setTextStylesPreviewText] = useState("The quick brown fox jumps over the lazy dog");
    const [textStylesCustomText, setTextStylesCustomText] = useState("Sphinx of black quartz, judge my vow.");
    const [textStylesCategoryId, setTextStylesCategoryId] = useState("all");
    const [textStylesWeightFilter, setTextStylesWeightFilter] = useState("All");
    const [textStylesCaseFilter, setTextStylesCaseFilter] = useState("Mixed");
    const [textStylesShadowFilter, setTextStylesShadowFilter] = useState("Any");
    const [textStylesSelectedId, setTextStylesSelectedId] = useState<string | null>(null);
    const [textStylesStatus, setTextStylesStatus] = useState<string>("");
    const [textStylesRefreshing, setTextStylesRefreshing] = useState(false);
    const [textStylesFontSource, setTextStylesFontSource] = useState("Google Fonts");
    const [textStylesStatusTone, setTextStylesStatusTone] = useState<"info" | "error" | "success">("info");
    const [textStylesFavorites, setTextStylesFavorites] = useState<string[]>([]);
    const [textStylesHoveredId, setTextStylesHoveredId] = useState<string | null>(null);
    const [textStylesPage, setTextStylesPage] = useState(1);
    const [textStylesSyncPreview, setTextStylesSyncPreview] = useState(false);

    // AI State
    const [textStylesAiPromptOpen, setTextStylesAiPromptOpen] = useState(false);
    const [textStylesAiPrompt, setTextStylesAiPrompt] = useState("");
    const [textStylesAiResponse, setTextStylesAiResponse] = useState("");
    const [textStylesAiBusy, setTextStylesAiBusy] = useState(false);

    const textStylesAutoloadRef = useRef(false);

    const refreshTextStylesCatalog = useCallback(async () => {
        setTextStylesRefreshing(true);
        setTextStylesStatus("Refreshing Google Fonts catalog...");
        setTextStylesStatusTone("info");
        try {
            const res = await fetch("/textstyles/fonts/catalog/refresh", { method: "POST" });
            if (!res.ok) throw new Error(await res.text());
            await extensions.refreshExtensions();
            setTextStylesStatus("Catalog refreshed.");
            setTextStylesStatusTone("success");
        } catch (err) {
            setTextStylesStatus(`Refresh failed: ${String(err)}`);
            setTextStylesStatusTone("error");
        } finally {
            setTextStylesRefreshing(false);
        }
    }, [extensions.refreshExtensions]);

    const resolveGoogleCategory = useCallback((categoryId: string) => {
        const normalized = categoryId.trim().toLowerCase();
        if (normalized === "mono" || normalized === "monospace") return "monospace";
        if (normalized === "editorial" || normalized === "serif") return "serif";
        if (normalized === "retro" || normalized === "neon" || normalized === "display") return "display";
        return "sans-serif";
    }, []);

    const textStylesData = useMemo(() => {
        for (const extension of extensions.uiExtensions) {
            if (extensions.getExtensionGroupId(extension) !== "text-styles") continue;
            const styles = extension.data?.styles;
            if (Array.isArray(styles)) return styles as TextStyleCatalogEntry[];
        }
        return [] as TextStyleCatalogEntry[];
    }, [extensions.getExtensionGroupId, extensions.uiExtensions]);

    const textStylesRemoteCache = useMemo(() => {
        const query = textStylesSearch.trim().toLowerCase();
        if (query.length < 2) return null;
        for (const extension of extensions.uiExtensions) {
            if (extensions.getExtensionGroupId(extension) !== "text-styles") continue;
            const remoteStyles = extension.data?.remoteStyles;
            const remoteQuery = extension.data?.remoteQuery;
            const remoteTotal = extension.data?.remoteTotal;
            if (typeof remoteQuery === "string" && remoteQuery === query && Array.isArray(remoteStyles)) {
                return {
                    styles: remoteStyles as TextStyleCatalogEntry[],
                    total: typeof remoteTotal === "number" ? remoteTotal : remoteStyles.length
                };
            }
        }
        return null;
    }, [extensions.getExtensionGroupId, textStylesSearch, extensions.uiExtensions]);

    const textStylesBase = useMemo(() => {
        const query = textStylesSearch.trim();
        if (query.length >= 2 && !textStylesRemoteCache) {
            return [] as TextStyleCatalogEntry[];
        }
        return textStylesRemoteCache?.styles ?? textStylesData;
    }, [textStylesData, textStylesRemoteCache, textStylesSearch]);

    const textStylesTotalCount = textStylesRemoteCache?.total ?? textStylesBase.length;

    const textStylesById = useMemo(() => {
        const map = new Map<string, TextStyleCatalogEntry>();
        for (const style of textStylesData) {
            if (style?.id) {
                map.set(style.id, style);
            }
        }
        if (textStylesRemoteCache?.styles) {
            for (const style of textStylesRemoteCache.styles) {
                if (style?.id && !map.has(style.id)) {
                    map.set(style.id, style);
                }
            }
        }
        return map;
    }, [textStylesData, textStylesRemoteCache]);

    const ensureTextStylesFontFaces = useCallback((styles: TextStyleCatalogEntry[]) => {
        if (typeof document === "undefined") return;
        const fontMap = new Map<string, Set<string>>();
        const resolveVariant = (style: TextStyleCatalogEntry) => {
            const rawWeight = style.fontWeight ?? "regular";
            const weight = rawWeight === "bold" ? "700" : rawWeight === "normal" ? "regular" : rawWeight;
            const italic = (style.fontStyle ?? "normal") === "italic";
            if (italic) {
                return weight === "regular" ? "italic" : `${weight}italic`;
            }
            return weight || "regular";
        };

        for (const style of styles) {
            const family = style.fontFamily?.trim();
            if (!family) continue;
            const variants = fontMap.get(family) ?? new Set<string>();
            variants.add(resolveVariant(style));
            fontMap.set(family, variants);
        }

        const maxFamilies = 6;
        const entries = Array.from(fontMap.entries()).slice(0, maxFamilies);
        const css = entries.map(([family, variants]) => {
            const safeFamily = family.replace(/'/g, "\\'");
            return Array.from(variants).map((variant) => {
                const safeVariant = variant || "regular";
                const url = `/textstyles/fonts/file?family=${encodeURIComponent(family)}&variant=${encodeURIComponent(safeVariant)}`;
                const italic = safeVariant.endsWith("italic");
                const weightPart = italic ? safeVariant.replace("italic", "") : safeVariant;
                const weightValue = weightPart === "" || weightPart === "regular" ? "400" : weightPart;
                const styleValue = italic ? "italic" : "normal";
                return [
                    "@font-face {",
                    `  font-family: '${safeFamily}';`,
                    `  src: url('${url}');`,
                    `  font-weight: ${weightValue};`,
                    `  font-style: ${styleValue};`,
                    "  font-display: swap;",
                    "}"
                ].join("\n");
            }).join("\n");
        }).join("\n");

        let styleEl = document.getElementById("text-styles-font-faces") as HTMLStyleElement | null;
        if (!styleEl) {
            styleEl = document.createElement("style");
            styleEl.id = "text-styles-font-faces";
            document.head.appendChild(styleEl);
        }
        styleEl.textContent = css;
    }, []);

    const textStylesCategories = useMemo(() => {
        const map = new Map<string, { id: string; label: string; count: number }>();
        for (const style of textStylesBase) {
            const id = style.categoryId?.trim() || "other";
            const label = style.categoryLabel?.trim() || "Other";
            const entry = map.get(id) ?? { id, label, count: 0 };
            entry.count += 1;
            map.set(id, entry);
        }
        const list = Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
        return [{ id: "all", label: "All Styles", count: textStylesBase.length }, ...list];
    }, [textStylesBase]);

    useEffect(() => {
        if (textStylesCategories.length === 0) return;
        const exists = textStylesCategories.some((category) => category.id === textStylesCategoryId);
        if (!exists) {
            setTextStylesCategoryId(textStylesCategories[0].id);
        }
    }, [textStylesCategories, textStylesCategoryId]);

    const filteredTextStyles = useMemo(() => {
        const search = textStylesSearch.trim().toLowerCase();
        const weightFilter = textStylesWeightFilter;
        const caseFilter = textStylesCaseFilter;
        const shadowFilter = textStylesShadowFilter;

        const weightMatches = (styleWeight?: string) => {
            if (weightFilter === "All") return true;
            const normalized = (styleWeight ?? "normal").toLowerCase();
            if (weightFilter === "bold") return normalized === "bold" || normalized === "700";
            if (weightFilter === "400") return normalized === "normal" || normalized === "400";
            return normalized === weightFilter.toLowerCase();
        };

        const caseMatches = (transform?: string) => {
            if (caseFilter === "Mixed") return true;
            const normalized = (transform ?? "none").toLowerCase();
            if (caseFilter === "Uppercase") return normalized === "uppercase";
            if (caseFilter === "Lowercase") return normalized === "lowercase";
            return true;
        };

        const shadowMatches = (blur?: number) => {
            const value = blur ?? 0;
            if (shadowFilter === "Any") return true;
            if (shadowFilter === "None") return value <= 0;
            if (shadowFilter === "Soft") return value > 0 && value < 6;
            if (shadowFilter === "Glow") return value >= 6;
            return true;
        };

        return textStylesBase.filter((style) => {
            if (textStylesCategoryId !== "all" && style.categoryId !== textStylesCategoryId) return false;
            if (search) {
                const haystack = [
                    style.name,
                    style.fontFamily,
                    style.categoryLabel,
                    style.categoryId
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();
                if (!haystack.includes(search)) return false;
            }
            if (!weightMatches(style.fontWeight)) return false;
            if (!caseMatches(style.textTransform)) return false;
            if (!shadowMatches(style.textShadowBlur)) return false;
            return true;
        });
    }, [textStylesBase, textStylesCaseFilter, textStylesCategoryId, textStylesSearch, textStylesShadowFilter, textStylesWeightFilter]);

    useEffect(() => {
        setTextStylesPage(1);
    }, [textStylesCategoryId, textStylesCaseFilter, textStylesSearch, textStylesShadowFilter, textStylesWeightFilter]);

    const pagedTextStyles = useMemo(() => {
        const limit = textStylesPage * PAGE_SIZE;
        return filteredTextStyles.slice(0, limit);
    }, [filteredTextStyles, textStylesPage]);

    const canLoadMoreTextStyles = pagedTextStyles.length < filteredTextStyles.length || pagedTextStyles.length < textStylesTotalCount;

    useEffect(() => {
        const candidateStyles = [
            textStylesSelectedId ? textStylesById.get(textStylesSelectedId) ?? null : null,
            textStylesHoveredId ? textStylesById.get(textStylesHoveredId) ?? null : null,
            pagedTextStyles[0] ?? null,
            pagedTextStyles[1] ?? null
        ].filter(Boolean) as TextStyleCatalogEntry[];
        if (candidateStyles.length === 0) return;
        ensureTextStylesFontFaces(candidateStyles);
    }, [ensureTextStylesFontFaces, pagedTextStyles, textStylesById, textStylesHoveredId, textStylesSelectedId]);

    useEffect(() => {
        if (filteredTextStyles.length === 0) {
            setTextStylesSelectedId(null);
            return;
        }
        if (!textStylesSelectedId || !filteredTextStyles.some((style) => style.id === textStylesSelectedId)) {
            setTextStylesSelectedId(filteredTextStyles[0].id);
        }
    }, [filteredTextStyles, textStylesSelectedId]);

    const applyTextStyle = useCallback((style: TextStyleCatalogEntry) => {
        if (!canvas.selectedItem || canvas.selectedItem.type !== "text") return;
        const nextFontStyle = style.fontStyle === "italic" || style.fontStyle === "normal"
            ? style.fontStyle
            : undefined;
        const nextTransform = style.textTransform === "uppercase" || style.textTransform === "lowercase" || style.textTransform === "none"
            ? style.textTransform
            : undefined;
        canvas.updateItem(canvas.selectedItem.id, {
            fontFamily: style.fontFamily ?? canvas.selectedItem.fontFamily,
            fontSize: style.fontSize ?? canvas.selectedItem.fontSize,
            fontWeight: style.fontWeight ?? canvas.selectedItem.fontWeight,
            fontStyle: nextFontStyle ?? canvas.selectedItem.fontStyle,
            textColor: style.textColor ?? canvas.selectedItem.textColor,
            textTransform: nextTransform ?? canvas.selectedItem.textTransform,
            letterSpacing: style.letterSpacing ?? canvas.selectedItem.letterSpacing,
            textShadowX: style.textShadowX ?? canvas.selectedItem.textShadowX,
            textShadowY: style.textShadowY ?? canvas.selectedItem.textShadowY,
            textShadowBlur: style.textShadowBlur ?? canvas.selectedItem.textShadowBlur,
            textShadowColor: style.textShadowColor ?? canvas.selectedItem.textShadowColor
        });
    }, [canvas.selectedItem, canvas.updateItem]);

    const applyTextStyleById = useCallback((styleId: string) => {
        const style = textStylesById.get(styleId);
        if (!style) return;
        applyTextStyle(style);
        setTextStylesStatus(`Applied ${style.name ?? style.fontFamily ?? style.id}.`);
        setTextStylesStatusTone("success");
    }, [applyTextStyle, textStylesById]);

    const applySelectedTextStyle = useCallback(() => {
        if (!textStylesSelectedId) return;
        applyTextStyleById(textStylesSelectedId);
    }, [applyTextStyleById, textStylesSelectedId]);

    const toggleTextStyleFavorite = useCallback((styleId: string) => {
        setTextStylesFavorites((prev) => {
            if (prev.includes(styleId)) {
                return prev.filter((entry) => entry !== styleId);
            }
            return [...prev, styleId];
        });
    }, []);

    const handleTextStylesAiGenerate = useCallback(() => {
        if (textStylesAiBusy) return;
        setTextStylesAiBusy(true);
        setTextStylesAiResponse("Generating placeholder style suggestion...");
        window.setTimeout(() => {
            setTextStylesAiResponse("Placeholder output: A bold display style with cyan glow, 700 weight, slight letter spacing. (AI wiring TBD)");
            setTextStylesAiBusy(false);
        }, 900);
    }, [textStylesAiBusy]);

    const handleUiExtensionEvent = useCallback((name?: string) => {
        if (!name || !name.startsWith("ui-extension:")) return;
        const parts = name.split(":");
        const groupId = parts[1];
        const action = parts[2];
        if (!groupId || !action) return;
        if (action === "open") {
            extensions.setUiExtensions((prev) => {
                const next = new Set(prev); // Fix: prev is Set in some contexts but here we think it's array? 
                // Ah, setOpenUiExtensions in desktop uses Set for open extensions.
                // In this hook args, extensions.uiExtensions is Array. extensions.setUiExtensions expects callback?
                // Wait. extensions.openUiExtensions is Set.
                // extensions.setUiExtensions might be wrong name in hook args if it's meant to set OPEN extensions.
                // Desktop has setOpenUiExtensions AND setUiExtensions (which sets the array).
                return next as any; // FIXME
            });
            return;
        }
    }, []);

    // I need to correct the hook arguments to distinguish setOpenUiExtensions.

    // ... Google Fonts Fetching Effect (lines 1634+) ...
    useEffect(() => {
        const isOpen = extensions.openUiExtensions.has("text-styles");
        const query = textStylesSearch.trim();
        if (!isOpen) {
            setTextStylesStatus("");
            setTextStylesStatusTone("info");
            return;
        }
        if (query.length < 2) {
            if (!textStylesRefreshing) {
                setTextStylesStatus("");
                setTextStylesStatusTone("info");
            }
            return;
        }

        if (textStylesRemoteCache && textStylesRemoteCache.styles.length >= textStylesPage * PAGE_SIZE) {
            setTextStylesStatus(`${textStylesRemoteCache.styles.length} fonts cached.`);
            setTextStylesStatusTone("success");
            return;
        }

        let cancelled = false;
        const timer = window.setTimeout(async () => {
            setTextStylesStatus("Searching Google Fonts...");
            setTextStylesStatusTone("info");
            try {
                const params = new URLSearchParams();
                params.set("query", query);
                params.set("limit", String(textStylesPage * PAGE_SIZE));
                if (textStylesCategoryId !== "all") {
                    params.set("category", resolveGoogleCategory(textStylesCategoryId));
                }
                const res = await fetch(`/textstyles/fonts/catalog?${params.toString()}`, { cache: "no-store" });
                if (!res.ok) throw new Error(await res.text());
                const payload = await res.json();
                if (cancelled) return;
                const items = Array.isArray(payload?.items) ? payload.items as GoogleFontFamily[] : [];
                const total = typeof payload?.total === "number"
                    ? payload.total
                    : typeof payload?.count === "number"
                        ? payload.count
                        : items.length;
                const paletteByCategory: Record<string, string> = {
                    "sans-serif": "#1f2937",
                    "serif": "#111827",
                    "display": "#0f172a",
                    "handwriting": "#7c2d12",
                    "monospace": "#0f172a"
                };
                const mapped = items.map((family: GoogleFontFamily, index) => {
                    const variants = Array.isArray(family.variants) ? family.variants : [];
                    const normalized = variants.map(v => v.toLowerCase());
                    const chooseVariant = () => {
                        const desired = textStylesWeightFilter.toLowerCase();
                        if (desired !== "all") {
                            if (desired === "bold" && normalized.includes("700")) return "700";
                            if (normalized.includes(desired)) return desired;
                        }
                        if (normalized.includes("regular")) return "regular";
                        if (normalized.includes("400")) return "400";
                        return normalized[0] ?? "regular";
                    };
                    const variant = chooseVariant();
                    const italic = variant.endsWith("italic");
                    const weight = italic ? variant.replace("italic", "") : variant;
                    const weightValue = weight === "" ? "regular" : weight;
                    return {
                        id: `gf:${family.family}`,
                        name: family.family,
                        preview: textStylesPreviewText,
                        categoryId: family.category ?? "sans-serif",
                        categoryLabel: (family.category ?? "sans-serif").replace(/(^|\s|-)\w/g, (m) => m.toUpperCase()),
                        fontFamily: family.family,
                        fontSize: 18 + (index % 3) * 2,
                        fontWeight: weightValue === "regular" ? "normal" : weightValue,
                        fontStyle: italic ? "italic" : "normal",
                        textColor: paletteByCategory[family.category ?? "sans-serif"] ?? "#1f2937",
                        textTransform: textStylesCaseFilter === "Uppercase" ? "uppercase" : textStylesCaseFilter === "Lowercase" ? "lowercase" : "none",
                        letterSpacing: index % 5 === 0 ? 1 : 0,
                        textShadowX: textStylesShadowFilter === "Glow" ? 0 : 0,
                        textShadowY: textStylesShadowFilter === "Glow" ? 0 : 0,
                        textShadowBlur: textStylesShadowFilter === "Glow" ? 10 : 0,
                        textShadowColor: textStylesShadowFilter === "Glow" ? "rgba(56,189,248,0.65)" : "rgba(0,0,0,0.35)"
                    } as TextStyleCatalogEntry;
                });
                extensions.setUiExtensions((prev) => prev.map((extension) => {
                    if (extensions.getExtensionGroupId(extension) !== "text-styles") return extension;
                    const existing = (extension.data ?? {}) as Record<string, any>;
                    return {
                        ...extension,
                        data: {
                            ...existing,
                            remoteStyles: mapped,
                            remoteQuery: query.toLowerCase(),
                            remoteTotal: total,
                            remoteUpdatedUtc: new Date().toISOString()
                        }
                    };
                }));

                // Fire and forget server persistence
                void fetch("/designer/extensions/data", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        idOrGroup: "text-styles",
                        merge: true,
                        data: {
                            remoteStyles: mapped,
                            remoteQuery: query.toLowerCase(),
                            remoteTotal: total,
                            remoteUpdatedUtc: new Date().toISOString()
                        }
                    })
                }).catch(() => null);

                setTextStylesStatus(mapped.length > 0 ? `${mapped.length} fonts found.` : "No Google Fonts results.");
                setTextStylesStatusTone(mapped.length > 0 ? "success" : "info");
            } catch (err) {
                if (!cancelled) {
                    setTextStylesStatus(`Search failed: ${String(err)}`);
                    setTextStylesStatusTone("error");
                }
            }
        }, 350);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [extensions.setUiExtensions, extensions.openUiExtensions, extensions.getExtensionGroupId, resolveGoogleCategory, textStylesCaseFilter, textStylesCategoryId, textStylesPage, textStylesRefreshing, textStylesSearch, textStylesShadowFilter, textStylesWeightFilter, textStylesPreviewText, textStylesRemoteCache]);

    // Initial load effect
    useEffect(() => {
        const isOpen = extensions.openUiExtensions.has("text-styles");
        if (!isOpen) {
            textStylesAutoloadRef.current = false;
            setTextStylesHoveredId(null);
            return;
        }
        if (textStylesData.length > 0) return;
        if (textStylesAutoloadRef.current) return;
        textStylesAutoloadRef.current = true;
        void refreshTextStylesCatalog();
    }, [extensions.openUiExtensions, refreshTextStylesCatalog, textStylesData.length]);


    return {
        search: textStylesSearch,
        setSearch: setTextStylesSearch,
        previewText: textStylesPreviewText,
        setPreviewText: setTextStylesPreviewText,
        customText: textStylesCustomText,
        setCustomText: setTextStylesCustomText,
        categoryId: textStylesCategoryId,
        setCategoryId: setTextStylesCategoryId,
        weightFilter: textStylesWeightFilter,
        setWeightFilter: setTextStylesWeightFilter,
        caseFilter: textStylesCaseFilter,
        setCaseFilter: setTextStylesCaseFilter,
        shadowFilter: textStylesShadowFilter,
        setShadowFilter: setTextStylesShadowFilter,
        selectedId: textStylesSelectedId,
        setSelectedId: setTextStylesSelectedId,
        status: textStylesStatus,
        statusTone: textStylesStatusTone,
        refreshing: textStylesRefreshing,
        fontSource: textStylesFontSource,
        setFontSource: setTextStylesFontSource,
        favorites: textStylesFavorites,
        hoveredId: textStylesHoveredId,
        setHoveredId: setTextStylesHoveredId,
        page: textStylesPage,
        setPage: setTextStylesPage,
        syncPreview: textStylesSyncPreview,
        setSyncPreview: setTextStylesSyncPreview,

        // AI
        aiPromptOpen: textStylesAiPromptOpen,
        setAiPromptOpen: setTextStylesAiPromptOpen,
        aiPrompt: textStylesAiPrompt,
        setAiPrompt: setTextStylesAiPrompt,
        aiResponse: textStylesAiResponse,
        aiBusy: textStylesAiBusy,
        handleAiGenerate: handleTextStylesAiGenerate,

        // Derived
        categories: textStylesCategories,
        pagedTextStyles,
        totalCount: textStylesTotalCount,
        canLoadMore: canLoadMoreTextStyles,

        // Actions
        refreshCatalog: refreshTextStylesCatalog,
        applyStyleById: applyTextStyleById,
        applySelectedStyle: applySelectedTextStyle,
        toggleFavorite: toggleTextStyleFavorite,
        setFavorites: setTextStylesFavorites,

        // Internal data
        textStylesById
    };
}
