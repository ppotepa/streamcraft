import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DesignerUiExtension } from "../types/designer.types";
import type { TextStyleCatalogEntry } from "../forms/TextStylesDialog";
import type { CanvasItem } from "../domain/types";
import {
    ensureTextStylesFontFaces,
    filterTextStyles,
    buildTextStylesById,
    buildTextStyleCategories,
    loadGoogleFontsFromExtension
} from "../services/textStylesService";
import { getExtensionGroupId } from "../utils/extensionUtils";

export const useTextStyles = (
    uiExtensions: DesignerUiExtension[],
    selectedItem: CanvasItem | null,
    openUiExtensions: Set<string>,
    refreshExtensions: () => Promise<void>,
    updateItem: (itemId: string, updates: Partial<CanvasItem>) => void
) => {
    const [search, setSearch] = useState("");
    const [previewText, setPreviewText] = useState("The quick brown fox jumps over the lazy dog");
    const [customText, setCustomText] = useState("Sphinx of black quartz, judge my vow.");
    const [categoryId, setCategoryId] = useState("all");
    const [weightFilter, setWeightFilter] = useState("All");
    const [caseFilter, setCaseFilter] = useState("Mixed");
    const [shadowFilter, setShadowFilter] = useState("Any");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [status, setStatus] = useState("");
    const [statusTone, setStatusTone] = useState<"info" | "error" | "success">("info");
    const [refreshing, setRefreshing] = useState(false);
    const [fontSource, setFontSource] = useState("Google Fonts");
    const [favorites, setFavorites] = useState<string[]>([]);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [syncPreview, setSyncPreview] = useState(false);
    const [aiPromptOpen, setAiPromptOpen] = useState(false);
    const [aiPrompt, setAiPrompt] = useState("");
    const [aiResponse, setAiResponse] = useState("AI style generation will appear here.");
    const [aiBusy, setAiBusy] = useState(false);

    const autoloadRef = useRef(false);
    const pageSize = 24;

    const resolveGoogleCategory = useCallback((catId: string) => {
        const normalized = catId.trim().toLowerCase();
        if (normalized === "mono" || normalized === "monospace") return "monospace";
        if (normalized === "editorial" || normalized === "serif") return "serif";
        if (normalized === "retro" || normalized === "neon" || normalized === "display") return "display";
        return "sans-serif";
    }, []);

    const refreshCatalog = useCallback(async () => {
        setRefreshing(true);
        setStatus("Refreshing Google Fonts catalog...");
        setStatusTone("info");
        try {
            await refreshExtensions();
            setStatus("Catalog refreshed.");
            setStatusTone("success");
        } catch (err) {
            setStatus(`Refresh failed: ${String(err)}`);
            setStatusTone("error");
        } finally {
            setRefreshing(false);
        }
    }, [refreshExtensions]);

    const textStylesData = useMemo(() => {
        const extension = uiExtensions.find((ext) => getExtensionGroupId(ext) === "text-styles");
        if (!extension?.data?.styles) return [];
        return extension.data.styles as TextStyleCatalogEntry[];
    }, [uiExtensions]);

    const textStylesRemoteCache = useMemo(() => {
        if (search.trim().length < 2) return null;
        const extension = uiExtensions.find((ext) => getExtensionGroupId(ext) === "text-styles");
        if (!extension?.data?.remote) return null;

        const remote = extension.data.remote as {
            search: string;
            category: string;
            weight: string;
            case: string;
            shadow: string;
            styles: TextStyleCatalogEntry[];
            total: number;
        };

        if (remote.search !== search) return null;
        if (remote.category !== resolveGoogleCategory(categoryId)) return null;
        if (remote.weight !== weightFilter) return null;
        if (remote.case !== caseFilter) return null;
        if (remote.shadow !== shadowFilter) return null;

        return { styles: remote.styles, total: remote.total };
    }, [caseFilter, categoryId, resolveGoogleCategory, search, shadowFilter, uiExtensions, weightFilter]);

    const baseStyles = useMemo(() => {
        if (search.trim().length >= 2 && textStylesRemoteCache) {
            return textStylesRemoteCache.styles;
        }
        return textStylesData;
    }, [search, textStylesData, textStylesRemoteCache]);

    const totalCount = textStylesRemoteCache?.total ?? baseStyles.length;

    const stylesById = useMemo(() => {
        return buildTextStylesById(textStylesData, textStylesRemoteCache);
    }, [textStylesData, textStylesRemoteCache]);

    const categories = useMemo(() => {
        return buildTextStyleCategories(baseStyles);
    }, [baseStyles]);

    useEffect(() => {
        if (categories.length === 0) return;
        if (!categoryId || !categories.some((cat) => cat.id === categoryId)) {
            setCategoryId("all");
        }
    }, [categories, categoryId]);

    const filteredStyles = useMemo(() => {
        return filterTextStyles(baseStyles, search, categoryId, weightFilter, caseFilter, shadowFilter);
    }, [baseStyles, search, categoryId, weightFilter, caseFilter, shadowFilter]);

    useEffect(() => {
        setPage(1);
    }, [categoryId, caseFilter, search, shadowFilter, weightFilter]);

    const pagedStyles = useMemo(() => {
        return filteredStyles.slice(0, page * pageSize);
    }, [filteredStyles, page, pageSize]);

    const canLoadMore = pagedStyles.length < filteredStyles.length || pagedStyles.length < totalCount;

    useEffect(() => {
        const candidateStyles = [...pagedStyles];
        if (selectedId) {
            const selectedStyle = stylesById.get(selectedId);
            if (selectedStyle) candidateStyles.push(selectedStyle);
        }
        if (hoveredId) {
            const hoveredStyle = stylesById.get(hoveredId);
            if (hoveredStyle) candidateStyles.push(hoveredStyle);
        }
        ensureTextStylesFontFaces(candidateStyles);
    }, [hoveredId, pagedStyles, selectedId, stylesById]);

    useEffect(() => {
        if (filteredStyles.length === 0) {
            setSelectedId(null);
            return;
        }
        if (!selectedId || !filteredStyles.some((style) => style.id === selectedId)) {
            setSelectedId(filteredStyles[0].id);
        }
    }, [filteredStyles, selectedId]);

    const applyTextStyle = useCallback((style: TextStyleCatalogEntry) => {
        if (!selectedItem || selectedItem.type !== "text") return;

        const nextFontStyle = style.fontStyle === "italic" || style.fontStyle === "normal"
            ? style.fontStyle
            : undefined;
        const nextTransform = style.textTransform === "uppercase" || style.textTransform === "lowercase" || style.textTransform === "none"
            ? style.textTransform
            : undefined;

        updateItem(selectedItem.id, {
            fontFamily: style.fontFamily ?? selectedItem.fontFamily,
            fontSize: style.fontSize ?? selectedItem.fontSize,
            fontWeight: style.fontWeight ?? selectedItem.fontWeight,
            fontStyle: nextFontStyle ?? selectedItem.fontStyle,
            textColor: style.textColor ?? selectedItem.textColor,
            textTransform: nextTransform ?? selectedItem.textTransform,
            letterSpacing: style.letterSpacing ?? selectedItem.letterSpacing,
            textShadowX: style.textShadowX ?? selectedItem.textShadowX,
            textShadowY: style.textShadowY ?? selectedItem.textShadowY,
            textShadowBlur: style.textShadowBlur ?? selectedItem.textShadowBlur,
            textShadowColor: style.textShadowColor ?? selectedItem.textShadowColor
        });
    }, [selectedItem, updateItem]);

    const applyTextStyleById = useCallback((styleId: string) => {
        const style = stylesById.get(styleId);
        if (!style) return;
        applyTextStyle(style);
        setStatus(`Applied ${style.name ?? style.fontFamily ?? style.id}.`);
        setStatusTone("success");
    }, [applyTextStyle, stylesById]);

    const applySelectedTextStyle = useCallback(() => {
        if (!selectedId) return;
        applyTextStyleById(selectedId);
    }, [applyTextStyleById, selectedId]);

    const toggleFavorite = useCallback((styleId: string) => {
        setFavorites((prev) => {
            if (prev.includes(styleId)) {
                return prev.filter((entry) => entry !== styleId);
            }
            return [...prev, styleId];
        });
    }, []);

    const handleAiGenerate = useCallback(() => {
        if (aiBusy) return;
        setAiBusy(true);
        setAiResponse("Generating placeholder style suggestion...");
        window.setTimeout(() => {
            setAiResponse("Placeholder output: A bold display style with cyan glow, 700 weight, slight letter spacing. (AI wiring TBD)");
            setAiBusy(false);
        }, 900);
    }, [aiBusy]);

    // Auto-load catalog when opened
    useEffect(() => {
        const isOpen = openUiExtensions.has("text-styles");
        if (!isOpen) {
            autoloadRef.current = false;
            setHoveredId(null);
            return;
        }
        if (textStylesData.length > 0) return;
        if (autoloadRef.current) return;
        autoloadRef.current = true;
        void refreshCatalog();
    }, [openUiExtensions, refreshCatalog, textStylesData.length]);

    // Remote search status updates
    useEffect(() => {
        const isOpen = openUiExtensions.has("text-styles");
        const query = search.trim();

        if (!isOpen) {
            setStatus("");
            setStatusTone("info");
            return;
        }

        if (query.length < 2) {
            if (!refreshing) {
                setStatus("");
                setStatusTone("info");
            }
            return;
        }

        if (textStylesRemoteCache && textStylesRemoteCache.styles.length >= page * pageSize) {
            setStatus(`${textStylesRemoteCache.styles.length} fonts cached.`);
            setStatusTone("success");
            return;
        }

        // Need to fetch remote
        setStatus("Searching Google Fonts...");
        setStatusTone("info");
    }, [openUiExtensions, page, pageSize, refreshing, search, textStylesRemoteCache]);

    return {
        // State
        search,
        previewText,
        customText,
        categoryId,
        weightFilter,
        caseFilter,
        shadowFilter,
        selectedId,
        status,
        statusTone,
        refreshing,
        fontSource,
        favorites,
        hoveredId,
        page,
        syncPreview,
        aiPromptOpen,
        aiPrompt,
        aiResponse,
        aiBusy,

        // Setters
        setSearch,
        setPreviewText,
        setCustomText,
        setCategoryId,
        setWeightFilter,
        setCaseFilter,
        setShadowFilter,
        setSelectedId,
        setFontSource,
        setHoveredId,
        setPage,
        setSyncPreview,
        setAiPromptOpen,
        setAiPrompt,

        // Computed
        categories,
        pagedStyles,
        totalCount,
        canLoadMore,
        stylesById,

        // Actions
        refreshCatalog,
        applyTextStyle,
        applyTextStyleById,
        applySelectedTextStyle,
        toggleFavorite,
        handleAiGenerate
    };
};

