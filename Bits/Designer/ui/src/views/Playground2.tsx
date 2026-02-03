import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { element, node } from "../forms/core";
import { ControlKind } from "../forms/controlKinds";
import { UiText } from "./uiText";
import { workerRegistry, type WorkerRegistration, type ExecutionLog } from "./workerRegistry";
import { createLayersToolboxDialog, createSchedulerLogsViewDialog, createWorkerDetailsDialog, createWorkersViewDialog } from "./playground2/ui/dialogs";
import { buildDataKey, type ApiFieldSpec, type ApiResponseMetadata, type DataSource, type DataSourceCategory, type TestResponse, type CanvasItem } from "./playground2/domain/types";
import { usePlaygroundHotkeys } from "./playground2/ui/usePlaygroundHotkeys";
import { buildCanvasSurfaceNode } from "./playground2/ui/CanvasSurface";
import { buildDockPanelNode } from "./playground2/ui/DockPanel";
import { buildMenuNode } from "./playground2/ui/MenuBar";
import { buildStatusBarNode } from "./playground2/ui/StatusBar";
import { buildToolboxNode } from "./playground2/ui/ToolboxPanel";
import { createCanvasItem } from "./playground2/domain/itemCommands";
import { createLayer, reassignItemsToLayer } from "./playground2/domain/layerCommands";
import { copyToClipboard, pasteFromClipboard, type ClipboardState } from "./playground2/domain/clipboard";
import { canRedo, canUndo, pushHistory as pushHistoryReducer } from "./playground2/domain/historyReducer";
import { buildFieldSpecs, formatCategoryLabel, parsePathTokens } from "./playground2/services/dataSourceService";
import { loadAutosave as loadAutosaveService, saveAutosave as saveAutosaveService, saveLayout as saveLayoutService } from "./playground2/services/autosaveService";
import { startWorkerScheduler } from "./playground2/services/workerService";
import { useCanvasInteractions } from "./playground2/ui/useCanvasInteractions";
import { Playground2View } from "./playground2/Playground2View";

export const Playground2: React.FC = () => {
    const [status, setStatus] = useState<string>(UiText.playground2.statusIdle);
    const [activeTool, setActiveTool] = useState<string | null>(null);
    const [items, setItems] = useState<CanvasItem[]>([]);
    const [layers, setLayers] = useState<Array<{ id: string; name: string }>>(() => [
        { id: "layer-1", name: "Layer 1" }
    ]);
    const [activeLayerId, setActiveLayerId] = useState<string>("layer-1");
    const [sources, setSources] = useState<DataSource[]>([]);
    const [previews, setPreviews] = useState<Map<string, ApiResponseMetadata>>(new Map());
    const [testResponses, setTestResponses] = useState<Map<string, TestResponse>>(new Map());
    const [liveData, setLiveData] = useState<Map<string, unknown>>(new Map());
    const [virtualState, setVirtualState] = useState<Record<string, unknown>>({});
    const [bindingData, setBindingData] = useState<Record<string, any>>({
        user: { name: "Ada Lovelace", title: "Engineer" },
        media: { imageUrl: "https://via.placeholder.com/320x180.png?text=Bound+Image" },
        metrics: { score: 42 }
    });
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showTextStyleEditor, setShowTextStyleEditor] = useState(false);
    const [showWorkerSetup, setShowWorkerSetup] = useState(false);
    const [showTriggerEditor, setShowTriggerEditor] = useState(false);
    const [showWorkersView, setShowWorkersView] = useState(false);
    const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
    const [showSchedulerLogs, setShowSchedulerLogs] = useState(false);
    const [logsWorkerId, setLogsWorkerId] = useState<string | null>(null);
    const [schedulerLogs, setSchedulerLogs] = useState<ExecutionLog[]>([]);
    const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
    const [itemsInLayerExpanded, setItemsInLayerExpanded] = useState(true);
    const [showDataSourceExplorer, setShowDataSourceExplorer] = useState(false);
    const [showLayersToolbox, setShowLayersToolbox] = useState(true); // Show by default
    const [isDockCollapsed, setIsDockCollapsed] = useState(false);
    const [dockedWindows, setDockedWindows] = useState<string[]>([]);
    const [isDockPreview, setIsDockPreview] = useState(false);
    const [overlayName, setOverlayName] = useState<string>("");
    const [lastPersistedJson, setLastPersistedJson] = useState<string>("");
    const [isSaving, setIsSaving] = useState(false);
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
    const [workerDetailsId, setWorkerDetailsId] = useState<string | null>(null);
    const [activeWorkers, setActiveWorkers] = useState<WorkerRegistration[]>(() => workerRegistry.getWorkers());
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
    const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>("");
    const [imageDisplaySrc, setImageDisplaySrc] = useState<Record<string, string>>({});
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
    const transformHoldUntil = useRef(0);
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
            dock: {
                isDockCollapsed,
                dockedWindows,
                showLayersToolbox,
                showWorkersView,
                showSchedulerLogs,
                showTriggerEditor,
                showDataSourceExplorer,
                showTextStyleEditor,
                showWorkerSetup,
                workerDetailsId: workerDetailsId ?? null
            }
        });
    }, [activeLayerId, dockedWindows, isDockCollapsed, items, layers, overlayName, showDataSourceExplorer, showLayersToolbox, showSchedulerLogs, showTextStyleEditor, showTriggerEditor, showWorkerSetup, showWorkersView, workerDetailsId]);

    const applyLayoutJson = useCallback((json: string) => {
        try {
            const parsed = JSON.parse(json) as {
                items?: typeof items;
                overlayName?: string | null;
                layers?: Array<{ id: string; name: string }>;
                activeLayerId?: string | null;
                dock?: {
                    isDockCollapsed?: boolean;
                    dockedWindows?: string[];
                    showLayersToolbox?: boolean;
                    showWorkersView?: boolean;
                    showSchedulerLogs?: boolean;
                    showTriggerEditor?: boolean;
                    showDataSourceExplorer?: boolean;
                    showTextStyleEditor?: boolean;
                    showWorkerSetup?: boolean;
                    workerDetailsId?: string | null;
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

            if (parsed?.dock) {
                if (typeof parsed.dock.isDockCollapsed === "boolean") {
                    setIsDockCollapsed(parsed.dock.isDockCollapsed);
                }
                if (Array.isArray(parsed.dock.dockedWindows)) {
                    setDockedWindows(parsed.dock.dockedWindows);
                }
                if (typeof parsed.dock.showLayersToolbox === "boolean") {
                    setShowLayersToolbox(parsed.dock.showLayersToolbox);
                }
                if (typeof parsed.dock.showWorkersView === "boolean") {
                    setShowWorkersView(parsed.dock.showWorkersView);
                }
                if (typeof parsed.dock.showSchedulerLogs === "boolean") {
                    setShowSchedulerLogs(parsed.dock.showSchedulerLogs);
                }
                if (typeof parsed.dock.showTriggerEditor === "boolean") {
                    setShowTriggerEditor(parsed.dock.showTriggerEditor);
                }
                if (typeof parsed.dock.showDataSourceExplorer === "boolean") {
                    setShowDataSourceExplorer(parsed.dock.showDataSourceExplorer);
                }
                if (typeof parsed.dock.showTextStyleEditor === "boolean") {
                    setShowTextStyleEditor(parsed.dock.showTextStyleEditor);
                }
                if (typeof parsed.dock.showWorkerSetup === "boolean") {
                    setShowWorkerSetup(parsed.dock.showWorkerSetup);
                }
                if (parsed.dock.workerDetailsId !== undefined) {
                    setWorkerDetailsId(parsed.dock.workerDetailsId);
                }
            }

            if (Array.isArray(parsed?.items)) {
                const nextItems = parsed.items.map(item => item.layerId ? item : { ...item, layerId: fallbackLayerId });
                setItems(nextItems as typeof items);
                setSelectedIds([]);
            }
            setLastPersistedJson(json);
        } catch (err) {
            console.warn("Failed to parse layout json", err);
        }
    }, []);

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

            pushLoading("Loading autosave...", 60);
            try {
                await loadAutosave();
            } catch (err) {
                console.warn("Failed to load autosave", err);
            }

            pushLoading("Preparing canvas...", 85);
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
    }, [loadAutosave, refreshSources]);

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

    useEffect(() => {
        return startWorkerScheduler({
            workers: activeWorkers,
            isTransforming,
            transformHoldUntil,
            runTest,
            workerRegistry
        });
    }, [activeWorkers, isTransforming, runTest]);

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
            }
        }
        return item.src ?? "";
    }, [isSystemSource, resolveFieldValue, sources]);

    const getImageSource = (item: (typeof items)[number]) => imageDisplaySrc[item.id] ?? resolveImageSource(item);

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
    const selectedSource = selectedItem?.sourceId ? sources.find((source) => source.id === selectedItem.sourceId) ?? null : null;
    const selectedEndpoints = !isSystemSource(selectedSource) ? selectedSource?.endpoints ?? [] : [];
    const selectedEndpoint = selectedItem?.endpointPath
        ? selectedEndpoints.find((endpoint) => endpoint.path === selectedItem.endpointPath)
        : null;
    const selectedPreview = selectedItem?.sourceId ? previews.get(selectedItem.sourceId) : undefined;
    const previewFields = selectedPreview?.fields ?? [];
    const endpointFields = selectedEndpoint?.response?.fields ?? [];

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
    const hasBinding = Boolean(
        selectedItem?.sourceId &&
        selectedItem?.fieldPath &&
        (isSystemSource(selectedSource) || selectedItem?.endpointPath)
    );
    const workerDetails = workerDetailsId ? activeWorkers.find((worker) => worker.id === workerDetailsId) ?? null : null;
    const workerDetailsItem = workerDetails ? items.find((item) => item.id === workerDetails.id) ?? null : null;
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


    const handlers = useMemo(
        () => ({
            toolboxSelect: (args: any) => {
                const tool = args?.tool;
                if (tool?.id) {
                    setActiveTool(tool.id);
                }
            },
            openLayersToolbox: () => setShowLayersToolbox(true),
            openWorkersView: () => setShowWorkersView(true),
            openLivePreview: () => {
                const projectId = autosaveProjectIdRef.current;
                const url = `/designer/preview?project=${encodeURIComponent(projectId)}`;
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
            closeWorkerSetup: () => setShowWorkerSetup(false),
            closeWorkerDetails: () => setWorkerDetailsId(null),
            closeTriggerEditor: () => setShowTriggerEditor(false),
            closeDataSourceExplorer: () => setShowDataSourceExplorer(false),
            toggleWorkerEnabled: (args: any) => {
                if (!selectedItem) return;
                updateItem(selectedItem.id, { workerEnabled: Boolean(args?.checked) });
            }
        }),
        [handleDockDragEnd, handleDockDragMove, handleDockDragStart, selectedItem]
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
        updateItem(selectedItem.id, { sourceId: undefined, endpointPath: undefined, fieldPath: undefined });
    }, [selectedItem?.id, selectedItem?.sourceId, sources]);

    useEffect(() => {
        const nextWorkers = items
            .filter((item) => Boolean(item.workerEnabled && item.sourceId && item.endpointPath && item.fieldPath))
            .map((item) => ({
                id: item.id,
                label: item.name ?? item.label ?? item.type,
                type: item.type,
                sourceId: item.sourceId ?? "",
                endpointPath: item.endpointPath ?? "",
                fieldPath: item.fieldPath ?? "",
                trigger: item.workerTrigger,
                intervalMs: item.workerIntervalMs,
                debounceMs: item.workerDebounceMs,
                retryCount: item.workerRetryCount,
                backoffMs: item.workerBackoffMs,
                timeoutMs: item.workerTimeoutMs,
                cacheTtlMs: item.workerCacheTtlMs,
                staleWhileRevalidate: item.workerStaleWhileRevalidate,
                onError: item.workerOnError,
                log: item.workerLog
            }));

        workerRegistry.setWorkers(nextWorkers);
        setActiveWorkers(nextWorkers);
    }, [items]);

    useEffect(() => {
        // Scheduler with concurrency control
        const scheduler = {
            maxConcurrent: 3,
            running: new Set<string>(),
            queue: [] as WorkerRegistration[],
            lastExecution: new Map<string, number>(),

            shouldExecuteNow(worker: WorkerRegistration): boolean {
                const lastTime = this.lastExecution.get(worker.id) || 0;
                const intervalMs = Math.max(worker.intervalMs ?? 5000, 250);
                return Date.now() - lastTime >= intervalMs;
            },

            async executeWorker(worker: WorkerRegistration) {
                if (this.running.size >= this.maxConcurrent) {
                    if (!this.queue.includes(worker)) {
                        this.queue.push(worker);
                        this.updateQueuePositions();
                    }
                    return;
                }

                this.running.add(worker.id);
                workerRegistry.setStatus(worker.id, 'running');
                const startTime = Date.now();
                this.lastExecution.set(worker.id, startTime);

                const logId = `${worker.id}-${startTime}`;
                let logEntry: any = {
                    id: logId,
                    workerId: worker.id,
                    timestamp: startTime,
                    status: 'running' as const,
                    duration: 0,
                    message: 'Executing...',
                    request: {
                        method: 'GET',
                        url: worker.endpointPath
                    }
                };

                try {
                    workerRegistry.setExecuting(worker.id, true);
                    const result = await runTest(worker.sourceId, worker.endpointPath);
                    const duration = Date.now() - startTime;
                    const success = result?.success ?? false;

                    // Capture response body - check both data and response fields
                    const responseBody = result?.data ?? result?.response;

                    logEntry = {
                        ...logEntry,
                        status: success ? 'success' : 'failed',
                        duration,
                        message: success
                            ? `${result?.statusCode || 200} OK - Request completed successfully`
                            : `Error - ${result?.error || 'Request failed'}`,
                        response: {
                            statusCode: result?.statusCode || (success ? 200 : 500),
                            statusText: success ? 'OK' : 'Error',
                            body: responseBody,
                            error: success ? undefined : (result?.error || 'Unknown error')
                        }
                    };

                    workerRegistry.addLog(logEntry);
                    workerRegistry.recordExecution(worker.id, success);
                } catch (error: any) {
                    const duration = Date.now() - startTime;
                    logEntry = {
                        ...logEntry,
                        status: 'failed',
                        duration,
                        message: `Exception - ${error?.message || 'Unknown error'}`,
                        response: {
                            error: error?.message || String(error)
                        }
                    };

                    workerRegistry.addLog(logEntry);
                    workerRegistry.recordExecution(worker.id, false);
                } finally {
                    this.running.delete(worker.id);
                    workerRegistry.setStatus(worker.id, 'idle');
                    workerRegistry.setExecuting(worker.id, false);
                    this.processQueue();
                }
            },

            processQueue() {
                while (this.queue.length > 0 && this.running.size < this.maxConcurrent) {
                    const worker = this.queue.shift();
                    if (worker) {
                        void this.executeWorker(worker);
                    }
                }
                this.updateQueuePositions();
            },

            updateQueuePositions() {
                this.queue.forEach((worker, index) => {
                    workerRegistry.setStatus(worker.id, 'queued', index + 1);
                });
            }
        };

        // Single tick - check all workers every 250ms
        const tick = setInterval(() => {
            if (isTransforming || Date.now() < transformHoldUntil.current) return;

            activeWorkers.forEach(worker => {
                if (!worker.sourceId || !worker.endpointPath) return;

                // Handle onLoad/onVisible triggers (run once)
                if (worker.trigger === "onLoad" || worker.trigger === "onVisible") {
                    if (!scheduler.lastExecution.has(worker.id)) {
                        void scheduler.executeWorker(worker);
                    }
                    return;
                }

                // Handle interval-based workers
                if (scheduler.shouldExecuteNow(worker)) {
                    void scheduler.executeWorker(worker);
                }
            });
        }, 250);

        return () => {
            clearInterval(tick);
        };
    }, [activeWorkers, isTransforming, runTest]);

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
        const interval = window.setInterval(() => {
            if (isSaving || !isDirty) {
                return;
            }
            const json = currentJson;
            setIsSaving(true);
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
                }
            })();
        }, 1000);

        return () => window.clearInterval(interval);
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

    const layoutNode = buildCanvasSurfaceNode({
        items,
        selectedIds,
        getItemStyle,
        getDisplayLabel,
        getProgressPercent,
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

    const canvasFormNode = node(
        ControlKind.panel,
        {
            className: "playground2-canvas-form",
            style: "position: relative; flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; overflow: auto;"
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

    const propertiesNode = selectedItem
        ? withDockProps(node(
            ControlKind.window,
            {
                title: UiText.playground2.propertiesTitle,
                dialog: true,
                close: false,
                minimize: false,
                maximize: false,
                draggable: true,
                style: "position: absolute; right: 16px; top: 52px; width: fit-content; max-width: 300px;"
            },
            element(
                "div",
                { className: "properties-container" },
                element(
                    "div",
                    { className: "canvas-properties" },
                    node(
                        ControlKind.tabControl,
                        { style: "width: 100%;", multirows: true },
                        node(
                            ControlKind.tabPage,
                            { text: UiText.playground2.sections.basic },
                            element("div", { className: "canvas-properties-section" },
                                element("div", { className: "canvas-properties-row" },
                                    element("label", null, UiText.playground2.labels.type),
                                    element("div", { className: "canvas-properties-readonly" }, selectedItem.type)
                                ),
                                element("div", { className: "canvas-properties-row" },
                                    element("label", null, "Name"),
                                    element("input", {
                                        type: "text",
                                        value: selectedItem.name ?? "",
                                        onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { name: event.target.value })
                                    })
                                ),
                                element("div", { className: "canvas-properties-row" },
                                    element("label", null, UiText.playground2.labels.x),
                                    element("input", {
                                        type: "number",
                                        value: selectedItem.x,
                                        onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { x: Number(event.target.value) || 0 })
                                    })
                                ),
                                element("div", { className: "canvas-properties-row" },
                                    element("label", null, UiText.playground2.labels.y),
                                    element("input", {
                                        type: "number",
                                        value: selectedItem.y,
                                        onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { y: Number(event.target.value) || 0 })
                                    })
                                ),
                                element("div", { className: "canvas-properties-row" },
                                    element("label", null, UiText.playground2.labels.w),
                                    element("input", {
                                        type: "number",
                                        value: selectedItem.width,
                                        onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { width: Math.max(2, Number(event.target.value) || 0) })
                                    })
                                ),
                                element("div", { className: "canvas-properties-row" },
                                    element("label", null, UiText.playground2.labels.h),
                                    element("input", {
                                        type: "number",
                                        value: selectedItem.height,
                                        onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                                            const nextHeight = Math.max(2, Number(event.target.value) || 0);
                                            if (selectedItem.type === "line") {
                                                updateItem(selectedItem.id, { height: nextHeight, strokeWidth: nextHeight });
                                            } else {
                                                updateItem(selectedItem.id, { height: nextHeight });
                                            }
                                        }
                                    })
                                ),
                                selectedItem.type === "text"
                                    ? element("div", { className: "canvas-properties-row" },
                                        element("label", null, UiText.playground2.labels.text),
                                        element("input", {
                                            type: "text",
                                            value: selectedItem.label ?? "",
                                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { label: event.target.value })
                                        })
                                    )
                                    : null,
                                selectedItem.type === "image"
                                    ? element("div", { className: "canvas-properties-row" },
                                        element("label", null, UiText.playground2.labels.imageUrl),
                                        element("input", {
                                            type: "text",
                                            value: selectedItem.src ?? "",
                                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { src: event.target.value })
                                        })
                                    )
                                    : null,
                                selectedItem.type === "progress"
                                    ? element("div", { className: "canvas-properties-row" },
                                        element("label", null, UiText.playground2.labels.value),
                                        element("input", {
                                            type: "number",
                                            value: selectedItem.value ?? 0,
                                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { value: Number(event.target.value) || 0 })
                                        })
                                    )
                                    : null,
                                selectedItem.type === "progress"
                                    ? element("div", { className: "canvas-properties-row" },
                                        element("label", null, UiText.playground2.labels.min),
                                        element("input", {
                                            type: "number",
                                            value: selectedItem.minimum ?? 0,
                                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { minimum: Number(event.target.value) || 0 })
                                        })
                                    )
                                    : null,
                                selectedItem.type === "progress"
                                    ? element("div", { className: "canvas-properties-row" },
                                        element("label", null, UiText.playground2.labels.max),
                                        element("input", {
                                            type: "number",
                                            value: selectedItem.maximum ?? 100,
                                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { maximum: Number(event.target.value) || 100 })
                                        })
                                    )
                                    : null,
                                selectedItem.type === "progress"
                                    ? element("div", { className: "canvas-properties-row" },
                                        element("label", null, UiText.playground2.labels.progressStyle),
                                        element(
                                            "select",
                                            {
                                                value: selectedItem.progressStyle ?? "blocks",
                                                onChange: (event: React.ChangeEvent<HTMLSelectElement>) => updateItem(selectedItem.id, { progressStyle: event.target.value as "blocks" | "continuous" })
                                            },
                                            ...UiText.playground2.options.progressStyles.map((option) =>
                                                element("option", { value: option.value }, option.label)
                                            )
                                        )
                                    )
                                    : null,
                                selectedItem.type === "rect" || selectedItem.type === "ellipse"
                                    ? element(
                                        "div",
                                        { className: "canvas-properties-row" },
                                        element("label", null, UiText.playground2.labels.fill),
                                        element("input", {
                                            type: "color",
                                            value: selectedItem.fill && selectedItem.fill !== "transparent" ? selectedItem.fill : "#ffffff",
                                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { fill: event.target.value })
                                        }),
                                        element("button", {
                                            className: "canvas-properties-button",
                                            onClick: () => updateItem(selectedItem.id, { fill: "transparent" })
                                        }, UiText.playground2.buttons.clear)
                                    )
                                    : null,
                                selectedItem.type === "rect" || selectedItem.type === "ellipse" || selectedItem.type === "line"
                                    ? element(
                                        "div",
                                        { className: "canvas-properties-row" },
                                        element("label", null, UiText.playground2.labels.stroke),
                                        element("input", {
                                            type: "color",
                                            value: selectedItem.stroke ?? "#2f2f2f",
                                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { stroke: event.target.value })
                                        })
                                    )
                                    : null,
                                selectedItem.type === "line"
                                    ? element(
                                        "div",
                                        { className: "canvas-properties-row" },
                                        element("label", null, UiText.playground2.labels.thickness),
                                        element("input", {
                                            type: "number",
                                            value: selectedItem.strokeWidth ?? selectedItem.height,
                                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { strokeWidth: Math.max(2, Number(event.target.value) || 2), height: Math.max(2, Number(event.target.value) || 2) })
                                        })
                                    )
                                    : null
                            )
                        ),
                        node(
                            ControlKind.tabPage,
                            { text: UiText.playground2.sections.binding },
                            element("div", { className: "canvas-properties-section" },
                                canBind
                                    ? element("div", { className: "canvas-properties-row" },
                                        element("label", null, UiText.playground2.labels.bindingSummary),
                                        element("div", { className: "canvas-properties-readonly" }, getBindingSummary(selectedItem))
                                    )
                                    : element("div", { className: "canvas-properties-empty" }, UiText.playground2.empty.noBinding),
                                canBind
                                    ? element("div", { className: "canvas-properties-row" },
                                        element("label", null, UiText.playground2.labels.path),
                                        element("div", { className: "canvas-properties-readonly" }, selectedItem.fieldPath ?? UiText.playground2.options.select)
                                    )
                                    : null,
                                canBind
                                    ? element(
                                        "div",
                                        { className: "canvas-properties-row" },
                                        element("label", null, UiText.playground2.labels.explorer),
                                        element("button", {
                                            className: "canvas-properties-button",
                                            onClick: () => setShowDataSourceExplorer(true)
                                        }, UiText.playground2.buttons.openExplorer)
                                    )
                                    : null
                            )
                        ),
                        selectedItem.type === "text"
                            ? node(
                                ControlKind.tabPage,
                                { text: UiText.playground2.sections.text },
                                element("div", { className: "canvas-properties-section" },
                                    element("div", { className: "canvas-properties-row" },
                                        element("label", null, UiText.playground2.labels.font),
                                        element(
                                            "select",
                                            {
                                                value: selectedItem.fontFamily ?? UiText.playground2.options.fonts[0],
                                                onChange: (event: React.ChangeEvent<HTMLSelectElement>) => updateItem(selectedItem.id, { fontFamily: event.target.value })
                                            },
                                            ...UiText.playground2.options.fonts.map((font) => element("option", { value: font }, font))
                                        )
                                    ),
                                    element("div", { className: "canvas-properties-row" },
                                        element("label", null, UiText.playground2.labels.size),
                                        element("input", {
                                            type: "number",
                                            min: 8,
                                            max: 72,
                                            value: selectedItem.fontSize ?? 16,
                                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { fontSize: Math.max(8, Number(event.target.value) || 16) })
                                        })
                                    ),
                                    element("div", { className: "canvas-properties-row" },
                                        element("label", null, UiText.playground2.labels.weight),
                                        element(
                                            "select",
                                            {
                                                value: selectedItem.fontWeight ?? "normal",
                                                onChange: (event: React.ChangeEvent<HTMLSelectElement>) => updateItem(selectedItem.id, { fontWeight: event.target.value })
                                            },
                                            ...UiText.playground2.options.weights.map((weight) => element("option", { value: weight }, weight))
                                        )
                                    ),
                                    element("div", { className: "canvas-properties-row" },
                                        element("label", null, UiText.playground2.labels.style),
                                        element(
                                            "select",
                                            {
                                                value: selectedItem.fontStyle ?? "normal",
                                                onChange: (event: React.ChangeEvent<HTMLSelectElement>) => updateItem(selectedItem.id, { fontStyle: event.target.value as "normal" | "italic" })
                                            },
                                            ...UiText.playground2.options.styles.map((style) => element("option", { value: style }, style))
                                        )
                                    ),
                                    element("div", { className: "canvas-properties-row" },
                                        element("label", null, UiText.playground2.labels.color),
                                        element("input", {
                                            type: "color",
                                            value: selectedItem.textColor ?? "#222222",
                                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { textColor: event.target.value })
                                        })
                                    ),
                                    element("div", { className: "canvas-properties-row" },
                                        element("label", null, UiText.playground2.labels.transform),
                                        element(
                                            "select",
                                            {
                                                value: selectedItem.textTransform ?? "none",
                                                onChange: (event: React.ChangeEvent<HTMLSelectElement>) => updateItem(selectedItem.id, { textTransform: event.target.value as "none" | "uppercase" | "lowercase" })
                                            },
                                            ...UiText.playground2.options.transforms.map((transform) => element("option", { value: transform }, transform))
                                        )
                                    ),
                                    element("div", { className: "canvas-properties-row" },
                                        element("label", null, UiText.playground2.labels.letterSpacing),
                                        element("input", {
                                            type: "number",
                                            min: -2,
                                            max: 12,
                                            step: 0.5,
                                            value: selectedItem.letterSpacing ?? 0,
                                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { letterSpacing: Number(event.target.value) || 0 })
                                        })
                                    ),
                                    element("div", { className: "canvas-properties-row" },
                                        element("label", null, UiText.playground2.labels.effects),
                                        element("button", { className: "canvas-properties-button", onClick: () => setShowTextStyleEditor(true) }, UiText.playground2.buttons.effects)
                                    )
                                )
                            )
                            : null,
                        node(
                            ControlKind.tabPage,
                            { text: UiText.playground2.sections.worker },
                            element("div", { className: "canvas-properties-section" },
                                hasBinding
                                    ? element("div", { className: "canvas-properties-row" },
                                        element("label", null, UiText.playground2.labels.autoRefresh),
                                        node(ControlKind.checkBox, {
                                            checked: Boolean(selectedItem.workerEnabled),
                                            onChange: "toggleWorkerEnabled"
                                        })
                                    )
                                    : element("div", { className: "canvas-properties-empty" }, UiText.playground2.empty.noWorker),
                                hasBinding
                                    ? element("div", { className: "canvas-properties-row" },
                                        element("label", null, UiText.playground2.labels.interval),
                                        element("input", {
                                            type: "number",
                                            min: 250,
                                            value: selectedItem.workerIntervalMs ?? 5000,
                                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { workerIntervalMs: Math.max(250, Number(event.target.value) || 0) }),
                                            disabled: !selectedItem.workerEnabled
                                        })
                                    )
                                    : null,
                                hasBinding
                                    ? element("div", { className: "canvas-properties-row", style: "justify-content: flex-end;" },
                                        element("button", { className: "canvas-properties-button", onClick: () => setShowTriggerEditor(true) }, UiText.playground2.buttons.triggers),
                                        element("button", { className: "canvas-properties-button", onClick: () => setShowWorkerSetup(true) }, UiText.playground2.buttons.moreOptions)
                                    )
                                    : null
                            )
                        ),
                        node(
                            ControlKind.tabPage,
                            { text: UiText.playground2.sections.events },
                            element("div", { className: "canvas-properties-section" },
                                element("div", { className: "canvas-properties-event" }, UiText.playground2.eventSample)
                            )
                        )
                    )
                )
            )
        ), "properties")
        : null;

    const dataSourceExplorerNode = showDataSourceExplorer
        ? withDockProps(node(
            ControlKind.window,
            {
                title: UiText.playground2.explorerTitle,
                dialog: true,
                draggable: true,
                onClose: "closeDataSourceExplorer",
                style: "position: absolute; left: 260px; top: 72px; width: min(980px, 92vw);"
            },
            element(
                "div",
                { className: "data-source-explorer" },
                !canBind || !selectedItem
                    ? element("div", { className: "canvas-properties-empty" }, UiText.playground2.empty.noBinding)
                    : element(
                        "div",
                        { className: "data-source-explorer-body" },
                        element("div", { className: "data-source-explorer-main" },
                            element("div", { className: "canvas-properties-section" },
                                element("div", { className: "canvas-properties-row" },
                                    element("label", null, UiText.playground2.labels.category),
                                    element(
                                        "select",
                                        {
                                            value: selectedCategoryId,
                                            onChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
                                                const nextCategoryId = event.target.value || "";
                                                setSelectedCategoryId(nextCategoryId);
                                                setSelectedSubcategoryId("");
                                            }
                                        },
                                        element("option", { value: "" }, UiText.playground2.options.select),
                                        ...topCategories.map((category) => element("option", { value: category.id }, category.name))
                                    )
                                ),
                                element("div", { className: "canvas-properties-row" },
                                    element("label", null, UiText.playground2.labels.subcategory),
                                    element(
                                        "select",
                                        {
                                            value: selectedSubcategoryId,
                                            disabled: !selectedCategoryId || subcategories.length === 0,
                                            onChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
                                                setSelectedSubcategoryId(event.target.value || "");
                                            }
                                        },
                                        element("option", { value: "" }, UiText.playground2.options.select),
                                        ...subcategories.map((category) => element("option", { value: category.id }, category.name))
                                    )
                                ),
                                element("div", { className: "canvas-properties-row" },
                                    element("label", null, UiText.playground2.labels.source),
                                    element(
                                        "select",
                                        {
                                            value: selectedItem.sourceId ?? "",
                                            onChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
                                                const nextSourceId = event.target.value || undefined;
                                                updateItem(selectedItem.id, { sourceId: nextSourceId, endpointPath: undefined, fieldPath: undefined });
                                            }
                                        },
                                        element("option", { value: "" }, UiText.playground2.options.select),
                                        ...filteredSources.map((source) => element("option", { value: source.id }, source.name))
                                    )
                                ),
                                !isSystemSource(selectedSource)
                                    ? element("div", { className: "canvas-properties-row" },
                                        element("label", null, UiText.playground2.labels.endpoint),
                                        element(
                                            "select",
                                            {
                                                value: selectedItem.endpointPath ?? "",
                                                onChange: (event: React.ChangeEvent<HTMLSelectElement>) => updateItem(selectedItem.id, { endpointPath: event.target.value || undefined, fieldPath: undefined })
                                            },
                                            element("option", { value: "" }, UiText.playground2.options.select),
                                            ...selectedEndpoints.map((endpoint) => element("option", { value: endpoint.path }, `${endpoint.method} ${endpoint.path}`))
                                        )
                                    )
                                    : null,
                                !isSystemSource(selectedSource)
                                    ? element("div", { className: "canvas-properties-row" },
                                        element("label", null, UiText.playground2.labels.fetch),
                                        element("div", { style: "display: flex; align-items: center; gap: 8px;" },
                                            element("button", {
                                                className: "canvas-properties-button",
                                                disabled: !selectedItem.sourceId || !selectedItem.endpointPath,
                                                onClick: () => {
                                                    if (!selectedItem.sourceId || !selectedItem.endpointPath) return;
                                                    void runTest(selectedItem.sourceId, selectedItem.endpointPath);
                                                }
                                            }, UiText.playground2.buttons.test),
                                            selectedTest
                                                ? element("div", { className: "canvas-properties-readonly" }, selectedTest.success ? `OK (${selectedTest.statusCode})` : `Error (${selectedTest.statusCode})`)
                                                : element("div", { className: "canvas-properties-readonly" }, UiText.playground2.empty.noTest)
                                        )
                                    )
                                    : null
                                ,
                                arrayValueMessage
                                    ? element("div", { className: "canvas-properties-row" },
                                        element("label", null, "Info"),
                                        element("div", { className: "canvas-properties-readonly" }, arrayValueMessage)
                                    )
                                    : null
                            ),
                            element("div", { className: "data-source-explorer-grid" },
                                element("div", { className: "data-source-explorer-panel" },
                                    element("div", { className: "data-source-explorer-title" }, UiText.playground2.labels.field),
                                    availableFields.length > 0
                                        ? element(
                                            "div",
                                            { className: "data-source-explorer-fields" },
                                            ...availableFields.map((field) => {
                                                const isContainer = Boolean(field.isContainer);
                                                const isActive = selectedFieldKey === field.path;
                                                const indent = Math.min(4, getFieldDepth(field.path)) * 12;
                                                return element(
                                                    "div",
                                                    {
                                                        key: field.path,
                                                        className: `data-source-explorer-field ${isContainer ? "is-container" : ""} ${isActive ? "is-active" : ""}`.trim(),
                                                        style: `padding-left: ${indent}px;`,
                                                        onClick: () => {
                                                            if (isContainer) return;
                                                            updateItem(selectedItem.id, { fieldPath: `response.${field.path}` });
                                                        }
                                                    },
                                                    element("span", null, field.path)
                                                );
                                            })
                                        )
                                        : element("div", { className: "canvas-properties-empty" }, UiText.playground2.empty.noBinding)
                                ),
                                element("div", { className: "data-source-explorer-panel" },
                                    element("div", { className: "data-source-explorer-title" }, UiText.playground2.labels.preview),
                                    element(
                                        "div",
                                        { className: "data-source-explorer-preview" },
                                        previewData !== undefined
                                            ? renderJsonTree("response", previewData, 0, "response")
                                            : element("div", { className: "canvas-properties-empty" }, UiText.playground2.empty.noPreview)
                                    )
                                )
                            )
                        ),
                        element("div", { className: "data-source-explorer-footer" },
                            element("div", { className: "canvas-properties-section" },
                                element("div", { className: "canvas-properties-row" },
                                    element("label", null, UiText.playground2.labels.bindTo),
                                    element(
                                        "div",
                                        { className: "canvas-properties-readonly" },
                                        `${selectedItem.name ?? selectedItem.label ?? selectedItem.type} · ${selectedItem.type === "image"
                                            ? UiText.playground2.labels.imageUrl
                                            : selectedItem.type === "progress"
                                                ? UiText.playground2.labels.value
                                                : UiText.playground2.labels.text
                                        }`
                                    )
                                ),
                                element("div", { className: "canvas-properties-row" },
                                    element("label", null, UiText.playground2.labels.path),
                                    element("input", {
                                        type: "text",
                                        placeholder: UiText.playground2.placeholders.fieldPath,
                                        value: selectedItem.fieldPath ?? "",
                                        onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { fieldPath: event.target.value })
                                    })
                                ),
                                selectedItem.type === "text"
                                    ? element("div", { className: "canvas-properties-row" },
                                        element("label", null, UiText.playground2.labels.format),
                                        element(
                                            "select",
                                            {
                                                value: selectedItem.format ?? "text",
                                                onChange: (event: React.ChangeEvent<HTMLSelectElement>) => updateItem(selectedItem.id, { format: event.target.value as "text" | "uppercase" | "json" })
                                            },
                                            element("option", { value: "text" }, UiText.playground2.options.formatText),
                                            element("option", { value: "uppercase" }, UiText.playground2.options.formatUppercase),
                                            element("option", { value: "json" }, UiText.playground2.options.formatJson)
                                        )
                                    )
                                    : null,
                                selectedFieldSpec?.example
                                    ? element("div", { className: "canvas-properties-row" },
                                        element("label", null, UiText.playground2.labels.example),
                                        element("div", { className: "canvas-properties-readonly" }, String(selectedFieldSpec.example))
                                    )
                                    : null
                            ),
                            element("div", { style: "display: flex; justify-content: flex-end; gap: 8px; padding: 8px 12px;" },
                                element("button", { className: "canvas-properties-button", onClick: () => setShowDataSourceExplorer(false) }, UiText.playground2.buttons.close),
                                element("button", { className: "canvas-properties-button", onClick: () => setShowDataSourceExplorer(false) }, UiText.playground2.buttons.bind)
                            )
                        )
                    )
            )
        ), "dataSourceExplorer")
        : null;

    const loadingOverlayNode = loadingState.active && typeof document !== "undefined"
        ? createPortal(
            <div className="designer-loading-overlay">
                <div className="window designer-loading-window" role="dialog" aria-modal="true">
                    <div className="title-bar">
                        <div className="title-bar-text">StreamCraft Designer</div>
                    </div>
                    <div className="window-body designer-loading-body">
                        <div className="designer-loading-step">{loadingState.step}</div>
                        <div className="progressbar" style={{ width: "100%" }}>
                            <div
                                className="progressbar-fill progressbar-blocks"
                                style={{ width: `${Math.min(100, Math.max(0, loadingState.progress))}%` }}
                            >
                                <div className="progressbar-blocks-pattern"></div>
                            </div>
                        </div>
                        <div className="designer-loading-log">
                            {loadingState.log.map((entry, index) => (
                                <div key={`${index}-${entry}`} className="designer-loading-log-entry">{entry}</div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>,
            document.body
        )
        : null;

    const textStyleEditorNode = selectedItem && selectedItem.type === "text" && showTextStyleEditor
        ? withDockProps(node(
            ControlKind.window,
            {
                title: UiText.playground2.textEditorTitle,
                dialog: true,
                draggable: true,
                onClose: "closeTextStyleEditor",
                style: "position: absolute; right: 320px; top: 52px; width: fit-content; max-width: 420px;"
            },
            element("div", { className: "canvas-properties" },
                element("div", { className: "canvas-properties-section" },
                    element("div", { className: "canvas-properties-row" },
                        element("label", null, UiText.playground2.labels.shadowX),
                        element("input", {
                            type: "number",
                            min: -20,
                            max: 20,
                            value: selectedItem.textShadowX ?? 0,
                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { textShadowX: Number(event.target.value) || 0 })
                        })
                    ),
                    element("div", { className: "canvas-properties-row" },
                        element("label", null, UiText.playground2.labels.shadowY),
                        element("input", {
                            type: "number",
                            min: -20,
                            max: 20,
                            value: selectedItem.textShadowY ?? 0,
                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { textShadowY: Number(event.target.value) || 0 })
                        })
                    ),
                    element("div", { className: "canvas-properties-row" },
                        element("label", null, UiText.playground2.labels.shadowBlur),
                        element("input", {
                            type: "number",
                            min: 0,
                            max: 40,
                            value: selectedItem.textShadowBlur ?? 0,
                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { textShadowBlur: Math.max(0, Number(event.target.value) || 0) })
                        })
                    ),
                    element("div", { className: "canvas-properties-row" },
                        element("label", null, UiText.playground2.labels.shadowColor),
                        element("input", {
                            type: "color",
                            value: selectedItem.textShadowColor ?? "#000000",
                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { textShadowColor: event.target.value })
                        })
                    )
                )
            )
        ), "textStyleEditor")
        : null;

    const workerSetupNode = selectedItem && showWorkerSetup
        ? withDockProps(node(
            ControlKind.window,
            {
                title: UiText.playground2.workerSetupTitle,
                dialog: true,
                draggable: true,
                onClose: "closeWorkerSetup",
                style: "position: absolute; right: 320px; top: 200px; width: fit-content; max-width: 520px;"
            },
            element("div", { className: "canvas-properties" },
                element("div", { className: "canvas-properties-section" },
                    element("div", { className: "canvas-properties-row" },
                        element("label", null, UiText.playground2.labels.enabled),
                        node(ControlKind.checkBox, {
                            checked: Boolean(selectedItem.workerEnabled),
                            onChange: "toggleWorkerEnabled"
                        })
                    ),
                    element("div", { className: "canvas-properties-row" },
                        element("label", null, UiText.playground2.labels.trigger),
                        element(
                            "select",
                            {
                                value: selectedItem.workerTrigger ?? "interval",
                                onChange: (event: React.ChangeEvent<HTMLSelectElement>) => updateItem(selectedItem.id, { workerTrigger: event.target.value as "interval" | "onLoad" | "onVisible" }),
                                disabled: !selectedItem.workerEnabled
                            },
                            ...UiText.playground2.options.workerTriggers.map((trigger) => element("option", { value: trigger.value }, trigger.label))
                        )
                    ),
                    element("div", { className: "canvas-properties-row" },
                        element("label", null, UiText.playground2.labels.interval),
                        element("input", {
                            type: "number",
                            min: 250,
                            value: selectedItem.workerIntervalMs ?? 5000,
                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { workerIntervalMs: Math.max(250, Number(event.target.value) || 0) }),
                            disabled: !selectedItem.workerEnabled
                        })
                    ),
                    element("div", { className: "canvas-properties-row" },
                        element("label", null, UiText.playground2.labels.debounce),
                        element("input", {
                            type: "number",
                            min: 0,
                            value: selectedItem.workerDebounceMs ?? 300,
                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { workerDebounceMs: Math.max(0, Number(event.target.value) || 0) }),
                            disabled: !selectedItem.workerEnabled
                        })
                    ),
                    element("div", { className: "canvas-properties-row" },
                        element("label", null, UiText.playground2.labels.retryCount),
                        element("input", {
                            type: "number",
                            min: 0,
                            value: selectedItem.workerRetryCount ?? 2,
                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { workerRetryCount: Math.max(0, Number(event.target.value) || 0) }),
                            disabled: !selectedItem.workerEnabled
                        })
                    ),
                    element("div", { className: "canvas-properties-row" },
                        element("label", null, UiText.playground2.labels.backoff),
                        element("input", {
                            type: "number",
                            min: 0,
                            value: selectedItem.workerBackoffMs ?? 1000,
                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { workerBackoffMs: Math.max(0, Number(event.target.value) || 0) }),
                            disabled: !selectedItem.workerEnabled
                        })
                    ),
                    element("div", { className: "canvas-properties-row" },
                        element("label", null, UiText.playground2.labels.timeout),
                        element("input", {
                            type: "number",
                            min: 500,
                            value: selectedItem.workerTimeoutMs ?? 5000,
                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { workerTimeoutMs: Math.max(500, Number(event.target.value) || 0) }),
                            disabled: !selectedItem.workerEnabled
                        })
                    ),
                    element("div", { className: "canvas-properties-row" },
                        element("label", null, UiText.playground2.labels.cacheTtl),
                        element("input", {
                            type: "number",
                            min: 0,
                            value: selectedItem.workerCacheTtlMs ?? 30000,
                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { workerCacheTtlMs: Math.max(0, Number(event.target.value) || 0) }),
                            disabled: !selectedItem.workerEnabled
                        })
                    ),
                    element("div", { className: "canvas-properties-row" },
                        element("label", null, UiText.playground2.labels.staleWhileRevalidate),
                        element("input", {
                            type: "checkbox",
                            checked: Boolean(selectedItem.workerStaleWhileRevalidate),
                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { workerStaleWhileRevalidate: event.target.checked }),
                            disabled: !selectedItem.workerEnabled
                        })
                    ),
                    element("div", { className: "canvas-properties-row" },
                        element("label", null, UiText.playground2.labels.onError),
                        element(
                            "select",
                            {
                                value: selectedItem.workerOnError ?? "notify",
                                onChange: (event: React.ChangeEvent<HTMLSelectElement>) => updateItem(selectedItem.id, { workerOnError: event.target.value as "ignore" | "fallback" | "notify" }),
                                disabled: !selectedItem.workerEnabled
                            },
                            ...UiText.playground2.options.workerErrors.map((option) => element("option", { value: option.value }, option.label))
                        )
                    ),
                    element("div", { className: "canvas-properties-row" },
                        element("label", null, UiText.playground2.labels.workerLog),
                        element("input", {
                            type: "checkbox",
                            checked: Boolean(selectedItem.workerLog),
                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { workerLog: event.target.checked }),
                            disabled: !selectedItem.workerEnabled
                        })
                    )
                ),
                element("div", { style: "display: flex; justify-content: flex-end; gap: 8px; padding: 8px 12px;" },
                    element("button", { className: "canvas-properties-button", onClick: () => setShowWorkerSetup(false) }, UiText.playground2.buttons.close)
                )
            )
        ), "workerSetup")
        : null;

    const workersViewNode = showWorkersView
        ? withDockProps(createWorkersViewDialog({
            activeWorkers: activeWorkers.map(worker => {
                const stats = workerRegistry.getStats(worker.id);
                const item = items.find(i => i.id === worker.id);
                return {
                    ...worker,
                    workerEnabled: item?.workerEnabled ?? false,
                    lastExecutionTime: stats?.lastExecutionTime,
                    totalExecutions: stats?.totalExecutions || 0,
                    successRate: stats?.successRate || 0,
                    isExecuting: stats?.isExecuting || false,
                    lastExecutionHadError: stats?.lastExecutionHadError || false,
                    status: stats?.status || 'idle',
                    queuePosition: stats?.queuePosition
                };
            }),
            selectedWorkerId,
            onWorkerSelect: (workerId) => setSelectedWorkerId(workerId),
            onWorkerDoubleClick: (workerId) => setWorkerDetailsId(workerId),
            onStart: (workerId) => {
                const item = items.find(i => i.id === workerId);
                if (item) updateItem(item.id, { workerEnabled: true });
            },
            onStop: (workerId) => {
                const item = items.find(i => i.id === workerId);
                if (item) updateItem(item.id, { workerEnabled: false });
            },
            onViewLogs: (workerId) => {
                setLogsWorkerId(workerId);
                setShowSchedulerLogs(true);
            },
            onDetails: (workerId) => setWorkerDetailsId(workerId),
            onClose: () => {
                setShowWorkersView(false);
                setSelectedWorkerId(null);
            }
        }), "workers")
        : null;

    const triggersNode = showTriggerEditor && selectedItem
        ? withDockProps(node(
            ControlKind.window,
            {
                title: UiText.playground2.triggersTitle,
                dialog: true,
                draggable: true,
                onClose: "closeTriggerEditor",
                style: "position: absolute; right: 24px; top: 252px; width: fit-content; max-width: 520px;"
            },
            element("div", { className: "canvas-properties" },
                element("div", { className: "canvas-properties-section" },
                    element("div", { className: "canvas-properties-empty" }, "Trigger builder coming soon.")
                ),
                element("div", { style: "display: flex; justify-content: flex-end; padding: 8px 12px;" },
                    element("button", { className: "canvas-properties-button", onClick: () => setShowTriggerEditor(false) }, UiText.playground2.buttons.close)
                )
            )
        ), "triggers")
        : null;

    const workerDetailsNode = workerDetails && workerDetailsItem
        ? withDockProps(createWorkerDetailsDialog({
            workerDetails,
            workerDetailsItem,
            onStart: () => updateItem(workerDetailsItem.id, { workerEnabled: true }),
            onStop: () => updateItem(workerDetailsItem.id, { workerEnabled: false }),
            onClose: () => setWorkerDetailsId(null)
        }), "workerDetails")
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

    const schedulerLogsNode = showSchedulerLogs && logsWorkerId
        ? (() => {
            const worker = activeWorkers.find(w => w.id === logsWorkerId);
            return worker ? withDockProps(createSchedulerLogsViewDialog({
                workerId: logsWorkerId,
                workerLabel: worker.label,
                logs: schedulerLogs,
                selectedLogId: selectedLogId ?? undefined,
                onSelectLog: (logId: string) => setSelectedLogId(logId),
                expandedPaths: expandedPaths,
                onToggleExpand: (path: string) => {
                    setExpandedPaths(prev => {
                        const next = new Set(prev);
                        if (next.has(path)) {
                            next.delete(path);
                        } else {
                            next.add(path);
                        }
                        return next;
                    });
                },
                onClose: () => {
                    setShowSchedulerLogs(false);
                    setLogsWorkerId(null);
                    setSelectedLogId(null);
                    setExpandedPaths(new Set());
                },
                onClearLogs: async (workerId) => {
                    await workerRegistry.clearLogs(workerId);
                    setSchedulerLogs([]);
                    setSelectedLogId(null);
                    setExpandedPaths(new Set());
                    setShowSchedulerLogs(false);
                    setLogsWorkerId(null);
                },
                onExportLogs: async (workerId) => {
                    const logs = await workerRegistry.getLogs(workerId);
                    const json = JSON.stringify(logs, null, 2);
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `scheduler-logs-${worker.label}-${Date.now()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                }
            }), "schedulerLogs") : null;
        })()
        : null;

    const dockedNodes = [
        isDocked("properties") ? asDocked(propertiesNode) : null,
        isDocked("layers") ? asDocked(layersToolboxNode) : null,
        isDocked("workers") ? asDocked(workersViewNode) : null,
        isDocked("workerDetails") ? asDocked(workerDetailsNode) : null,
        isDocked("schedulerLogs") ? asDocked(schedulerLogsNode) : null,
        isDocked("triggers") ? asDocked(triggersNode) : null,
        isDocked("dataSourceExplorer") ? asDocked(dataSourceExplorerNode) : null,
        isDocked("textStyleEditor") ? asDocked(textStyleEditorNode) : null,
        isDocked("workerSetup") ? asDocked(workerSetupNode) : null
    ].filter(Boolean);

    const dockPanelNode = buildDockPanelNode({ isDockCollapsed, dockedNodes });
    const floatingNodes = [
        isDocked("properties") ? null : propertiesNode,
        isDocked("layers") ? null : layersToolboxNode,
        isDocked("dataSourceExplorer") ? null : dataSourceExplorerNode,
        isDocked("textStyleEditor") ? null : textStyleEditorNode,
        isDocked("workerSetup") ? null : workerSetupNode,
        isDocked("workers") ? null : workersViewNode,
        isDocked("workerDetails") ? null : workerDetailsNode,
        isDocked("schedulerLogs") ? null : schedulerLogsNode,
        isDocked("triggers") ? null : triggersNode
    ].filter(Boolean);

    return (
        <Playground2View
            menuNode={menuNode}
            canvasFormNode={canvasFormNode}
            toolboxNode={toolboxNode}
            floatingNodes={floatingNodes}
            isDockPreview={isDockPreview}
            dockPanelNode={dockPanelNode}
            statusBarNode={statusBarNode}
            handlers={handlers}
            loadingOverlayNode={loadingOverlayNode}
        />
    );
};

