import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormContainer } from "@streamcraft/forms/FormContainer";
import { element, type FormNode } from "@streamcraft/forms/core";
import { WF } from "@streamcraft/forms";
import { UiText } from "./uiText";
import { createLayersToolboxDialog } from "./designer/ui/dialogs";
import { buildDataKey, type ApiFieldSpec, type ApiResponseMetadata, type DataSource, type DataSourceCategory, type TestResponse, type CanvasItem } from "./designer/domain/types";
import { usePlaygroundHotkeys } from "./designer/ui/usePlaygroundHotkeys";
import { buildCanvasSurfaceNode } from "./designer/ui/CanvasSurface";
import { buildCanvasItems } from "./designer/ui/CanvasItems";
import { buildDockPanelNode } from "./designer/ui/DockPanel";
import { buildMenuNode } from "./designer/ui/MenuBar";
import { buildStatusBarNode } from "./designer/ui/StatusBar";
import { buildToolboxNode } from "./designer/ui/ToolboxPanel";
import { createCanvasItem } from "./designer/domain/itemCommands";
import { createLayer, reassignItemsToLayer } from "./designer/domain/layerCommands";
import { copyToClipboard, pasteFromClipboard, type ClipboardState } from "./designer/domain/clipboard";
import { canRedo, canUndo, pushHistory as pushHistoryReducer } from "./designer/domain/historyReducer";
import { buildFieldSpecs, formatCategoryLabel, parsePathTokens } from "./designer/services/dataSourceService";
import { loadAutosave as loadAutosaveService, saveAutosave as saveAutosaveService, saveLayout as saveLayoutService } from "./designer/services/autosaveService";
import { useCanvasInteractions } from "./designer/ui/useCanvasInteractions";
import { createOverlayVideoPreviewDialog, type OverlayVideoItem } from "./designer/forms/OverlayVideoPreviewDialog";
import { DataSourceExplorer } from "./designer/forms/DataSourceExplorer";
import {
    createAutosaveOverlay,
    createLoadingOverlay,
    createPropertiesSummaryDialog,
    createScheduleSetupDialog,
    createSchedulerOverviewDialog,
    TextStyleEditor,
    type PropertiesSummaryTextDetails
} from "./designer/forms";
import { createTextStylesDialog, type TextStyleCatalogEntry } from "./designer/forms/TextStylesDialog";
import { createTextStylesAiPromptDialog } from "./designer/forms/TextStylesAiPromptDialog";
import { createDesignerSettingsDialog } from "./designer/forms/DesignerSettingsDialog";
import { createThemeViewerDialog } from "./designer/forms/ThemeViewerDialog";
import { buildPlayground2Designer } from "./Playground2.Designer";
import { themes } from "../themeRegistry";
import { loadSettings, loadThemeOverrides, setTheme, setThemeMode, setThemeOverrides, clearThemeOverrides, type ThemeMode } from "../themeService";
import { fetchAiStatus, generateAiTheme, type AiThemeResult } from "./designer/services/aiService";

type DesignerUiExtension = {
    id: string;
    group?: string;
    title?: string;
    targets?: string[];
    order?: number;
    form?: FormNode | FormNode[] | null;
    data?: Record<string, any>;
};

type GoogleFontFamily = {
    family: string;
    category: string;
    variants: string[];
    subsets: string[];
    version?: string;
    lastModified?: string;
    popularityRank?: number;
    files?: Record<string, string>;
};

const DOCK_STORAGE_KEY = "sc:designer:dockLayout:v1";

type DockPrefs = {
    version: 1;
    isDockCollapsed: boolean;
    dockedWindows: string[];
    showLayersToolbox: boolean;
    showOverlayVideoPreview: boolean;
    showDataSourceExplorer: boolean;
    showTextStyleEditor: boolean;
    showSchedulerOverview: boolean;
};

const readDockPrefs = (): DockPrefs | null => {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(DOCK_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<DockPrefs> | null;
        if (!parsed || parsed.version !== 1) return null;
        return {
            version: 1,
            isDockCollapsed: Boolean(parsed.isDockCollapsed),
            dockedWindows: Array.isArray(parsed.dockedWindows) ? parsed.dockedWindows.filter(Boolean) : [],
            showLayersToolbox: parsed.showLayersToolbox !== false,
            showOverlayVideoPreview: Boolean(parsed.showOverlayVideoPreview),
            showDataSourceExplorer: Boolean(parsed.showDataSourceExplorer),
            showTextStyleEditor: Boolean(parsed.showTextStyleEditor),
            showSchedulerOverview: Boolean(parsed.showSchedulerOverview)
        };
    } catch {
        return null;
    }
};

export const Playground2: React.FC = () => {
    const dockPrefs = readDockPrefs();
    const [status, setStatus] = useState<string>(UiText.playground2.statusIdle);
    const [activeTool, setActiveTool] = useState<string | null>(null);
    const [items, setItems] = useState<CanvasItem[]>([]);
    const [layers, setLayers] = useState<Array<{ id: string; name: string }>>(() => [
        { id: "layer-1", name: "Layer 1" }
    ]);
    const [activeLayerId, setActiveLayerId] = useState<string>("layer-1");
    const [sources, setSources] = useState<DataSource[]>([]);
    const [uiExtensions, setUiExtensions] = useState<DesignerUiExtension[]>([]);
    const [openUiExtensions, setOpenUiExtensions] = useState<Set<string>>(new Set());
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
    const [textStylesAiPromptOpen, setTextStylesAiPromptOpen] = useState(false);
    const [textStylesAiPrompt, setTextStylesAiPrompt] = useState("");
    const [textStylesAiResponse, setTextStylesAiResponse] = useState("AI style generation will appear here.");
    const [textStylesAiBusy, setTextStylesAiBusy] = useState(false);
    const [previews, setPreviews] = useState<Map<string, ApiResponseMetadata>>(new Map());
    const [testResponses, setTestResponses] = useState<Map<string, TestResponse>>(new Map());
    const [liveData, setLiveData] = useState<Map<string, unknown>>(new Map());
    const [virtualState, setVirtualState] = useState<Record<string, unknown>>({});
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showTextStyleEditor, setShowTextStyleEditor] = useState(dockPrefs?.showTextStyleEditor ?? false);
    const [showScheduleSetup, setShowScheduleSetup] = useState(false);
    const [scheduleTargetId, setScheduleTargetId] = useState<string | null>(null);
    const [showSchedulerOverview, setShowSchedulerOverview] = useState(dockPrefs?.showSchedulerOverview ?? false);
    const [showDesignerSettings, setShowDesignerSettings] = useState(false);
    const [showThemeViewer, setShowThemeViewer] = useState(false);
    const [themeSelection, setThemeSelection] = useState(() => {
        const settings = loadSettings();
        const index = themes.findIndex((theme) => theme.id === settings.themeId);
        return index >= 0 ? index : 0;
    });
    const [themeModeSelection, setThemeModeSelection] = useState<ThemeMode>(() => loadSettings().themeMode);
    const [themeAiPrompt, setThemeAiPrompt] = useState("");
    const [themeAiResponse, setThemeAiResponse] = useState("AI theme output will appear here.");
    const [themeAiBusy, setThemeAiBusy] = useState(false);
    const [themeAiStatus, setThemeAiStatus] = useState(() => loadThemeOverrides()?.name ? "AI theme loaded from storage." : "AI status: not checked.");
    const [themeAiThemeName, setThemeAiThemeName] = useState(() => loadThemeOverrides()?.name ?? "None");
    const [themeAiThemeDescription, setThemeAiThemeDescription] = useState(() => loadThemeOverrides()?.description ?? "");
    const [themeAiResult, setThemeAiResult] = useState<AiThemeResult | null>(null);
    const [scheduleEpoch, setScheduleEpoch] = useState<number>(() => Date.now());
    const [scheduleRuns, setScheduleRuns] = useState<Map<string, number>>(new Map());
    const [itemsInLayerExpanded, setItemsInLayerExpanded] = useState(true);
    const [showDataSourceExplorer, setShowDataSourceExplorer] = useState(dockPrefs?.showDataSourceExplorer ?? false);
    const [showLayersToolbox, setShowLayersToolbox] = useState(dockPrefs?.showLayersToolbox ?? true); // Show by default
    const [showOverlayVideoPreview, setShowOverlayVideoPreview] = useState(dockPrefs?.showOverlayVideoPreview ?? false);
    const [isDockCollapsed, setIsDockCollapsed] = useState(dockPrefs?.isDockCollapsed ?? false);
    const [dockedWindows, setDockedWindows] = useState<string[]>(dockPrefs?.dockedWindows ?? []);
    const [isDockPreview, setIsDockPreview] = useState(false);
    const [overlayName, setOverlayName] = useState<string>("");
    const [lastPersistedJson, setLastPersistedJson] = useState<string>("");
    const [isSaving, setIsSaving] = useState(false);
    const [isAutoSaving, setIsAutoSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [lastSavedUtc, setLastSavedUtc] = useState<Date | null>(null);
    const [isTransforming, setIsTransforming] = useState(false);
    const [loadingState, setLoadingState] = useState<{ active: boolean; step: string; progress: number; log: string[] }>({
        active: true,
        step: "Starting Designer...",
        progress: 0,
        log: ["Starting Designer..."]
    });
    const [canvasScale, setCanvasScale] = useState(1);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
    const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>("");
    const [imageDisplaySrc, setImageDisplaySrc] = useState<Record<string, string>>({});
    const [videoPlaylist, setVideoPlaylist] = useState<OverlayVideoItem[]>([]);
    const [videoSelectedId, setVideoSelectedId] = useState<string | null>(null);
    const [currentVideoUrl, setCurrentVideoUrl] = useState<string>("");
    const [videoStatus, setVideoStatus] = useState<string>("Ready.");
    const [videoLoading, setVideoLoading] = useState(false);
    const [playlistCollapsed, setPlaylistCollapsed] = useState(false);
    const [videoSearchQuery, setVideoSearchQuery] = useState<string>("");
    const [videoSearchResults, setVideoSearchResults] = useState<OverlayVideoItem[]>([]);
    const [videoSearchTotal, setVideoSearchTotal] = useState<number>(0);
    const [overlayPreviewVisible, setOverlayPreviewVisible] = useState(true);
    const [overlayPreviewGrid, setOverlayPreviewGrid] = useState(true);
    const [selectionBox, setSelectionBox] = useState<{ active: boolean; x: number; y: number; width: number; height: number; addMode: boolean }>({
        active: false,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        addMode: false
    });
    const [placementBox, setPlacementBox] = useState<{ active: boolean; x: number; y: number; width: number; height: number; type: string | null }>({
        active: false,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        type: null
    });
    const dragStart = useRef<{ x: number; y: number; canvasRect: DOMRect } | null>(null);
    const placementStart = useRef<{ x: number; y: number; canvasRect: DOMRect } | null>(null);
    const panRef = useRef<{
        startX: number;
        startY: number;
        scrollLeft: number;
        scrollTop: number;
        container: HTMLDivElement;
    } | null>(null);
    const clipboardRef = useRef<ClipboardState | null>(null);
    const historyRef = useRef<Array<{ items: typeof items; selectedIds: string[] }>>([]);
    const historyIndexRef = useRef(-1);
    const isApplyingHistoryRef = useRef(false);
    const textStylesAutoloadRef = useRef(false);
    const textStylesPageSize = 24;
    const transformHoldUntil = useRef(0);
    const scheduleEpochRef = useRef<number>(scheduleEpoch);
    const scheduleTickRef = useRef<Map<string, { intervalMs: number; tick: number }>>(new Map());
    const scheduleRunningRef = useRef<Set<string>>(new Set());
    const autosaveTimerRef = useRef<number | null>(null);
    const nameCounters = useRef<Record<string, number>>({});
    const initialProjectId = useMemo(() => {
        const queryValue = typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("project")
            : null;
        return (queryValue && queryValue.trim().length > 0)
            ? queryValue.trim()
            : Math.random().toString(36).slice(2, 11);
    }, []);
    const autosaveProjectIdRef = useRef<string>(initialProjectId);
    const transformRef = useRef<{
        type: "move" | "resize";
        itemId: string;
        handle?: "nw" | "ne" | "sw" | "se";
        startX: number;
        startY: number;
        originX: number;
        originY: number;
        originW: number;
        originH: number;
    } | null>(null);

    const serializeLayout = useCallback(() => {
        return JSON.stringify({
            version: 2,
            overlayName: overlayName || null,
            layers,
            activeLayerId,
            items,
            textStyles: {
                search: textStylesSearch,
                previewText: textStylesPreviewText,
                customText: textStylesCustomText,
                categoryId: textStylesCategoryId,
                weightFilter: textStylesWeightFilter,
                caseFilter: textStylesCaseFilter,
                shadowFilter: textStylesShadowFilter,
                selectedId: textStylesSelectedId,
                fontSource: textStylesFontSource,
                favorites: textStylesFavorites,
                syncPreview: textStylesSyncPreview
            }
        });
    }, [activeLayerId, items, layers, overlayName, textStylesCaseFilter, textStylesCategoryId, textStylesCustomText, textStylesFavorites, textStylesFontSource, textStylesPreviewText, textStylesSearch, textStylesSelectedId, textStylesShadowFilter, textStylesSyncPreview, textStylesWeightFilter]);

    const applyLayoutJson = useCallback((json: string) => {
        try {
            const parsed = JSON.parse(json) as {
                items?: typeof items;
                overlayName?: string | null;
                layers?: Array<{ id: string; name: string }>;
                activeLayerId?: string | null;
                textStyles?: {
                    search?: string;
                    previewText?: string;
                    customText?: string;
                    categoryId?: string;
                    weightFilter?: string;
                    caseFilter?: string;
                    shadowFilter?: string;
                    selectedId?: string | null;
                    fontSource?: string;
                    favorites?: string[];
                    syncPreview?: boolean;
                };
            };
            if (parsed?.overlayName) {
                setOverlayName(parsed.overlayName);
            }

            const nextLayers = Array.isArray(parsed?.layers) && parsed.layers.length > 0
                ? parsed.layers
                : [{ id: "layer-1", name: "Layer 1" }];
            const fallbackLayerId = nextLayers[0]?.id ?? "layer-1";
            const nextActiveLayerId = parsed?.activeLayerId && nextLayers.some(layer => layer.id === parsed.activeLayerId)
                ? parsed.activeLayerId
                : fallbackLayerId;

            setLayers(nextLayers);
            setActiveLayerId(nextActiveLayerId);

            if (parsed?.textStyles) {
                if (typeof parsed.textStyles.search === "string") {
                    setTextStylesSearch(parsed.textStyles.search);
                }
                if (typeof parsed.textStyles.previewText === "string") {
                    setTextStylesPreviewText(parsed.textStyles.previewText);
                }
                if (typeof parsed.textStyles.customText === "string") {
                    setTextStylesCustomText(parsed.textStyles.customText);
                }
                if (typeof parsed.textStyles.categoryId === "string") {
                    setTextStylesCategoryId(parsed.textStyles.categoryId);
                }
                if (typeof parsed.textStyles.weightFilter === "string") {
                    setTextStylesWeightFilter(parsed.textStyles.weightFilter);
                }
                if (typeof parsed.textStyles.caseFilter === "string") {
                    setTextStylesCaseFilter(parsed.textStyles.caseFilter);
                }
                if (typeof parsed.textStyles.shadowFilter === "string") {
                    setTextStylesShadowFilter(parsed.textStyles.shadowFilter);
                }
                if (typeof parsed.textStyles.selectedId === "string" || parsed.textStyles.selectedId === null) {
                    setTextStylesSelectedId(parsed.textStyles.selectedId ?? null);
                }
                if (typeof parsed.textStyles.fontSource === "string") {
                    setTextStylesFontSource(parsed.textStyles.fontSource);
                }
                if (Array.isArray(parsed.textStyles.favorites)) {
                    setTextStylesFavorites(parsed.textStyles.favorites.filter((entry) => typeof entry === "string"));
                }
                if (typeof parsed.textStyles.syncPreview === "boolean") {
                    setTextStylesSyncPreview(parsed.textStyles.syncPreview);
                }
            }

            if (Array.isArray(parsed?.items)) {
                const nextItems = parsed.items.map((item) => {
                    const normalized = item.layerId ? { ...item } : { ...item, layerId: fallbackLayerId };
                    if (normalized.scheduleIntervalMs === undefined) {
                        const legacyInterval = typeof normalized.workerIntervalMs === "number" ? normalized.workerIntervalMs : 0;
                        normalized.scheduleIntervalMs = normalized.workerEnabled ? legacyInterval : 0;
                    }
                    return normalized;
                });
                setItems(nextItems as typeof items);
                setSelectedIds([]);
            }
            setLastPersistedJson(json);
        } catch (err) {
            console.warn("Failed to parse layout json", err);
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const payload: DockPrefs = {
            version: 1,
            isDockCollapsed,
            dockedWindows,
            showLayersToolbox,
            showOverlayVideoPreview,
            showDataSourceExplorer,
            showTextStyleEditor,
            showSchedulerOverview
        };
        try {
            window.localStorage.setItem(DOCK_STORAGE_KEY, JSON.stringify(payload));
        } catch {
            // Ignore storage failures (private mode / quota).
        }
    }, [dockedWindows, isDockCollapsed, showDataSourceExplorer, showLayersToolbox, showOverlayVideoPreview, showSchedulerOverview, showTextStyleEditor]);

    const loadVideoPlaylist = useCallback(async () => {
        setVideoLoading(true);
        setVideoStatus("Loading cached videos...");
        try {
            const res = await fetch("/localmedia/videos", { cache: "no-store" });
            if (!res.ok) throw new Error(await res.text());
            const data = (await res.json()) as OverlayVideoItem[];
            const items = Array.isArray(data)
                ? data.map(item => ({ ...item, isCached: true }))
                : [];
            setVideoPlaylist(items);
            if (items.length > 0) {
                const first = items[0];
                setVideoSelectedId(first.id);
                if (first.localUrl) {
                    setCurrentVideoUrl(first.localUrl);
                }
                setVideoStatus("Loaded cached videos.");
            } else {
                setVideoStatus("No cached videos yet.");
            }
        } catch (err) {
            setVideoStatus(`Failed to load playlist: ${String(err)}`);
        } finally {
            setVideoLoading(false);
        }
    }, []);

    const activeVideoList = useMemo(
        () => (videoSearchQuery.trim().length > 0 ? videoSearchResults : videoPlaylist),
        [videoPlaylist, videoSearchQuery, videoSearchResults]
    );

    const selectVideo = useCallback((videoId: string) => {
        setVideoSelectedId(videoId);
        const item = activeVideoList.find((video) => video.id === videoId);
        if (item?.localUrl || item?.downloadUrl) {
            setCurrentVideoUrl(item.localUrl ?? item.downloadUrl ?? "");
        }
    }, [activeVideoList]);

    const fetchRandomVideo = useCallback(async () => {
        setVideoLoading(true);
        setVideoStatus("Fetching random video...");
        try {
            const res = await fetch(`/localmedia/video/random?ts=${Date.now()}`, { cache: "no-store" });
            if (!res.ok) throw new Error(await res.text());
            const payload = (await res.json()) as OverlayVideoItem;
            if (!payload?.id || !payload?.localUrl) {
                throw new Error("Random video missing id/localUrl.");
            }
            const cachedPayload = { ...payload, isCached: true };
            setCurrentVideoUrl(cachedPayload.localUrl ?? "");
            setVideoSelectedId(cachedPayload.id);
            setVideoPlaylist((prev) => {
                if (prev.some((video) => video.id === cachedPayload.id)) return prev;
                return [cachedPayload, ...prev];
            });
            setVideoStatus("Random video loaded.");
        } catch (err) {
            setVideoStatus(`Random fetch failed: ${String(err)}`);
        } finally {
            setVideoLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!showOverlayVideoPreview) return;
        const query = videoSearchQuery.trim();
        if (query.length === 0) {
            setVideoSearchResults([]);
            setVideoSearchTotal(0);
            return;
        }

        let cancelled = false;
        const timer = window.setTimeout(async () => {
            setVideoLoading(true);
            setVideoStatus("Searching Pexels...");
            try {
                const res = await fetch(`/localmedia/videos/search?query=${encodeURIComponent(query)}`, { cache: "no-store" });
                if (!res.ok) throw new Error(await res.text());
                const payload = await res.json();
                const items = Array.isArray(payload?.videos) ? payload.videos : [];
                if (cancelled) return;
                setVideoSearchResults(items);
                setVideoSearchTotal(typeof payload?.totalResults === "number" ? payload.totalResults : items.length);
                if (items.length > 0) {
                    setVideoSelectedId(items[0].id);
                    setCurrentVideoUrl(items[0].localUrl ?? items[0].downloadUrl ?? "");
                    setVideoStatus("Search results ready.");
                } else {
                    setVideoStatus("No results found.");
                }
            } catch (err) {
                if (!cancelled) {
                    setVideoStatus(`Search failed: ${String(err)}`);
                    setVideoSearchResults([]);
                    setVideoSearchTotal(0);
                }
            } finally {
                if (!cancelled) {
                    setVideoLoading(false);
                }
            }
        }, 300);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [showOverlayVideoPreview, videoSearchQuery]);

    useEffect(() => {
        if (videoSearchQuery.trim().length > 0) return;
        if (videoPlaylist.length === 0) return;
        const exists = videoPlaylist.some(video => video.id === videoSelectedId);
        if (!exists) {
            const first = videoPlaylist[0];
            setVideoSelectedId(first.id);
            setCurrentVideoUrl(first.localUrl ?? "");
        }
    }, [videoPlaylist, videoSearchQuery, videoSelectedId]);

    const clearOverlayVideoCache = useCallback(async () => {
        const ok = confirm("Clear cached Pexels media? This will remove stored images and videos.");
        if (!ok) return;
        setVideoLoading(true);
        setVideoStatus("Clearing media cache...");
        try {
            const res = await fetch("/localmedia/cache/clear", { method: "POST" });
            if (!res.ok) throw new Error(await res.text());
            setVideoPlaylist([]);
            setVideoSelectedId(null);
            setCurrentVideoUrl("");
            setVideoSearchResults([]);
            setVideoSearchTotal(0);
            setVideoStatus("Cache cleared. Fetch a random video to repopulate.");
        } catch (err) {
            setVideoStatus(`Cache clear failed: ${String(err)}`);
        } finally {
            setVideoLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!showOverlayVideoPreview) return;
        void loadVideoPlaylist();
    }, [loadVideoPlaylist, showOverlayVideoPreview]);

    const loadAutosave = useCallback(async () => {
        const json = await loadAutosaveService(autosaveProjectIdRef.current);
        if (!json) return;
        applyLayoutJson(json);
    }, [applyLayoutJson]);

    const refreshSources = useCallback(async () => {
        const res = await fetch("/designer/sources", { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as DataSource[];
        setSources(data || []);
    }, []);

    const refreshExtensions = useCallback(async () => {
        const res = await fetch("/designer/extensions", { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as DesignerUiExtension[];
        setUiExtensions(Array.isArray(data) ? data : []);
    }, []);
    const refreshTextStylesCatalog = useCallback(async () => {
        setTextStylesRefreshing(true);
        setTextStylesStatus("Refreshing Google Fonts catalog...");
        setTextStylesStatusTone("info");
        try {
            const res = await fetch("/textstyles/fonts/catalog/refresh", { method: "POST" });
            if (!res.ok) throw new Error(await res.text());
            await refreshExtensions();
            setTextStylesStatus("Catalog refreshed.");
            setTextStylesStatusTone("success");
        } catch (err) {
            setTextStylesStatus(`Refresh failed: ${String(err)}`);
            setTextStylesStatusTone("error");
        } finally {
            setTextStylesRefreshing(false);
        }
    }, [refreshExtensions]);
    const resolveGoogleCategory = useCallback((categoryId: string) => {
        const normalized = categoryId.trim().toLowerCase();
        if (normalized === "mono" || normalized === "monospace") return "monospace";
        if (normalized === "editorial" || normalized === "serif") return "serif";
        if (normalized === "retro" || normalized === "neon" || normalized === "display") return "display";
        return "sans-serif";
    }, []);

    const isSystemSource = useCallback((source?: DataSource | null) => {
        if (!source) return false;
        const kind = source.kind ?? "";
        return kind.startsWith("system") || source.id.startsWith("system-");
    }, []);

    useEffect(() => {
        let cancelled = false;
        const minDisplayMs = 2000;

        const pushLoading = (step: string, progress: number) => {
            if (cancelled) return;
            setLoadingState((prev) => {
                const log = prev.log.includes(step) ? prev.log : [...prev.log, step];
                return { ...prev, step, progress, log };
            });
        };

        const loadInitial = async () => {
            const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
            setLoadingState({
                active: true,
                step: "Starting Designer...",
                progress: 0,
                log: ["Starting Designer..."]
            });

            pushLoading("Reading data sources...", 25);
            try {
                await refreshSources();
            } catch (err) {
                console.warn("Failed to load sources", err);
            }

            pushLoading("Loading UI extensions...", 40);
            try {
                await refreshExtensions();
            } catch (err) {
                console.warn("Failed to load extensions", err);
            }

            pushLoading("Loading autosave...", 65);
            try {
                await loadAutosave();
            } catch (err) {
                console.warn("Failed to load autosave", err);
            }

            pushLoading("Preparing canvas...", 90);
            await new Promise((resolve) => setTimeout(resolve, 150));

            pushLoading("Ready", 100);
            const elapsed = (typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt;
            const remaining = Math.max(0, minDisplayMs - elapsed);
            setTimeout(() => {
                if (!cancelled) {
                    setLoadingState((prev) => ({ ...prev, active: false }));
                }
            }, remaining);
        };

        loadInitial();

        return () => {
            cancelled = true;
        };
    }, [loadAutosave, refreshExtensions, refreshSources]);

    const ensurePreview = useCallback(
        async (sourceId: string) => {
            if (!sourceId || previews.has(sourceId)) return;
            const source = sources.find((candidate) => candidate.id === sourceId);
            if (isSystemSource(source)) return;
            try {
                const res = await fetch(`/designer/preview?sourceId=${encodeURIComponent(sourceId)}`, { cache: "no-store" });
                if (!res.ok) throw new Error(await res.text());
                const data = await res.json();
                setPreviews((prev) => {
                    const next = new Map(prev);
                    next.set(sourceId, data);
                    return next;
                });
            } catch (err) {
                console.warn("Failed to load preview", err);
            }
        },
        [isSystemSource, previews, sources]
    );

    const ingestData = useCallback((sourceId: string, endpointPath: string, data: unknown) => {
        const key = buildDataKey(sourceId, endpointPath);
        if (!key) return;
        setVirtualState((prev) => ({ ...prev, [key]: data }));
    }, []);

    const runTest = useCallback(
        async (sourceId: string, endpointPath: string) => {
            if (!sourceId || !endpointPath) return null;
            const key = buildDataKey(sourceId, endpointPath);

            try {
                const res = await fetch(
                    `/public-api-sources/test?sourceId=${encodeURIComponent(sourceId)}&endpointPath=${encodeURIComponent(endpointPath)}`,
                    { cache: "no-store" }
                );
                let payload: TestResponse;
                try {
                    payload = (await res.json()) as TestResponse;
                } catch {
                    payload = { success: res.ok, statusCode: res.status, error: await res.text() };
                }
                if (payload?.data !== undefined) {
                    ingestData(sourceId, endpointPath, payload.data as unknown);
                } else if (payload?.response !== undefined) {
                    ingestData(sourceId, endpointPath, payload.response as unknown);
                }
                setTestResponses((prev) => {
                    const next = new Map(prev);
                    next.set(key, payload);
                    return next;
                });
                return payload;
            } catch (err) {
                const payload: TestResponse = { success: false, statusCode: 0, error: String(err) };
                setTestResponses((prev) => {
                    const next = new Map(prev);
                    next.set(key, payload);
                    return next;
                });
                return payload;
            }
        },
        [ingestData]
    );

    const isSchedulableItem = useCallback((item: CanvasItem) => {
        if (!item.sourceId || !item.fieldPath) return false;
        const source = sources.find((candidate) => candidate.id === item.sourceId);
        if (!source || isSystemSource(source)) return false;
        if (!item.endpointPath) return false;
        const intervalMs = item.scheduleIntervalMs ?? 0;
        return intervalMs > 0;
    }, [isSystemSource, sources]);

    useEffect(() => {
        scheduleEpochRef.current = scheduleEpoch;
    }, [scheduleEpoch]);

    useEffect(() => {
        const timer = window.setInterval(() => {
            const now = Date.now();
            if (isTransforming || transformHoldUntil.current > now) return;
            const epoch = scheduleEpochRef.current;

            items.forEach((item) => {
                if (!isSchedulableItem(item)) return;
                const intervalMs = Math.max(250, item.scheduleIntervalMs ?? 0);
                const tick = Math.floor((now - epoch) / intervalMs);
                const lastEntry = scheduleTickRef.current.get(item.id);
                const lastTick = lastEntry && lastEntry.intervalMs === intervalMs ? lastEntry.tick : -1;
                if (tick <= lastTick) return;
                if (scheduleRunningRef.current.has(item.id)) return;
                scheduleTickRef.current.set(item.id, { intervalMs, tick });
                scheduleRunningRef.current.add(item.id);
                void runTest(item.sourceId ?? "", item.endpointPath ?? "")
                    .finally(() => {
                        scheduleRunningRef.current.delete(item.id);
                    });
                setScheduleRuns((prev) => {
                    const next = new Map(prev);
                    next.set(item.id, now);
                    return next;
                });
            });
        }, 250);

        return () => window.clearInterval(timer);
    }, [isSchedulableItem, isTransforming, items, runTest, transformHoldUntil]);

    const saveAutosave = useCallback(async (json: string) => {
        await saveAutosaveService(json, autosaveProjectIdRef.current);
    }, []);

    const saveLayout = useCallback(async (layoutId: string, json: string) => {
        await saveLayoutService(layoutId, json);
    }, []);

    const handleManualSave = useCallback(async () => {
        const currentJson = serializeLayout();
        let targetName = overlayName;
        if (!targetName) {
            const proposed = window.prompt("Save overlay as:", "My Overlay");
            if (!proposed || !proposed.trim()) {
                return;
            }
            targetName = proposed.trim();
            setOverlayName(targetName);
        }

        setIsSaving(true);
        setSaveError(null);
        try {
            await saveLayout(targetName, currentJson);
            await saveAutosave(currentJson);
            setLastPersistedJson(currentJson);
            setLastSavedUtc(new Date());
        } catch (err) {
            setSaveError(String(err));
        } finally {
            setIsSaving(false);
        }
    }, [overlayName, saveLayout, saveAutosave, serializeLayout]);

    const handleNewLayout = useCallback(() => {
        const hasChanges = serializeLayout() !== lastPersistedJson;
        if (hasChanges) {
            const confirmReset = window.confirm("Discard the current layout and start a new one?");
            if (!confirmReset) return;
        }
        const baseLayer = { id: "layer-1", name: "Layer 1" };
        setLayers([baseLayer]);
        setActiveLayerId(baseLayer.id);
        setItems([]);
        setSelectedIds([]);
        setOverlayName("");
        setLastPersistedJson("");
        setLastSavedUtc(null);
        historyRef.current = [];
        historyIndexRef.current = -1;
    }, [lastPersistedJson, serializeLayout]);


    const updateItem = (itemId: string, updates: Partial<(typeof items)[number]>) => {
        setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item)));
    };

    const resolveFieldValue = (sourceId?: string, endpointPath?: string, fieldPath?: string) => {
        if (!sourceId || !fieldPath) return undefined;
        const source = sources.find((candidate) => candidate.id === sourceId);
        const isSystem = isSystemSource(source);
        const key = isSystem ? sourceId : buildDataKey(sourceId, endpointPath);
        if (!key) return undefined;
        const data = isSystem ? liveData.get(sourceId) : virtualState[key];
        if (!data) return undefined;
        const trimmed = fieldPath.replace(/^response\./, "").replace(/^response/, "").replace(/^\./, "");
        const tokens = parsePathTokens(trimmed);
        let current: any = data;
        for (const token of tokens) {
            if (current === undefined || current === null) break;
            current = (current as any)[token as any];
        }
        return current;
    };

    const getBindingSummary = (item?: (typeof items)[number] | null) => {
        if (!item?.sourceId) return "Not bound";
        const source = sources.find((candidate) => candidate.id === item.sourceId);
        const sourceLabel = source?.name ?? item.sourceId;
        if (isSystemSource(source)) {
            if (!item.fieldPath) return `${sourceLabel}`;
            return `${sourceLabel} → ${item.fieldPath}`;
        }
        if (!item.endpointPath) return `${sourceLabel}`;
        if (!item.fieldPath) return `${sourceLabel} → ${item.endpointPath}`;
        return `${sourceLabel} → ${item.endpointPath} → ${item.fieldPath}`;
    };

    const getFieldDepth = (path: string) => {
        const normalized = path.replace(/\[(\d+)\]/g, ".$1");
        const parts = normalized.split(".").filter(Boolean);
        return Math.max(0, parts.length - 1);
    };

    const formatJsonValue = (value: unknown) => {
        if (value === null) return "null";
        if (value === undefined) return "undefined";
        if (typeof value === "string") {
            const trimmed = value.length > 140 ? `${value.slice(0, 140)}…` : value;
            return `"${trimmed}"`;
        }
        if (typeof value === "number" || typeof value === "boolean") return String(value);
        return String(value);
    };

    const renderJsonTree = (label: string, value: unknown, depth: number, path: string): any => {
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

    const getDisplayLabel = (item: (typeof items)[number]) => {
        if (item.type === "text" && item.sourceId && item.fieldPath) {
            const source = sources.find((candidate) => candidate.id === item.sourceId);
            const bound = resolveFieldValue(item.sourceId, item.endpointPath, item.fieldPath);
            if (bound !== undefined && bound !== null && (isSystemSource(source) || item.endpointPath)) {
                const value = Array.isArray(bound) ? bound[0] : bound;
                if (item.format === "uppercase" && typeof value === "string") return value.toUpperCase();
                if (item.format === "json") return JSON.stringify(value, null, 2);
                return String(value);
            }
        }
        return item.label ?? "";
    };

    const getProgressValue = (item: (typeof items)[number]) => {
        let value = typeof item.value === "number" ? item.value : 0;
        if (item.sourceId && item.fieldPath) {
            const source = sources.find((candidate) => candidate.id === item.sourceId);
            const bound = resolveFieldValue(item.sourceId, item.endpointPath, item.fieldPath);
            if (bound !== undefined && bound !== null && (isSystemSource(source) || item.endpointPath)) {
                const raw = Array.isArray(bound) ? bound[0] : bound;
                const parsed = typeof raw === "number" ? raw : typeof raw === "string" ? Number.parseFloat(raw) : NaN;
                if (Number.isFinite(parsed)) {
                    value = parsed;
                }
            }
        }
        return value;
    };

    const getProgressPercent = (item: (typeof items)[number]) => {
        const min = typeof item.minimum === "number" ? item.minimum : 0;
        const max = typeof item.maximum === "number" ? item.maximum : 100;
        const value = getProgressValue(item);
        if (max <= min) return 0;
        return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
    };

    const resolveImageSource = useCallback((item: (typeof items)[number]) => {
        if (item.type === "image" && item.sourceId && item.fieldPath) {
            const source = sources.find((candidate) => candidate.id === item.sourceId);
            const bound = resolveFieldValue(item.sourceId, item.endpointPath, item.fieldPath);
            if (isSystemSource(source) || item.endpointPath) {
                const value = Array.isArray(bound) ? bound[0] : bound;
                if (typeof value === "string" && value.length > 0) return value;
                if (value && typeof value === "object") {
                    const localUrl = (value as any).localUrl as string | undefined;
                    const previewImage = (value as any).previewImage as string | undefined;
                    if (previewImage) return previewImage;
                    if (localUrl && !localUrl.toLowerCase().endsWith(".mp4")) return localUrl;
                }
            }
        }
        return item.src ?? "";
    }, [isSystemSource, resolveFieldValue, sources]);

    const getVideoSource = useCallback((item: (typeof items)[number]) => {
        if (item.type !== "image" || !item.sourceId || !item.fieldPath) return "";
        const bound = resolveFieldValue(item.sourceId, item.endpointPath, item.fieldPath) as any;
        if (!bound) return "";
        if (typeof bound === "string" && bound.toLowerCase().endsWith(".mp4")) return bound;
        if (typeof bound === "object") {
            const localUrl = (bound as any).localUrl as string | undefined;
            if (localUrl && localUrl.toLowerCase().endsWith(".mp4")) return localUrl;
        }
        return "";
    }, [resolveFieldValue]);

    const getImageSource = (item: (typeof items)[number]) => imageDisplaySrc[item.id] ?? resolveImageSource(item);

    const getPreviewLabel = useCallback((item: (typeof items)[number]) => {
        if (item.type !== "text") return "";
        return getDisplayLabel(item);
    }, [getDisplayLabel]);

    const getPreviewItemStyle = useCallback((item: (typeof items)[number]) => {
        const toPercentX = (value: number) => (value / 1920) * 100;
        const toPercentY = (value: number) => (value / 1080) * 100;

        const parts = [
            `left: ${toPercentX(item.x)}%;`,
            `top: ${toPercentY(item.y)}%;`,
            `width: ${toPercentX(item.width)}%;`,
            `height: ${toPercentY(item.height)}%;`,
            `z-index: ${item.zIndex ?? 1};`,
            item.visible === false ? "display: none;" : ""
        ].filter(Boolean);

        if (item.type === "line") {
            const thickness = Math.max(2, item.strokeWidth ?? item.height);
            parts.push(`height: ${toPercentY(thickness)}%;`);
            parts.push(`background: ${item.stroke ?? "rgba(0,0,0,0.6)"};`);
            parts.push("border: none;");
            return parts.join(" ");
        }
        if (item.type === "text") {
            parts.push(`font-family: ${item.fontFamily ?? "Segoe UI"};`);
            parts.push(`font-size: ${item.fontSize ?? 16}px;`);
            parts.push(`font-weight: ${item.fontWeight ?? "normal"};`);
            parts.push(`font-style: ${item.fontStyle ?? "normal"};`);
            parts.push(`color: ${item.textColor ?? "#222222"};`);
            parts.push(`text-transform: ${item.textTransform ?? "none"};`);
            parts.push(`letter-spacing: ${item.letterSpacing ?? 0}px;`);
            const shadowX = item.textShadowX ?? 0;
            const shadowY = item.textShadowY ?? 0;
            const shadowBlur = item.textShadowBlur ?? 0;
            const shadowColor = item.textShadowColor ?? "#000000";
            parts.push(`text-shadow: ${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowColor};`);
        }
        if (item.type === "image") {
            const videoSource = getVideoSource(item);
            if (videoSource) {
                return parts.join(" ");
            }
            const source = getImageSource(item);
            if (source) {
                parts.push(`background-image: url('${source}');`);
                parts.push("background-size: cover;");
                parts.push("background-position: center;");
            }
        }
        if (item.type === "rect" || item.type === "ellipse") {
            parts.push(`background: ${item.fill ?? "transparent"};`);
            parts.push(`border: ${item.strokeWidth ?? 1}px solid ${item.stroke ?? "rgba(0,0,0,0.4)"};`);
        }
        if (item.type === "ellipse") {
            parts.push("border-radius: 999px;");
        }
        if (item.type === "text") {
            parts.push("white-space: pre-wrap;");
        }

        return parts.join(" ");
    }, [getImageSource, getVideoSource]);

    const overlayPreviewNodes = useMemo(() => buildCanvasItems({
        items,
        selectedIds: [],
        getItemStyle: getPreviewItemStyle,
        getDisplayLabel: getPreviewLabel,
        getProgressPercent,
        getImageSource,
        getVideoSource,
        beginResize: () => () => { },
        handleItemMouseDown: () => () => { }
    }), [getPreviewItemStyle, getPreviewLabel, getProgressPercent, getImageSource, getVideoSource, items]);

    useEffect(() => {
        let cancelled = false;
        const loaders: HTMLImageElement[] = [];

        const updateDisplay = (itemId: string, src: string) => {
            setImageDisplaySrc((prev) => {
                if (prev[itemId] === src) return prev;
                return { ...prev, [itemId]: src };
            });
        };

        const cleanupMissing = (itemId: string) => {
            setImageDisplaySrc((prev) => {
                if (!prev[itemId]) return prev;
                const next = { ...prev };
                delete next[itemId];
                return next;
            });
        };

        items
            .filter((item) => item.type === "image")
            .forEach((item) => {
                const src = resolveImageSource(item);
                if (!src) {
                    cleanupMissing(item.id);
                    return;
                }
                if (imageDisplaySrc[item.id] === src) {
                    return;
                }
                const img = new Image();
                loaders.push(img);
                img.onload = () => {
                    if (cancelled) return;
                    updateDisplay(item.id, src);
                };
                img.onerror = () => {
                    if (cancelled) return;
                };
                img.src = src;
            });

        return () => {
            cancelled = true;
            loaders.forEach((img) => {
                img.onload = null;
                img.onerror = null;
            });
        };
    }, [imageDisplaySrc, items, resolveImageSource]);

    const getItemStyle = (item: (typeof items)[number]) => {
        const parts = [
            `left: ${item.x}px;`,
            `top: ${item.y}px;`,
            `width: ${item.width}px;`,
            `height: ${item.height}px;`,
            `z-index: ${item.zIndex ?? 1};`,
            item.visible === false ? 'display: none;' : '',
            item.locked ? 'pointer-events: none;' : ''
        ].filter(Boolean);

        if (item.type === "line") {
            const thickness = Math.max(2, item.strokeWidth ?? item.height);
            parts.push(`height: ${thickness}px;`);
            parts.push(`background: ${item.stroke ?? "rgba(0,0,0,0.6)"};`);
            parts.push("border: none;");
            return parts.join(" ");
        }
        if (item.type === "text") {
            parts.push(`font-family: ${item.fontFamily ?? "Segoe UI"};`);
            parts.push(`font-size: ${item.fontSize ?? 16}px;`);
            parts.push(`font-weight: ${item.fontWeight ?? "normal"};`);
            parts.push(`font-style: ${item.fontStyle ?? "normal"};`);
            parts.push(`color: ${item.textColor ?? "#222222"};`);
            parts.push(`text-transform: ${item.textTransform ?? "none"};`);
            parts.push(`letter-spacing: ${item.letterSpacing ?? 0}px;`);
            const shadowX = item.textShadowX ?? 0;
            const shadowY = item.textShadowY ?? 0;
            const shadowBlur = item.textShadowBlur ?? 0;
            const shadowColor = item.textShadowColor ?? "#000000";
            parts.push(`text-shadow: ${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowColor};`);
        }
        if (item.type === "image") {
            const videoSource = getVideoSource(item);
            if (videoSource) {
                return parts.join(" ");
            }
            const source = getImageSource(item);
            if (source) {
                parts.push(`background-image: url('${source}');`);
                parts.push("background-size: cover;");
                parts.push("background-position: center;");
            }
        }
        if (item.type === "rect" || item.type === "ellipse") {
            parts.push(`background: ${item.fill ?? "transparent"};`);
            parts.push(`border: 1px solid ${item.stroke ?? "rgba(0,0,0,0.35)"};`);
        }
        return parts.join(" ");
    };

    const getNextName = (toolType: string) => {
        const base = toolType.charAt(0).toUpperCase() + toolType.slice(1);
        const next = (nameCounters.current[base] ?? 0) + 1;
        nameCounters.current[base] = next;
        return `${base}${next}`;
    };

    const addItem = (toolType: string, x: number, y: number, width: number, height: number) => {
        if (toolType === "bind" || toolType === "polygon") {
            setStatus(`${toolType} tool not implemented yet.`);
            return;
        }
        const created = createCanvasItem({
            toolType,
            x,
            y,
            width,
            height,
            items,
            activeLayerId,
            layers,
            getNextName
        });
        setItems((prev) => [...prev, created.item]);
        setSelectedIds([created.id]);
        setActiveTool("select");
    };

    const copySelection = () => {
        const nextClipboard = copyToClipboard(items, selectedIds);
        if (!nextClipboard) return;
        clipboardRef.current = nextClipboard;
    };

    const deleteSelection = () => {
        if (selectedIds.length === 0) return;
        setItems((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
        setSelectedIds([]);
    };

    const pasteSelection = () => {
        if (!clipboardRef.current) return;
        const result = pasteFromClipboard(clipboardRef.current, items, getNextName);
        setItems(result.items);
        setSelectedIds(result.selectedIds);
        clipboardRef.current = result.nextClipboard;
    };

    const pushHistory = useCallback((nextItems: typeof items, nextSelected: string[]) => {
        if (isApplyingHistoryRef.current) return;
        const next = pushHistoryReducer(historyRef.current, historyIndexRef.current, nextItems, nextSelected);
        historyRef.current = next.history;
        historyIndexRef.current = next.index;
    }, []);

    const applyHistory = (index: number) => {
        const entry = historyRef.current[index];
        if (!entry) return;
        isApplyingHistoryRef.current = true;
        setItems(entry.items);
        setSelectedIds(entry.selectedIds);
        historyIndexRef.current = index;
        requestAnimationFrame(() => {
            isApplyingHistoryRef.current = false;
        });
    };

    useEffect(() => {
        if (isTransforming || transformRef.current) {
            return;
        }
        pushHistory(items, selectedIds);
    }, [isTransforming, items, pushHistory, selectedIds]);

    const beginTransformHold = () => {
        setIsTransforming(true);
        transformHoldUntil.current = Date.now() + 300;
    };

    const endTransformHold = () => {
        setIsTransforming(false);
        transformHoldUntil.current = Date.now() + 300;
    };

    const {
        beginResize,
        handleCanvasMouseDown,
        handleCanvasMouseMove,
        handleCanvasMouseUp,
        handleItemMouseDown
    } = useCanvasInteractions({
        activeTool,
        setActiveTool,
        items,
        setItems,
        selectedIds,
        setSelectedIds,
        selectionBox,
        setSelectionBox,
        placementBox,
        setPlacementBox,
        dragStart,
        placementStart,
        transformRef,
        canvasScale,
        panRef,
        beginTransformHold,
        endTransformHold,
        addItem
    });

    // Layer management handlers
    const handleSelectLayer = (id: string, multiSelect: boolean) => {
        setSelectedIds((prev) => {
            if (multiSelect) {
                return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
            }
            return [id];
        });
    };

    const handleToggleVisibility = (id: string) => {
        setItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, visible: item.visible === false ? true : false } : item))
        );
    };

    const handleToggleLock = (id: string) => {
        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, locked: !item.locked } : item)));
    };

    const handleReorderLayer = (id: string, newZIndex: number) => {
        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, zIndex: newZIndex } : item)));
    };

    const handleReorderItem = (draggedId: string, targetId: string) => {
        if (!draggedId || !targetId || draggedId === targetId) return;
        setItems((prev) => {
            const layerId = activeLayerId || layers[0]?.id || "layer-1";
            const layerItems = prev
                .filter((item) => (item.layerId ?? layerId) === layerId)
                .sort((a, b) => (b.zIndex ?? 1) - (a.zIndex ?? 1));

            const fromIndex = layerItems.findIndex((item) => item.id === draggedId);
            const toIndex = layerItems.findIndex((item) => item.id === targetId);
            if (fromIndex === -1 || toIndex === -1) return prev;

            const nextLayerItems = [...layerItems];
            const [moved] = nextLayerItems.splice(fromIndex, 1);
            nextLayerItems.splice(toIndex, 0, moved);

            const updated = new Map<string, number>();
            const maxIndex = nextLayerItems.length;
            nextLayerItems.forEach((item, index) => {
                updated.set(item.id, maxIndex - index);
            });

            return prev.map((item) =>
                updated.has(item.id) ? { ...item, zIndex: updated.get(item.id) } : item
            );
        });
    };

    const handleAddLayer = () => {
        const newLayer = createLayer(layers);
        setLayers((prev) => [...prev, newLayer]);
        setActiveLayerId(newLayer.id);
    };

    const handleDeleteLayer = (layerId: string) => {
        if (layers.length <= 1) {
            return;
        }

        const remainingLayers = layers.filter((layer) => layer.id !== layerId);
        if (remainingLayers.length === 0) {
            return;
        }

        const fallbackLayerId = remainingLayers[0].id;
        setLayers(remainingLayers);
        setItems((prev) => reassignItemsToLayer(prev, layerId, fallbackLayerId));
        if (activeLayerId === layerId) {
            setActiveLayerId(fallbackLayerId);
        }
    };

    const handleLayerCss = (layerId: string) => {
        const layer = layers.find((entry) => entry.id === layerId);
        setStatus(`Layer CSS settings for ${layer?.name ?? "Layer"} (coming soon)`);
    };

    const handleLayerBlending = (layerId: string) => {
        const layer = layers.find((entry) => entry.id === layerId);
        setStatus(`Layer blending settings for ${layer?.name ?? "Layer"} (coming soon)`);
    };

    const handleLayerGroup = (layerId: string) => {
        const layer = layers.find((entry) => entry.id === layerId);
        setStatus(`Layer grouping for ${layer?.name ?? "Layer"} (coming soon)`);
    };

    const handleLayerLock = (layerId: string) => {
        const hasUnlocked = items.some((item) => (item.layerId ?? layerId) === layerId && !item.locked);
        setItems((prev) =>
            prev.map((item) =>
                (item.layerId ?? layerId) === layerId ? { ...item, locked: hasUnlocked } : item
            )
        );
    };

    const handleDockDragStart = () => {
        setIsDockPreview(false);
    };

    const handleDockDragMove = (args: any) => {
        if (isDockCollapsed) {
            setIsDockPreview(false);
            return;
        }
        const container = document.querySelector(".playground2-outer-form") as HTMLElement | null;
        const containerWidth = container?.clientWidth ?? window.innerWidth;
        const dockWidth = 320;
        const left = Number(args?.left ?? 0);
        const threshold = Math.max(0, containerWidth - dockWidth - 40);
        setIsDockPreview(left >= threshold);
    };

    const handleDockDragEnd = (args: any) => {
        const dockId = args?.sender?.dockId as string | undefined;
        if (!dockId || isDockCollapsed) return;
        const container = document.querySelector(".playground2-outer-form") as HTMLElement | null;
        const containerWidth = container?.clientWidth ?? window.innerWidth;
        const dockWidth = 320;
        const left = Number(args?.left ?? 0);
        const threshold = Math.max(0, containerWidth - dockWidth - 40);
        if (left >= threshold) {
            setDockedWindows((prev) => (prev.includes(dockId) ? prev : [...prev, dockId]));
        }
        setIsDockPreview(false);
    };

    const handleDockUndock = (args: any) => {
        const dockId = args?.sender?.dockId as string | undefined;
        if (!dockId) return;
        setDockedWindows((prev) => prev.filter((id) => id !== dockId));
    };

    const withDockProps = (dialogNode: any, dockId: string) => {
        if (!dialogNode) return null;
        return {
            ...dialogNode,
            props: {
                ...(dialogNode.props ?? {}),
                dockId,
                dragBounds: ".playground2-outer-form",
                onDragStart: "dockDragStart",
                onDragMove: "dockDragMove",
                onDragEnd: "dockDragEnd"
            }
        } as typeof dialogNode;
    };

    const asDocked = (dialogNode: any) => {
        if (!dialogNode) return null;
        return {
            ...dialogNode,
            props: {
                ...(dialogNode.props ?? {}),
                isDocked: true,
                draggable: false,
                onUndock: "dockUndock"
            }
        } as typeof dialogNode;
    };

    const isDocked = (dockId: string) => dockedWindows.includes(dockId);

    const handleSelectActiveLayer = (layerId: string) => {
        setActiveLayerId(layerId);
        setSelectedIds(items.filter((item) => (item.layerId ?? layerId) === layerId).map((item) => item.id));
    };

    const selectedItem = selectedIds.length > 0 ? items.find((item) => item.id === selectedIds[0]) ?? null : null;
    useEffect(() => {
        if (!textStylesSyncPreview) return;
        if (!selectedItem || selectedItem.type !== "text") return;
        const display = getDisplayLabel(selectedItem).trim();
        if (!display) return;
        if (display !== textStylesPreviewText) {
            setTextStylesPreviewText(display);
        }
        if (display !== textStylesCustomText) {
            setTextStylesCustomText(display);
        }
    }, [getDisplayLabel, selectedItem, textStylesCustomText, textStylesPreviewText, textStylesSyncPreview]);
    const getExtensionGroupId = useCallback((extension: DesignerUiExtension) => {
        const group = extension.group?.trim();
        return group && group.length > 0 ? group : extension.id;
    }, []);
    const extensionByTarget = useMemo(() => {
        const map = new Map<string, DesignerUiExtension[]>();
        uiExtensions.forEach((extension) => {
            (extension.targets ?? []).forEach((target) => {
                if (!target) return;
                const list = map.get(target) ?? [];
                list.push(extension);
                map.set(target, list);
            });
        });
        map.forEach((list) => {
            list.sort((a, b) => {
                const orderA = a.order ?? 0;
                const orderB = b.order ?? 0;
                if (orderA !== orderB) return orderA - orderB;
                return (a.title ?? a.id).localeCompare(b.title ?? b.id);
            });
        });
        return map;
    }, [uiExtensions]);
    const normalizeExtensionNodes = useCallback((form?: FormNode | FormNode[] | null) => {
        if (!form) return [] as FormNode[];
        return Array.isArray(form) ? (form.filter(Boolean) as FormNode[]) : [form as FormNode];
    }, []);
    const getExtensionsForTarget = useCallback((target: string) => extensionByTarget.get(target) ?? [], [extensionByTarget]);
    const textEffectsExtensions = useMemo(
        () => getExtensionsForTarget("text.properties.effects")
            .flatMap((extension) => normalizeExtensionNodes(extension.form)),
        [getExtensionsForTarget, normalizeExtensionNodes]
    );
    const dialogExtensions = useMemo(
        () => getExtensionsForTarget("designer.dialogs"),
        [getExtensionsForTarget]
    );
    const selectedSource = selectedItem?.sourceId ? sources.find((source) => source.id === selectedItem.sourceId) ?? null : null;
    const selectedEndpoints = !isSystemSource(selectedSource) ? selectedSource?.endpoints ?? [] : [];
    const selectedEndpoint = selectedItem?.endpointPath
        ? selectedEndpoints.find((endpoint) => endpoint.path === selectedItem.endpointPath)
        : null;
    const selectedPreview = selectedItem?.sourceId ? previews.get(selectedItem.sourceId) : undefined;
    const previewFields = selectedPreview?.fields ?? [];
    const endpointFields = selectedEndpoint?.response?.fields ?? [];
    const hasBindingForItem = useCallback((item?: CanvasItem | null) => {
        if (!item?.sourceId || !item?.fieldPath) return false;
        const source = sources.find((candidate) => candidate.id === item.sourceId);
        if (!source) return false;
        if (isSystemSource(source)) return true;
        return Boolean(item.endpointPath);
    }, [isSystemSource, sources]);

    const systemFields = useMemo(() => {
        if (!selectedSource || !isSystemSource(selectedSource)) return [];
        const data = liveData.get(selectedSource.id);
        return buildFieldSpecs(data);
    }, [buildFieldSpecs, isSystemSource, liveData, selectedSource]);
    const availableFields = endpointFields.length > 0 ? endpointFields : systemFields.length > 0 ? systemFields : previewFields;
    const selectedKey = selectedItem ? buildDataKey(selectedItem.sourceId, selectedItem.endpointPath) : "";
    const selectedTest = selectedKey ? testResponses.get(selectedKey) : undefined;
    const canBind = Boolean(selectedItem && (selectedItem.type === "text" || selectedItem.type === "image" || selectedItem.type === "progress"));
    const selectedFieldPath = selectedItem?.fieldPath ?? "";
    const selectedFieldKey = selectedFieldPath.replace(/^response\./, "");
    const selectedFieldSpec = selectedFieldKey ? availableFields.find((field) => field.path === selectedFieldKey) : undefined;
    const previewData = isSystemSource(selectedSource)
        ? (selectedSource ? liveData.get(selectedSource.id) : undefined)
        : selectedKey ? virtualState[selectedKey] : undefined;
    const selectedResolvedValue = selectedItem
        ? resolveFieldValue(selectedItem.sourceId, selectedItem.endpointPath, selectedItem.fieldPath)
        : undefined;
    const arrayValueMessage = Array.isArray(selectedResolvedValue)
        ? "Array value detected. This control renders a single value; first element will be used."
        : null;
    const currentJson = useMemo(() => serializeLayout(), [serializeLayout]);
    const isDirty = currentJson !== lastPersistedJson;
    const hasBinding = hasBindingForItem(selectedItem);
    const textStylesData = useMemo(() => {
        for (const extension of uiExtensions) {
            if (getExtensionGroupId(extension) !== "text-styles") continue;
            const styles = extension.data?.styles;
            if (Array.isArray(styles)) return styles as TextStyleCatalogEntry[];
        }
        return [] as TextStyleCatalogEntry[];
    }, [getExtensionGroupId, uiExtensions]);
    const textStylesRemoteCache = useMemo(() => {
        const query = textStylesSearch.trim().toLowerCase();
        if (query.length < 2) return null;
        for (const extension of uiExtensions) {
            if (getExtensionGroupId(extension) !== "text-styles") continue;
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
    }, [getExtensionGroupId, textStylesSearch, uiExtensions]);
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
        const limit = textStylesPage * textStylesPageSize;
        return filteredTextStyles.slice(0, limit);
    }, [filteredTextStyles, textStylesPage, textStylesPageSize]);
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
            setOpenUiExtensions((prev) => {
                const next = new Set(prev);
                next.add(groupId);
                return next;
            });
            return;
        }
        if (action === "close") {
            setOpenUiExtensions((prev) => {
                const next = new Set(prev);
                next.delete(groupId);
                return next;
            });
            return;
        }
        if (action === "apply") {
            const styleId = parts.slice(3).join(":");
            applyTextStyleById(styleId);
        }
    }, [applyTextStyleById]);
    useEffect(() => {
        const isOpen = openUiExtensions.has("text-styles");
        if (!isOpen) {
            textStylesAutoloadRef.current = false;
            setTextStylesHoveredId(null);
            return;
        }
        if (textStylesData.length > 0) return;
        if (textStylesAutoloadRef.current) return;
        textStylesAutoloadRef.current = true;
        void refreshTextStylesCatalog();
    }, [openUiExtensions, refreshTextStylesCatalog, textStylesData.length]);
    useEffect(() => {
        const isOpen = openUiExtensions.has("text-styles");
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

        if (textStylesRemoteCache && textStylesRemoteCache.styles.length >= textStylesPage * textStylesPageSize) {
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
                params.set("limit", String(textStylesPage * textStylesPageSize));
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
                const mapped = items.map((family, index) => {
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
                        categoryLabel: (family.category ?? "sans-serif").replace(/(^|\\s|-)\\w/g, (m) => m.toUpperCase()),
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
                setUiExtensions((prev) => prev.map((extension) => {
                    if (getExtensionGroupId(extension) !== "text-styles") return extension;
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
    }, [getExtensionGroupId, openUiExtensions, resolveGoogleCategory, textStylesCaseFilter, textStylesCategoryId, textStylesPage, textStylesPageSize, textStylesRefreshing, textStylesSearch, textStylesShadowFilter, textStylesWeightFilter, textStylesPreviewText, textStylesRemoteCache]);
    const scheduleTarget = scheduleTargetId ? items.find((item) => item.id === scheduleTargetId) ?? null : null;
    const schedulerItems = useMemo(
        () => items.filter((item) => hasBindingForItem(item)),
        [hasBindingForItem, items]
    );
    const formatTimeAgo = (timestamp?: number) => {
        if (!timestamp) return "Never";
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ago`;
    };
    const categories = useMemo(() => {
        const categorySet = new Map<string, DataSourceCategory>();
        for (const source of sources) {
            if (source.kind && !categorySet.has(source.kind)) {
                categorySet.set(source.kind, {
                    id: source.kind,
                    name: formatCategoryLabel(source.kind, source.kindLabel),
                    parentId: null
                });
            }
            if (!source.categoryId) continue;
            if (!categorySet.has(source.categoryId)) {
                categorySet.set(source.categoryId, {
                    id: source.categoryId,
                    name: formatCategoryLabel(source.categoryId, source.categoryLabel),
                    parentId: source.kind ?? null
                });
            }
        }
        return Array.from(categorySet.values());
    }, [sources]);
    const topCategories = useMemo(() => {
        const top = categories.filter((category) => !category.parentId);
        return top.sort((a, b) => a.id.localeCompare(b.id));
    }, [categories]);
    const categoryChildren = useMemo(() => {
        const map = new Map<string, DataSourceCategory[]>();
        for (const category of categories) {
            if (!category.parentId) continue;
            const list = map.get(category.parentId) ?? [];
            list.push(category);
            map.set(category.parentId, list);
        }
        return map;
    }, [categories]);
    const collectDescendants = useCallback(
        (rootId: string) => {
            const visited = new Set<string>();
            const queue: string[] = [rootId];
            while (queue.length > 0) {
                const current = queue.shift();
                if (!current || visited.has(current)) continue;
                visited.add(current);
                const children = categoryChildren.get(current);
                if (children) {
                    for (const child of children) {
                        queue.push(child.id);
                    }
                }
            }
            return visited;
        },
        [categoryChildren]
    );
    const subcategories = useMemo(() => {
        if (!selectedCategoryId) return [];
        const direct = categoryChildren.get(selectedCategoryId) ?? [];
        return direct.sort((a, b) => a.id.localeCompare(b.id));
    }, [categoryChildren, selectedCategoryId]);
    const allowedCategoryIds = useMemo(() => {
        if (!selectedCategoryId) return new Set<string>();
        if (selectedSubcategoryId) return new Set([selectedSubcategoryId]);
        return collectDescendants(selectedCategoryId);
    }, [collectDescendants, selectedCategoryId, selectedSubcategoryId]);
    const filteredSources = useMemo(() => {
        if (!selectedCategoryId) return sources;
        if (selectedSubcategoryId) {
            return sources.filter((source) => source.categoryId === selectedSubcategoryId);
        }
        return sources.filter((source) => source.kind === selectedCategoryId);
    }, [selectedCategoryId, selectedSubcategoryId, sources]);

    const undo = useCallback(() => {
        if (canUndo(historyIndexRef.current)) {
            applyHistory(historyIndexRef.current - 1);
        }
    }, [applyHistory]);

    const redo = useCallback(() => {
        if (canRedo(historyRef.current, historyIndexRef.current)) {
            applyHistory(historyIndexRef.current + 1);
        }
    }, [applyHistory]);

    const themeItems = useMemo(() => themes.map((theme) => theme.label), []);
    const themeModeItems = useMemo(() => ["Light", "Dark"], []);
    const applyThemeByIndex = useCallback((index: number) => {
        const theme = themes[index];
        if (!theme) return;
        setTheme(theme.id, themeModeSelection);
        setThemeSelection(index);
    }, [themeModeSelection]);

    const applyThemeModeByIndex = useCallback((index: number) => {
        const mode: ThemeMode = index === 1 ? "dark" : "light";
        setThemeModeSelection(mode);
        setThemeMode(mode);
    }, []);

    const refreshAiStatus = useCallback(async () => {
        try {
            const status = await fetchAiStatus();
            const detail = status.configured
                ? `${status.message} (${status.model}, ${status.environment})`
                : `${status.message} (${status.environment})`;
            setThemeAiStatus(detail);
        } catch (err) {
            setThemeAiStatus(`AI status unavailable: ${String(err)}`);
        }
    }, []);

    const applyAiThemeResult = useCallback((result: AiThemeResult) => {
        setThemeOverrides({
            name: result.name,
            description: result.description,
            tokens: result.tokens,
            enabled: true
        });
        setThemeAiThemeName(result.name);
        setThemeAiThemeDescription(result.description);
    }, []);

    const handleAiThemeGenerate = useCallback(async () => {
        if (themeAiBusy) return;
        const trimmed = themeAiPrompt.trim();
        if (!trimmed) {
            setThemeAiResponse("Describe the theme you want first.");
            return;
        }
        setThemeAiBusy(true);
        setThemeAiResponse("Generating AI theme...");
        try {
            const baseThemeId = themes[themeSelection]?.id;
            const result = await generateAiTheme({
                prompt: trimmed,
                baseThemeId,
                themeMode: themeModeSelection
            });
            setThemeAiResult(result);
            applyAiThemeResult(result);
            setThemeAiResponse(`Generated "${result.name}". ${result.description}`);
            setThemeAiStatus(`Applied AI theme "${result.name}".`);
        } catch (err) {
            setThemeAiResponse(`AI theme failed: ${String(err)}`);
            setThemeAiStatus("AI theme generation failed.");
        } finally {
            setThemeAiBusy(false);
        }
    }, [applyAiThemeResult, themeAiBusy, themeAiPrompt, themeModeSelection, themeSelection]);

    const handleAiThemeApply = useCallback(() => {
        if (themeAiResult) {
            applyAiThemeResult(themeAiResult);
            setThemeAiStatus(`Applied AI theme "${themeAiResult.name}".`);
            return;
        }
        const stored = loadThemeOverrides();
        if (stored) {
            setThemeOverrides(stored);
            setThemeAiThemeName(stored.name ?? "Custom AI Theme");
            setThemeAiThemeDescription(stored.description ?? "");
            setThemeAiStatus("Applied stored AI theme.");
        } else {
            setThemeAiResponse("No AI theme available to apply.");
        }
    }, [applyAiThemeResult, themeAiResult]);

    const handleAiThemeClear = useCallback(() => {
        clearThemeOverrides();
        setThemeAiResult(null);
        setThemeAiThemeName("None");
        setThemeAiThemeDescription("");
        setThemeAiStatus("AI theme cleared.");
    }, []);


    const handlers = useMemo(
        () => ({
            toolboxSelect: (args: any) => {
                const tool = args?.tool;
                if (tool?.id) {
                    setActiveTool(tool.id);
                }
            },
            newOverlay: () => handleNewLayout(),
            saveOverlay: () => void handleManualSave(),
            undoAction: () => undo(),
            redoAction: () => redo(),
            openLayersToolbox: () => setShowLayersToolbox(true),
            openSchedulerOverview: () => setShowSchedulerOverview(true),
            openOverlayVideoPreview: () => setShowOverlayVideoPreview(true),
            openDesignerSettings: () => setShowDesignerSettings(true),
            openThemeViewer: () => {
                const settings = loadSettings();
                const index = themes.findIndex((theme) => theme.id === settings.themeId);
                setThemeSelection(index >= 0 ? index : 0);
                setThemeModeSelection(settings.themeMode);
                void refreshAiStatus();
                setShowThemeViewer(true);
            },
            openLivePreview: () => {
                const projectId = autosaveProjectIdRef.current;
                const url = `/designer/preview/${encodeURIComponent(projectId)}`;
                window.open(url, 'LivePreview', 'width=1280,height=800,menubar=no,toolbar=no,location=no,status=no');
            },
            toggleDockPanel: () => setIsDockCollapsed((prev) => !prev),
            zoomIn: () => setCanvasScale((prev) => Math.min(3, Math.round((prev + 0.1) * 100) / 100)),
            zoomOut: () => setCanvasScale((prev) => Math.max(0.1, Math.round((prev - 0.1) * 100) / 100)),
            zoomReset: () => setCanvasScale(1),
            dockDragStart: handleDockDragStart,
            dockDragMove: handleDockDragMove,
            dockDragEnd: handleDockDragEnd,
            dockUndock: handleDockUndock,
            closeTextStyleEditor: () => setShowTextStyleEditor(false),
            closeTextStylesAiPrompt: () => setTextStylesAiPromptOpen(false),
            closeDataSourceExplorer: () => setShowDataSourceExplorer(false),
            closeOverlayVideoPreview: () => setShowOverlayVideoPreview(false),
            closeDesignerSettings: () => setShowDesignerSettings(false),
            closeThemeViewer: () => setShowThemeViewer(false),
            clearOverlayVideoCache: () => void clearOverlayVideoCache(),
            changeTheme: (args: any) => {
                const index = typeof args?.selectedIndex === "number" ? args.selectedIndex : Number(args?.selectedIndex);
                if (!Number.isFinite(index)) return;
                applyThemeByIndex(index);
            },
            changeThemeMode: (args: any) => {
                const index = typeof args?.selectedIndex === "number" ? args.selectedIndex : Number(args?.selectedIndex);
                if (!Number.isFinite(index)) return;
                applyThemeModeByIndex(index);
            },
            selectTheme: (args: any) => {
                const selected = Array.isArray(args?.selectedIndices) ? args.selectedIndices[0] : undefined;
                const index = typeof selected === "number" ? selected : Number(args?.selectedIndex);
                if (!Number.isFinite(index)) return;
                applyThemeByIndex(index);
            },
            applyThemeSelection: () => applyThemeByIndex(themeSelection),
            aiThemePromptChange: (args: any) => setThemeAiPrompt(String(args?.value ?? "")),
            aiThemeGenerate: () => void handleAiThemeGenerate(),
            aiThemeApply: () => handleAiThemeApply(),
            aiThemeClear: () => handleAiThemeClear(),
            aiThemeRefresh: () => void refreshAiStatus(),
            openScheduleSetup: () => {
                if (!selectedItem || !hasBindingForItem(selectedItem)) return;
                setScheduleTargetId(selectedItem.id);
                setShowScheduleSetup(true);
            },
            closeScheduleSetup: () => {
                setShowScheduleSetup(false);
                setScheduleTargetId(null);
            },
            closeSchedulerOverview: () => setShowSchedulerOverview(false),
            resetScheduleTimers: () => {
                const now = Date.now();
                scheduleEpochRef.current = now;
                scheduleTickRef.current.clear();
                setScheduleEpoch(now);
                setScheduleRuns(new Map());
            },
            "*": (args: any) => {
                handleUiExtensionEvent(args?.name as string | undefined);
            }
        }),
        [applyThemeByIndex, applyThemeModeByIndex, clearOverlayVideoCache, handleAiThemeApply, handleAiThemeClear, handleAiThemeGenerate, handleDockDragEnd, handleDockDragMove, handleDockDragStart, handleManualSave, handleNewLayout, handleUiExtensionEvent, hasBindingForItem, redo, refreshAiStatus, selectedItem, themeSelection, undo]
    );

    useEffect(() => {
        if (selectedItem?.sourceId) {
            ensurePreview(selectedItem.sourceId);
        }
    }, [ensurePreview, selectedItem?.sourceId]);

    useEffect(() => {
        if (!selectedItem?.sourceId) return;
        const source = sources.find((candidate) => candidate.id === selectedItem.sourceId);
        if (!source) return;
        if (source.kind && selectedCategoryId !== source.kind) {
            setSelectedCategoryId(source.kind);
        }
        if (source.categoryId) {
            if (selectedSubcategoryId !== source.categoryId) {
                setSelectedSubcategoryId(source.categoryId);
            }
        } else if (selectedSubcategoryId) {
            setSelectedSubcategoryId("");
        }
    }, [selectedCategoryId, selectedItem?.sourceId, selectedSubcategoryId, sources]);

    useEffect(() => {
        if (!selectedItem?.sourceId) return;
        if (sources.some((source) => source.id === selectedItem.sourceId)) return;
        updateItem(selectedItem.id, { sourceId: undefined, endpointPath: undefined, fieldPath: undefined, scheduleIntervalMs: 0 });
    }, [selectedItem?.id, selectedItem?.sourceId, sources]);

    usePlaygroundHotkeys({
        save: () => void handleManualSave(),
        undo,
        redo,
        copy: copySelection,
        cut: () => {
            copySelection();
            deleteSelection();
        },
        paste: pasteSelection,
        deleteSelection
    });

    useEffect(() => {
        if (!isDirty) {
            if (autosaveTimerRef.current) {
                window.clearTimeout(autosaveTimerRef.current);
                autosaveTimerRef.current = null;
            }
            return;
        }

        if (autosaveTimerRef.current) {
            window.clearTimeout(autosaveTimerRef.current);
        }

        autosaveTimerRef.current = window.setTimeout(() => {
            if (isSaving || !isDirty) {
                return;
            }
            const json = currentJson;
            setIsSaving(true);
            setIsAutoSaving(true);
            setSaveError(null);
            (async () => {
                try {
                    if (overlayName) {
                        await saveLayout(overlayName, json);
                    }
                    await saveAutosave(json);
                    setLastPersistedJson(json);
                    setLastSavedUtc(new Date());
                } catch (err) {
                    setSaveError(String(err));
                } finally {
                    setIsSaving(false);
                    setIsAutoSaving(false);
                }
            })();
        }, 5000);

        return () => {
            if (autosaveTimerRef.current) {
                window.clearTimeout(autosaveTimerRef.current);
                autosaveTimerRef.current = null;
            }
        };
    }, [currentJson, isDirty, isSaving, overlayName, saveAutosave, saveLayout]);


    const tools = [
        UiText.playground2.tools.select,
        UiText.playground2.tools.hand,
        UiText.playground2.tools.text,
        UiText.playground2.tools.image,
        UiText.playground2.tools.progress,
        UiText.playground2.tools.rect,
        UiText.playground2.tools.ellipse,
        UiText.playground2.tools.line,
        UiText.playground2.tools.polygon,
        UiText.playground2.tools.bind
    ];

    const menuNode = buildMenuNode();

    const textContextTarget = selectedItem?.type === "text" ? selectedItem : null;
    const textFontFamily = textContextTarget?.fontFamily ?? UiText.playground2.options.fonts[0] ?? "Segoe UI";
    const textFontSize = textContextTarget?.fontSize ?? 16;
    const textFontWeight = textContextTarget?.fontWeight ?? "normal";
    const textFontStyle = textContextTarget?.fontStyle ?? "normal";
    const textTransform = textContextTarget?.textTransform ?? "none";
    const textColor = textContextTarget?.textColor ?? "#222222";
    const textLetterSpacing = textContextTarget?.letterSpacing ?? 0;
    const isBold = textFontWeight === "bold" || (Number.parseInt(String(textFontWeight), 10) || 0) >= 600;
    const isItalic = textFontStyle === "italic";
    const scheduleIntervalMs = selectedItem?.scheduleIntervalMs ?? 0;

    const formatInterval = (value: number) => {
        if (!value || value <= 0) return "Off";
        if (value < 1000) return `${value}ms`;
        if (value < 60000) {
            const seconds = value / 1000;
            return `${Number.isInteger(seconds) ? seconds.toFixed(0) : seconds.toFixed(1)}s`;
        }
        const minutes = Math.round((value / 60000) * 10) / 10;
        return `${minutes}m`;
    };

    const contextSeparator = () => WF.Element("div", { className: "context-bar-separator" });
    const contextField = (label: string, control: any) => WF.Element(
        "div",
        { className: "context-bar-field" },
        WF.Element("span", { className: "context-bar-label" }, label),
        control
    );

    const contextBarCenter: FormNode[] = [];
    if (selectedItem) {
        contextBarCenter.push(
            contextField("Name", element("input", {
                className: "textbox context-bar-input",
                type: "text",
                style: "width: 140px;",
                value: selectedItem.name ?? "",
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { name: event.target.value })
            })),
            contextField("X", element("input", {
                className: "textbox context-bar-input",
                type: "number",
                style: "width: 64px;",
                value: selectedItem.x,
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { x: Number(event.target.value) || 0 })
            })),
            contextField("Y", element("input", {
                className: "textbox context-bar-input",
                type: "number",
                style: "width: 64px;",
                value: selectedItem.y,
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { y: Number(event.target.value) || 0 })
            })),
            contextField("W", element("input", {
                className: "textbox context-bar-input",
                type: "number",
                style: "width: 64px;",
                value: selectedItem.width,
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { width: Math.max(2, Number(event.target.value) || 0) })
            })),
            contextField("H", element("input", {
                className: "textbox context-bar-input",
                type: "number",
                style: "width: 64px;",
                value: selectedItem.height,
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                    const nextHeight = Math.max(2, Number(event.target.value) || 0);
                    if (selectedItem.type === "line") {
                        updateItem(selectedItem.id, { height: nextHeight, strokeWidth: nextHeight });
                    } else {
                        updateItem(selectedItem.id, { height: nextHeight });
                    }
                }
            }))
        );

        if (selectedItem.type === "text") {
            contextBarCenter.push(
                contextSeparator(),
                contextField("Text", element("input", {
                    className: "textbox context-bar-input",
                    type: "text",
                    style: "width: 180px;",
                    value: selectedItem.label ?? "",
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { label: event.target.value })
                })),
                contextField("Font", element(
                    "select",
                    {
                        className: "textbox context-bar-input",
                        style: "width: 150px;",
                        value: textFontFamily,
                        onChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
                            if (!textContextTarget) return;
                            updateItem(textContextTarget.id, { fontFamily: event.target.value });
                        }
                    },
                    ...UiText.playground2.options.fonts.map((font) => element("option", { key: font, value: font }, font))
                )),
                contextField("Size", element("input", {
                    className: "textbox context-bar-input",
                    type: "number",
                    min: 6,
                    max: 200,
                    style: "width: 64px;",
                    value: textFontSize,
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                        if (!textContextTarget) return;
                        updateItem(textContextTarget.id, { fontSize: Number(event.target.value) || 1 });
                    }
                })),
                element(
                    "button",
                    {
                        className: `button context-bar-button ${isBold ? "is-active" : ""}`,
                        type: "button",
                        onClick: () => {
                            if (!textContextTarget) return;
                            updateItem(textContextTarget.id, { fontWeight: isBold ? "normal" : "700" });
                        }
                    },
                    "B"
                ),
                element(
                    "button",
                    {
                        className: `button context-bar-button ${isItalic ? "is-active" : ""}`,
                        type: "button",
                        onClick: () => {
                            if (!textContextTarget) return;
                            updateItem(textContextTarget.id, { fontStyle: isItalic ? "normal" : "italic" });
                        }
                    },
                    "I"
                ),
                contextField("Case", element(
                    "select",
                    {
                        className: "textbox context-bar-input",
                        style: "width: 110px;",
                        value: textTransform,
                        onChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
                            if (!textContextTarget) return;
                            updateItem(textContextTarget.id, { textTransform: event.target.value as "none" | "uppercase" | "lowercase" });
                        }
                    },
                    ...UiText.playground2.options.transforms.map((transform) =>
                        element("option", { key: transform, value: transform }, transform)
                    )
                )),
                contextField("Color", element("input", {
                    className: "context-bar-input",
                    type: "color",
                    value: textColor,
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                        if (!textContextTarget) return;
                        updateItem(textContextTarget.id, { textColor: event.target.value });
                    }
                })),
                contextField("Spacing", element("input", {
                    className: "textbox context-bar-input",
                    type: "number",
                    min: -2,
                    max: 12,
                    step: 0.5,
                    style: "width: 64px;",
                    value: textLetterSpacing,
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                        if (!textContextTarget) return;
                        updateItem(textContextTarget.id, { letterSpacing: Number(event.target.value) || 0 });
                    }
                })),
                element(
                    "button",
                    {
                        className: "button context-bar-button",
                        type: "button",
                        onClick: () => setShowTextStyleEditor(true)
                    },
                    UiText.playground2.buttons.effects
                ),
                ...textEffectsExtensions
            );
        }

        if (selectedItem.type === "image") {
            contextBarCenter.push(
                contextSeparator(),
                contextField("Image", element("input", {
                    className: "textbox context-bar-input",
                    type: "text",
                    style: "width: 220px;",
                    value: selectedItem.src ?? "",
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { src: event.target.value })
                }))
            );
        }

        if (selectedItem.type === "progress") {
            contextBarCenter.push(
                contextSeparator(),
                contextField("Value", element("input", {
                    className: "textbox context-bar-input",
                    type: "number",
                    style: "width: 64px;",
                    value: selectedItem.value ?? 0,
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { value: Number(event.target.value) || 0 })
                })),
                contextField("Min", element("input", {
                    className: "textbox context-bar-input",
                    type: "number",
                    style: "width: 64px;",
                    value: selectedItem.minimum ?? 0,
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { minimum: Number(event.target.value) || 0 })
                })),
                contextField("Max", element("input", {
                    className: "textbox context-bar-input",
                    type: "number",
                    style: "width: 64px;",
                    value: selectedItem.maximum ?? 100,
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { maximum: Number(event.target.value) || 100 })
                })),
                contextField("Style", element(
                    "select",
                    {
                        className: "textbox context-bar-input",
                        style: "width: 110px;",
                        value: selectedItem.progressStyle ?? "blocks",
                        onChange: (event: React.ChangeEvent<HTMLSelectElement>) => updateItem(selectedItem.id, { progressStyle: event.target.value as "blocks" | "continuous" })
                    },
                    ...UiText.playground2.options.progressStyles.map((option) =>
                        element("option", { value: option.value }, option.label)
                    )
                ))
            );
        }

        if (selectedItem.type === "rect" || selectedItem.type === "ellipse" || selectedItem.type === "line") {
            contextBarCenter.push(contextSeparator());
            if (selectedItem.type !== "line") {
                contextBarCenter.push(contextField("Fill", WF.Element("input", {
                    className: "context-bar-input",
                    type: "color",
                    value: selectedItem.fill && selectedItem.fill !== "transparent" ? selectedItem.fill : "#ffffff",
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { fill: event.target.value })
                })));
            }
            contextBarCenter.push(contextField("Stroke", WF.Element("input", {
                className: "context-bar-input",
                type: "color",
                value: selectedItem.stroke ?? "#2f2f2f",
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { stroke: event.target.value })
            })));
            if (selectedItem.type === "line") {
                contextBarCenter.push(contextField("Thickness", WF.Element("input", {
                    className: "textbox context-bar-input",
                    type: "number",
                    style: "width: 64px;",
                    value: selectedItem.strokeWidth ?? selectedItem.height,
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, {
                        strokeWidth: Math.max(2, Number(event.target.value) || 2),
                        height: Math.max(2, Number(event.target.value) || 2)
                    })
                })));
            }
        }

        if (canBind) {
            contextBarCenter.push(
                contextSeparator(),
                WF.Element(
                    "div",
                    { className: "context-bar-field" },
                    WF.Element("span", { className: "context-bar-label" }, "Binding"),
                    WF.Element("button", { className: "button context-bar-button", onClick: () => setShowDataSourceExplorer(true) }, hasBinding ? "Change" : "Bind"),
                    hasBinding
                        ? WF.Element("button", {
                            className: "button context-bar-button",
                            onClick: () => updateItem(selectedItem.id, { sourceId: undefined, endpointPath: undefined, fieldPath: undefined, scheduleIntervalMs: 0 })
                        }, UiText.playground2.buttons.clear)
                        : null
                    ,
                    hasBinding
                        ? WF.Button({
                            Icon: "clock",
                            IconOnly: true,
                            ClassName: "context-bar-button",
                            OnClick: "openScheduleSetup"
                        })
                        : null,
                    hasBinding
                        ? WF.Element("span", { className: "context-bar-label" }, formatInterval(scheduleIntervalMs))
                        : null
                )
            );
        }
    } else {
        contextBarCenter.push(WF.Element("span", { className: "context-bar-empty" }, "Select an item to see options."));
    }

    const contextBarNode = WF.ContextBar({
        Left: [
            WF.Button({ Icon: "new", Text: "New", OnClick: "newOverlay", ClassName: "context-bar-button" }),
            WF.Button({ Icon: "save", Text: "Save", OnClick: "saveOverlay", ClassName: "context-bar-button" }),
            WF.Element("div", { className: "context-bar-separator" }),
            WF.Button({ Icon: "undo", Text: "Undo", OnClick: "undoAction", ClassName: "context-bar-button", Enabled: canUndo(historyIndexRef.current) }),
            WF.Button({ Icon: "redo", Text: "Redo", OnClick: "redoAction", ClassName: "context-bar-button", Enabled: canRedo(historyRef.current, historyIndexRef.current) })
        ],
        Center: contextBarCenter,
        Right: [
            WF.Button({ Icon: "refresh", Text: "Reset timers", OnClick: "resetScheduleTimers", ClassName: "context-bar-button" })
        ]
    });

    const layoutNode = buildCanvasSurfaceNode({
        items,
        selectedIds,
        getItemStyle,
        getDisplayLabel,
        getProgressPercent,
        getImageSource,
        getVideoSource,
        beginResize,
        handleItemMouseDown,
        selectionBox,
        placementBox,
        onMouseDown: handleCanvasMouseDown,
        onMouseMove: handleCanvasMouseMove,
        onMouseUp: handleCanvasMouseUp
    });

    const toolboxNode = buildToolboxNode(tools, activeTool);

    const statusBarNode = buildStatusBarNode({
        status,
        saveError,
        lastSavedUtc,
        overlayName,
        isSaving,
        isDirty,
        canvasScale
    });

    const canvasFormNode = WF.Panel(
        {
            ClassName: "playground2-canvas-form",
            Style: "position: relative; flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; overflow: auto;"
        },
        element(
            "div",
            {
                className: "canvas-wrapper",
                style: `transform: scale(${canvasScale}); transform-origin: center;`
            },
            layoutNode
        )
    );

    const propertiesTextDetails: PropertiesSummaryTextDetails | null = selectedItem?.type === "text"
        ? {
            fontFamily: selectedItem.fontFamily ?? UiText.playground2.options.fonts[0] ?? "Segoe UI",
            fontSize: `${selectedItem.fontSize ?? 16}px`,
            fontWeight: selectedItem.fontWeight ?? "normal",
            fontStyle: selectedItem.fontStyle ?? "normal",
            textTransform: selectedItem.textTransform ?? "none",
            textColor: selectedItem.textColor ?? "#222222",
            letterSpacing: String(selectedItem.letterSpacing ?? 0),
            shadow: `${selectedItem.textShadowX ?? 0}px, ${selectedItem.textShadowY ?? 0}px, ${selectedItem.textShadowBlur ?? 0}px, ${selectedItem.textShadowColor ?? "#000000"}`
        }
        : null;

    const propertiesNode = selectedItem
        ? withDockProps(createPropertiesSummaryDialog({
            canBind,
            bindingSummary: canBind ? getBindingSummary(selectedItem) : "",
            fieldPath: selectedItem.fieldPath ?? UiText.playground2.options.select,
            textDetails: propertiesTextDetails
        }), "properties")
        : null;

    const dataSourceExplorerNode = showDataSourceExplorer
        ? withDockProps(DataSourceExplorer({
            selectedItem,
            sources,
            topCategories,
            subcategories,
            filteredSources,
            selectedCategoryId,
            selectedSubcategoryId,
            selectedEndpoints,
            availableFields,
            selectedTest,
            arrayValueMessage,
            selectedFieldSpec,
            previewData,
            isSystemSource,
            renderJsonTree,
            onUpdateItem: updateItem,
            onSetSelectedCategoryId: setSelectedCategoryId,
            onSetSelectedSubcategoryId: setSelectedSubcategoryId,
            onRunTest: runTest,
            onClose: () => setShowDataSourceExplorer(false)
        }), "dataSourceExplorer")
        : null;

    const loadingOverlayNode = loadingState.active
        ? createLoadingOverlay({
            step: loadingState.step,
            progress: loadingState.progress,
            log: loadingState.log
        })
        : null;

    const autosaveOverlayNode = isAutoSaving ? createAutosaveOverlay() : null;

    const textStyleEditorNode = selectedItem && selectedItem.type === "text" && showTextStyleEditor
        ? withDockProps(TextStyleEditor({
            selectedItem,
            onUpdateItem: updateItem,
            onClose: () => setShowTextStyleEditor(false)
        }), "textStyleEditor")
        : null;

    const textStylesAiPromptNode = textStylesAiPromptOpen
        ? createTextStylesAiPromptDialog({
            prompt: textStylesAiPrompt,
            response: textStylesAiResponse,
            isGenerating: textStylesAiBusy,
            onPromptChange: (value) => setTextStylesAiPrompt(value),
            onGenerate: handleTextStylesAiGenerate,
            onClose: () => setTextStylesAiPromptOpen(false)
        })
        : null;

    const schedulerOverviewItems = schedulerItems.map((item) => ({
        id: item.id,
        label: item.name ?? item.label ?? item.type,
        bindingSummary: getBindingSummary(item),
        intervalLabel: formatInterval(item.scheduleIntervalMs ?? 0),
        lastRunLabel: formatTimeAgo(scheduleRuns.get(item.id))
    }));

    const scheduleSetupNode = showScheduleSetup && scheduleTarget
        ? withDockProps(createScheduleSetupDialog({
            targetLabel: scheduleTarget.name ?? scheduleTarget.label ?? scheduleTarget.type,
            bindingSummary: getBindingSummary(scheduleTarget),
            intervalMs: scheduleTarget.scheduleIntervalMs ?? 0,
            onUpdateInterval: (value) => updateItem(scheduleTarget.id, { scheduleIntervalMs: value })
        }), "scheduleSetup")
        : null;

    const schedulerOverviewNode = showSchedulerOverview
        ? withDockProps(createSchedulerOverviewDialog({
            scheduleEpoch,
            items: schedulerOverviewItems
        }), "schedulerOverview")
        : null;

    const layersToolboxNode = showLayersToolbox
        ? withDockProps(createLayersToolboxDialog({
            layers: layers,
            activeLayerId: activeLayerId,
            onSelectActiveLayer: handleSelectActiveLayer,
            onAddLayer: handleAddLayer,
            onDeleteLayer: handleDeleteLayer,
            onLayerCss: handleLayerCss,
            onLayerBlending: handleLayerBlending,
            onLayerGroup: handleLayerGroup,
            onLayerLock: handleLayerLock,
            items: items.map((item) => ({
                id: item.id,
                name: item.name,
                type: item.type,
                zIndex: item.zIndex ?? 1,
                visible: item.visible !== false,
                locked: item.locked === true,
                layerId: item.layerId ?? activeLayerId
            })),
            selectedIds: selectedIds,
            onSelectLayer: handleSelectLayer,
            onToggleVisibility: handleToggleVisibility,
            onToggleLock: handleToggleLock,
            onReorderLayer: handleReorderLayer,
            onReorderItem: handleReorderItem,
            itemsExpanded: itemsInLayerExpanded,
            onToggleItemsFold: () => setItemsInLayerExpanded((prev) => !prev),
            onClose: () => setShowLayersToolbox(false)
        }), "layers")
        : null;

    const overlayVideoPreviewNode = showOverlayVideoPreview
        ? withDockProps(createOverlayVideoPreviewDialog({
            videos: activeVideoList,
            selectedId: videoSelectedId,
            currentVideoUrl,
            isLoading: videoLoading,
            statusMessage: videoStatus,
            searchQuery: videoSearchQuery,
            filteredCount: activeVideoList.length,
            totalCount: videoSearchQuery.trim().length > 0
                ? (videoSearchTotal > 0 ? videoSearchTotal : activeVideoList.length)
                : videoPlaylist.length,
            showOverlay: overlayPreviewVisible,
            showGrid: overlayPreviewGrid,
            overlayNodes: overlayPreviewNodes,
            playlistCollapsed,
            onTogglePlaylist: () => setPlaylistCollapsed((prev) => !prev),
            onSelectVideo: (videoId) => selectVideo(videoId),
            onRandom: () => fetchRandomVideo(),
            onSearchChange: (value) => setVideoSearchQuery(value),
            onToggleOverlay: (value) => setOverlayPreviewVisible(value),
            onToggleGrid: (value) => setOverlayPreviewGrid(value),
            onClose: () => setShowOverlayVideoPreview(false)
        }), "overlayPreview")
        : null;

    const textStylesDialogNode = openUiExtensions.has("text-styles")
        ? createTextStylesDialog({
            categories: textStylesCategories,
            activeCategoryId: textStylesCategoryId,
            styles: pagedTextStyles,
            totalCount: textStylesTotalCount,
            selectedId: textStylesSelectedId,
            search: textStylesSearch,
            previewText: textStylesPreviewText,
            customText: textStylesCustomText,
            fontSource: textStylesFontSource,
            weightFilter: textStylesWeightFilter,
            caseFilter: textStylesCaseFilter,
            shadowFilter: textStylesShadowFilter,
            favorites: textStylesFavorites,
            statusTone: textStylesStatusTone,
            canLoadMore: canLoadMoreTextStyles,
            isSyncPreview: textStylesSyncPreview,
            isRefreshing: textStylesRefreshing,
            statusMessage: textStylesStatus,
            onSelectCategory: (id) => setTextStylesCategoryId(id),
            onSelectStyle: (id) => setTextStylesSelectedId(id),
            onApplyStyle: (id) => applyTextStyleById(id),
            onApplySelected: applySelectedTextStyle,
            onToggleFavorite: (id) => toggleTextStyleFavorite(id),
            onHoverStyle: (id) => setTextStylesHoveredId(id),
            onLoadMore: () => {
                if (canLoadMoreTextStyles) {
                    setTextStylesPage((prev) => {
                        const maxTotal = Math.min(textStylesTotalCount, 500);
                        const maxPage = Math.max(1, Math.ceil(maxTotal / textStylesPageSize));
                        return prev < maxPage ? prev + 1 : prev;
                    });
                }
            },
            onToggleSyncPreview: (value) => setTextStylesSyncPreview(value),
            onSearchChange: (value) => setTextStylesSearch(value),
            onPreviewChange: (value) => setTextStylesPreviewText(value),
            onCustomTextChange: (value) => setTextStylesCustomText(value),
            onFontSourceChange: (value) => setTextStylesFontSource(value),
            onWeightFilterChange: (value) => setTextStylesWeightFilter(value),
            onCaseFilterChange: (value) => setTextStylesCaseFilter(value),
            onShadowFilterChange: (value) => setTextStylesShadowFilter(value),
            onRefresh: () => void refreshTextStylesCatalog(),
            onAiPrompt: () => setTextStylesAiPromptOpen(true)
        })
        : null;

    const designerSettingsNode = showDesignerSettings
        ? createDesignerSettingsDialog({
            onClose: "closeDesignerSettings",
            onApply: "applyThemeSelection",
            onConfirm: "closeDesignerSettings",
            themeOptions: themeItems,
            themeSelectedIndex: themeSelection,
            onThemeChange: "changeTheme",
            themeModeOptions: themeModeItems,
            themeModeIndex: themeModeSelection === "dark" ? 1 : 0,
            onThemeModeChange: "changeThemeMode",
            onOpenThemeViewer: "openThemeViewer"
        })
        : null;
    const themeViewerNode = showThemeViewer
        ? createThemeViewerDialog({
            themes: themeItems,
            selectedIndex: themeSelection,
            onThemeSelect: "selectTheme",
            modeOptions: themeModeItems,
            modeSelectedIndex: themeModeSelection === "dark" ? 1 : 0,
            onModeChange: "changeThemeMode",
            onApply: "applyThemeSelection",
            aiPrompt: themeAiPrompt,
            aiResponse: themeAiResponse,
            aiStatus: themeAiStatus,
            aiIsBusy: themeAiBusy,
            aiThemeName: themeAiThemeName,
            aiThemeDescription: themeAiThemeDescription,
            aiOnPromptChange: "aiThemePromptChange",
            aiOnGenerate: "aiThemeGenerate",
            aiOnApply: "aiThemeApply",
            aiOnClear: "aiThemeClear",
            aiOnRefreshStatus: "aiThemeRefresh",
            onClose: "closeThemeViewer"
        })
        : null;

    const extensionDialogNodes = [
        textStylesDialogNode,
        ...dialogExtensions
            .filter((extension) => getExtensionGroupId(extension) !== "text-styles")
            .filter((extension) => openUiExtensions.has(getExtensionGroupId(extension)))
            .flatMap((extension) => normalizeExtensionNodes(extension.form))
    ].filter(Boolean);

    const dockedNodes = [
        isDocked("properties") ? asDocked(propertiesNode) : null,
        isDocked("layers") ? asDocked(layersToolboxNode) : null,
        isDocked("schedulerOverview") ? asDocked(schedulerOverviewNode) : null,
        isDocked("scheduleSetup") ? asDocked(scheduleSetupNode) : null,
        isDocked("dataSourceExplorer") ? asDocked(dataSourceExplorerNode) : null,
        isDocked("textStyleEditor") ? asDocked(textStyleEditorNode) : null,
        isDocked("overlayPreview") ? asDocked(overlayVideoPreviewNode) : null
    ].filter(Boolean);

    const dockPanelNode = buildDockPanelNode({ isDockCollapsed, dockedNodes });
    const floatingNodes = [
        isDocked("properties") ? null : propertiesNode,
        isDocked("layers") ? null : layersToolboxNode,
        isDocked("schedulerOverview") ? null : schedulerOverviewNode,
        isDocked("scheduleSetup") ? null : scheduleSetupNode,
        isDocked("dataSourceExplorer") ? null : dataSourceExplorerNode,
        isDocked("textStyleEditor") ? null : textStyleEditorNode,
        textStylesAiPromptNode,
        isDocked("overlayPreview") ? null : overlayVideoPreviewNode,
        designerSettingsNode,
        themeViewerNode,
        ...extensionDialogNodes
    ].filter(Boolean);

    const formNode = buildPlayground2Designer({
        menuNode,
        contextBarNode,
        canvasFormNode,
        toolboxNode,
        floatingNodes,
        isDockPreview,
        dockPanelNode,
        statusBarNode
    });

    return (
        <>
            <FormContainer node={formNode} handlers={handlers} />
            {loadingOverlayNode}
            {autosaveOverlayNode}
        </>
    );
};



