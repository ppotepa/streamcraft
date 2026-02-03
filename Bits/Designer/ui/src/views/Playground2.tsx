import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FormContainer } from "../forms/FormContainer";
import { element, node } from "../forms/core";
import { ControlKind } from "../forms/controlKinds";
import { UiText } from "./uiText";
import { workerRegistry, type WorkerRegistration, type ExecutionLog } from "./workerRegistry";
import { createWorkerDetailsDialog, createWorkersViewDialog } from "./playground2/forms";
import { createSchedulerLogsViewDialog } from "./playground2/forms/SchedulerLogsViewDialog";
import { createLayersToolboxDialog } from "./playground2/forms/LayersToolboxDialog";

type ApiFieldSpec = {
    path: string;
    type: string;
    example?: string | null;
    isContainer?: boolean;
};

type ApiResponseMetadata = {
    success: boolean;
    statusCode?: number | null;
    contentType?: string | null;
    rootKind?: string | null;
    fetchedUtc?: string;
    fields?: ApiFieldSpec[];
    error?: string | null;
};

type ApiEndpoint = {
    name: string;
    path: string;
    method: string;
    description?: string | null;
    response?: ApiResponseMetadata | null;
};

type DataSource = {
    id: string;
    name: string;
    description?: string;
    kind?: string;
    kindLabel?: string;
    categoryId?: string;
    categoryLabel?: string;
    baseUrl?: string;
    docsUrl?: string;
    endpoints?: ApiEndpoint[];
};

type DataSourceCategory = {
    id: string;
    name: string;
    parentId?: string | null;
    sortOrder?: number;
};

type TestResponse = {
    success: boolean;
    statusCode: number;
    error?: string | null;
    data?: unknown;
    response?: unknown;
};

const buildDataKey = (sourceId: string | undefined, endpointPath: string | undefined) => {
    if (!sourceId || !endpointPath) return "";
    return `${sourceId}|${endpointPath}`;
};

export const Playground2: React.FC = () => {
    const [status, setStatus] = useState(UiText.playground2.statusIdle);
    const [activeTool, setActiveTool] = useState<string | null>(null);
    const [items, setItems] = useState<
        Array<{
            id: string;
            type: string;
            name?: string;
            x: number;
            y: number;
            width: number;
            height: number;
            zIndex?: number;
            visible?: boolean;
            locked?: boolean;
            layerId?: string;
            label?: string;
            fill?: string;
            stroke?: string;
            strokeWidth?: number;
            src?: string;
            sourceId?: string;
            endpointPath?: string;
            fieldPath?: string;
            format?: "text" | "uppercase" | "json";
            fontFamily?: string;
            fontSize?: number;
            fontWeight?: string;
            fontStyle?: "normal" | "italic";
            textColor?: string;
            textTransform?: "none" | "uppercase" | "lowercase";
            letterSpacing?: number;
            textShadowX?: number;
            textShadowY?: number;
            textShadowBlur?: number;
            textShadowColor?: string;
            value?: number;
            minimum?: number;
            maximum?: number;
            progressStyle?: "continuous" | "blocks";
            workerEnabled?: boolean;
            workerTrigger?: "interval" | "onLoad" | "onVisible";
            workerIntervalMs?: number;
            workerDebounceMs?: number;
            workerRetryCount?: number;
            workerBackoffMs?: number;
            workerTimeoutMs?: number;
            workerCacheTtlMs?: number;
            workerStaleWhileRevalidate?: boolean;
            workerOnError?: "ignore" | "fallback" | "notify";
            workerLog?: boolean;
        }>
    >([]);
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
    const clipboardRef = useRef<Array<(typeof items)[number]>>([]);
    const clipboardOffsetRef = useRef(0);
    const historyRef = useRef<Array<{ items: typeof items; selectedIds: string[] }>>([]);
    const historyIndexRef = useRef(-1);
    const isApplyingHistoryRef = useRef(false);
    const transformRef = useRef<
        | {
            type: "move" | "resize";
            itemId: string;
            handle?: "nw" | "ne" | "sw" | "se";
            startX: number;
            startY: number;
            originX: number;
            originY: number;
            originW: number;
            originH: number;
        }
        | null
    >(null);
    const nameCounters = useRef<Record<string, number>>({});
    const transformHoldUntil = useRef(0);

    useEffect(() => workerRegistry.subscribe(() => setActiveWorkers(workerRegistry.getWorkers())), []);

    // Load logs when logsWorkerId changes
    useEffect(() => {
        if (logsWorkerId) {
            workerRegistry.getLogs(logsWorkerId).then(logs => {
                setSchedulerLogs(logs);
                // Auto-select first log if logs exist
                if (logs.length > 0) {
                    setSelectedLogId(logs[0].id);
                }
            }).catch(err => {
                console.error('Failed to load logs:', err);
                setSchedulerLogs([]);
                setSelectedLogId(null);
            });
        } else {
            setSchedulerLogs([]);
            setSelectedLogId(null);
        }
    }, [logsWorkerId]);

    // Real-time log updates when logs dialog is open
    useEffect(() => {
        if (!showSchedulerLogs || !logsWorkerId) return;

        const intervalId = setInterval(async () => {
            try {
                const logs = await workerRegistry.getLogs(logsWorkerId);
                setSchedulerLogs(logs);
            } catch (err) {
                console.error('Failed to refresh logs:', err);
            }
        }, 2000); // Refresh every 2 seconds

        return () => clearInterval(intervalId);
    }, [showSchedulerLogs, logsWorkerId]);

    const refreshSources = useCallback(async () => {
        const res = await fetch("/designer/sources", { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as DataSource[];
        setSources(data || []);
    }, []);

    const isSystemSource = useCallback((source?: DataSource | null) => {
        if (!source) return false;
        if (source.endpoints && source.endpoints.length > 0) return false;
        return true;
    }, []);

    const activeSystemSourceIds = useMemo(() => {
        const ids = new Set<string>();
        for (const item of items) {
            if (!item.sourceId) continue;
            const source = sources.find((candidate) => candidate.id === item.sourceId);
            if (isSystemSource(source)) {
                ids.add(item.sourceId);
            }
        }
        return Array.from(ids.values()).sort();
    }, [isSystemSource, items, sources]);

    const activeSystemKey = useMemo(() => activeSystemSourceIds.join("|"), [activeSystemSourceIds]);

    useEffect(() => {
        if (!activeSystemKey) return;

        let cancelled = false;
        const fetchAll = async () => {
            if (isTransforming || Date.now() < transformHoldUntil.current) {
                return;
            }
            for (const sourceId of activeSystemSourceIds) {
                try {
                    const res = await fetch(`/designer/preview?sourceId=${encodeURIComponent(sourceId)}`, { cache: "no-store" });
                    if (!res.ok) throw new Error(await res.text());
                    const data = await res.json();
                    if (cancelled) return;
                    setLiveData((prev) => {
                        const next = new Map(prev);
                        next.set(sourceId, data);
                        return next;
                    });
                } catch (err) {
                    console.warn("Failed to load live data", err);
                }
            }
        };

        fetchAll();
        const timer = window.setInterval(fetchAll, 1000);

        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [activeSystemKey, activeSystemSourceIds, isTransforming]);

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
        const res = await fetch("/designer/autosave", { cache: "no-store" });
        if (res.status === 204) return;
        if (!res.ok) throw new Error(await res.text());
        const json = await res.text();
        if (!json) return;
        applyLayoutJson(json);
    }, [applyLayoutJson]);

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

    const saveAutosave = useCallback(async (json: string) => {
        const res = await fetch("/designer/autosave", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: json
        });
        if (!res.ok) {
            throw new Error(await res.text());
        }
    }, []);

    const saveLayout = useCallback(async (layoutId: string, json: string) => {
        const res = await fetch(`/designer/layout?layoutId=${encodeURIComponent(layoutId)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: json
        });
        if (!res.ok) {
            throw new Error(await res.text());
        }
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

    const parsePathTokens = (path: string) => {
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

    const buildFieldSpecs = useCallback((value: unknown) => {
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
    }, []);

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

    const formatCategoryLabel = useCallback((id?: string, label?: string) => {
        if (label && label.trim().length > 0) return label;
        if (!id) return "";
        const cleaned = id.replace(/^public-/, "").replace(/^system-/, "");
        const words = cleaned.split("-").filter(Boolean);
        if (words.length === 0) return id;
        return words.map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
    }, []);

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

    const getDefaultSize = (toolType: string) => {
        switch (toolType) {
            case "text":
                return { width: 180, height: 36 };
            case "image":
                return { width: 220, height: 140 };
            case "progress":
                return { width: 200, height: 22 };
            case "rect":
                return { width: 180, height: 120 };
            case "ellipse":
                return { width: 160, height: 120 };
            case "line":
                return { width: 180, height: 2 };
            case "polygon":
                return { width: 140, height: 140 };
            default:
                return { width: 160, height: 100 };
        }
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

        const id = `item-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        const name = getNextName(toolType);
        const maxZIndex = items.length > 0 ? Math.max(...items.map(item => item.zIndex ?? 1)) : 0;
        const targetLayerId = activeLayerId || layers[0]?.id || "layer-1";
        const base = {
            id,
            type: toolType,
            name,
            x,
            y,
            width,
            height,
            zIndex: maxZIndex + 1,
            visible: true,
            locked: false,
            layerId: targetLayerId
        };

        const nextItem =
            toolType === "text"
                ? {
                    ...base,
                    label: name,
                    fontFamily: "Segoe UI",
                    fontSize: 16,
                    fontWeight: "normal",
                    fontStyle: "normal",
                    textColor: "#222222",
                    textTransform: "none",
                    letterSpacing: 0
                }
                : toolType === "image"
                    ? {
                        ...base,
                        src: ""
                    }
                    : toolType === "progress"
                        ? {
                            ...base,
                            value: 40,
                            minimum: 0,
                            maximum: 100,
                            progressStyle: "blocks"
                        }
                        : toolType === "line"
                            ? {
                                ...base,
                                stroke: "#2f2f2f",
                                strokeWidth: Math.max(2, height)
                            }
                            : {
                                ...base,
                                fill: "transparent",
                                stroke: "rgba(0,0,0,0.35)"
                            };

        setItems((prev) => [...prev, nextItem]);
        setSelectedIds([id]);
        setActiveTool("select");
    };

    const isEditableTarget = (target: EventTarget | null) => {
        if (!(target instanceof HTMLElement)) return false;
        const tag = target.tagName.toLowerCase();
        return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
    };

    const copySelection = () => {
        if (selectedIds.length === 0) return;
        const selected = items.filter((item) => selectedIds.includes(item.id));
        if (selected.length === 0) return;
        clipboardRef.current = selected.map((item) => ({ ...item }));
        clipboardOffsetRef.current = 0;
    };

    const deleteSelection = () => {
        if (selectedIds.length === 0) return;
        setItems((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
        setSelectedIds([]);
    };

    const pasteSelection = () => {
        if (clipboardRef.current.length === 0) return;
        const offsetStep = 12;
        const offset = offsetStep * (clipboardOffsetRef.current + 1);
        const maxZIndex = items.length > 0 ? Math.max(...items.map((item) => item.zIndex ?? 1)) : 0;
        const now = Date.now();
        const pasted = clipboardRef.current.map((item, index) => {
            const id = `item-${now}-${Math.floor(Math.random() * 100000)}-${index}`;
            const name = getNextName(item.type);
            const next = {
                ...item,
                id,
                name,
                x: item.x + offset,
                y: item.y + offset,
                zIndex: maxZIndex + index + 1
            } as typeof items[number];
            if (next.type === "text") {
                (next as typeof items[number] & { label?: string }).label = name;
            }
            return next;
        });
        setItems((prev) => [...prev, ...pasted]);
        setSelectedIds(pasted.map((item) => item.id));
        clipboardOffsetRef.current += 1;
    };

    const pushHistory = useCallback((nextItems: typeof items, nextSelected: string[]) => {
        if (isApplyingHistoryRef.current) return;
        const history = historyRef.current.slice(0, historyIndexRef.current + 1);
        history.push({ items: nextItems, selectedIds: nextSelected });
        if (history.length > 50) {
            history.shift();
        }
        historyRef.current = history;
        historyIndexRef.current = history.length - 1;
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

    const beginMove = (itemId: string, event: React.MouseEvent<HTMLDivElement>) => {
        if (activeTool !== "select") return;
        const item = items.find((candidate) => candidate.id === itemId);
        if (!item) return;
        beginTransformHold();
        transformRef.current = {
            type: "move",
            itemId,
            startX: event.clientX,
            startY: event.clientY,
            originX: item.x,
            originY: item.y,
            originW: item.width,
            originH: item.height
        };
    };

    const beginResize = (itemId: string, handle: "nw" | "ne" | "sw" | "se") => (event: React.MouseEvent<HTMLDivElement>) => {
        if (activeTool !== "select") return;
        event.stopPropagation();
        const item = items.find((candidate) => candidate.id === itemId);
        if (!item) return;
        beginTransformHold();
        transformRef.current = {
            type: "resize",
            itemId,
            handle,
            startX: event.clientX,
            startY: event.clientY,
            originX: item.x,
            originY: item.y,
            originW: item.width,
            originH: item.height
        };
        setSelectedIds((prev) => (prev.includes(itemId) ? prev : [itemId]));
    };

    const applyResize = (item: typeof items[number], dx: number, dy: number, handle: "nw" | "ne" | "sw" | "se") => {
        const minSize = 8;
        let x = item.x;
        let y = item.y;
        let width = item.width;
        let height = item.height;

        if (handle === "nw") {
            x = item.x + dx;
            y = item.y + dy;
            width = item.width - dx;
            height = item.height - dy;
        } else if (handle === "ne") {
            y = item.y + dy;
            width = item.width + dx;
            height = item.height - dy;
        } else if (handle === "sw") {
            x = item.x + dx;
            width = item.width - dx;
            height = item.height + dy;
        } else if (handle === "se") {
            width = item.width + dx;
            height = item.height + dy;
        }

        if (width < minSize) {
            if (handle === "nw" || handle === "sw") {
                x = item.x + (item.width - minSize);
            }
            width = minSize;
        }
        if (height < minSize) {
            if (handle === "nw" || handle === "ne") {
                y = item.y + (item.height - minSize);
            }
            height = minSize;
        }

        if (item.type === "line") {
            height = 2;
        }

        return { x, y, width, height };
    };

    const handleCanvasMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        const target = event.currentTarget;
        const rect = target.getBoundingClientRect();
        const x = Math.round(event.clientX - rect.left);
        const y = Math.round(event.clientY - rect.top);

        if (!activeTool) {
            setActiveTool("select");
        }

        const effectiveTool = activeTool ?? "select";
        const isPanMode = effectiveTool === "hand" || (effectiveTool === "select" && event.ctrlKey);
        if (isPanMode) {
            const container = event.currentTarget.closest(".playground2-canvas-form") as HTMLDivElement | null;
            if (container) {
                panRef.current = {
                    startX: event.clientX,
                    startY: event.clientY,
                    scrollLeft: container.scrollLeft,
                    scrollTop: container.scrollTop,
                    container
                };
            }
            return;
        }
        if (effectiveTool === "select") {
            dragStart.current = { x, y, canvasRect: rect };
            setSelectionBox({ active: true, x, y, width: 0, height: 0, addMode: event.shiftKey });
            setPlacementBox({ active: false, x: 0, y: 0, width: 0, height: 0, type: null });
            if (!event.shiftKey) {
                setSelectedIds([]);
            }
            return;
        }

        placementStart.current = { x, y, canvasRect: rect };
        setPlacementBox({ active: true, x, y, width: 0, height: 0, type: effectiveTool });
    };

    const handleCanvasMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
        if (panRef.current) {
            const pan = panRef.current;
            const dx = event.clientX - pan.startX;
            const dy = event.clientY - pan.startY;
            pan.container.scrollLeft = pan.scrollLeft - dx;
            pan.container.scrollTop = pan.scrollTop - dy;
            return;
        }
        if (transformRef.current) {
            const transform = transformRef.current;
            const dx = event.clientX - transform.startX;
            const dy = event.clientY - transform.startY;
            setItems((prev) =>
                prev.map((item) => {
                    if (item.id !== transform.itemId) return item;
                    if (transform.type === "move") {
                        return {
                            ...item,
                            x: transform.originX + dx,
                            y: transform.originY + dy
                        };
                    }
                    const resized = applyResize(
                        {
                            ...item,
                            x: transform.originX,
                            y: transform.originY,
                            width: transform.originW,
                            height: transform.originH
                        },
                        dx,
                        dy,
                        transform.handle ?? "se"
                    );
                    return { ...item, ...resized };
                })
            );
            return;
        }
        if (selectionBox.active && dragStart.current) {
            const rect = dragStart.current.canvasRect;
            const x = Math.round(event.clientX - rect.left);
            const y = Math.round(event.clientY - rect.top);
            const startX = dragStart.current.x;
            const startY = dragStart.current.y;
            const boxX = Math.min(startX, x);
            const boxY = Math.min(startY, y);
            const width = Math.abs(x - startX);
            const height = Math.abs(y - startY);
            setSelectionBox((prev) => ({ ...prev, x: boxX, y: boxY, width, height }));
            return;
        }
        if (placementBox.active && placementStart.current) {
            const rect = placementStart.current.canvasRect;
            const x = Math.round(event.clientX - rect.left);
            const y = Math.round(event.clientY - rect.top);
            const startX = placementStart.current.x;
            const startY = placementStart.current.y;
            const boxX = Math.min(startX, x);
            const boxY = Math.min(startY, y);
            const width = Math.abs(x - startX);
            const height = Math.abs(y - startY);
            setPlacementBox((prev) => ({ ...prev, x: boxX, y: boxY, width, height }));
        }
    };

    const handleCanvasMouseUp = () => {
        if (panRef.current) {
            panRef.current = null;
            return;
        }
        if (transformRef.current) {
            transformRef.current = null;
            endTransformHold();
            return;
        }
        if (selectionBox.active) {
            const box = selectionBox;
            const nextSelected = items.filter((item) => {
                const itemRect = {
                    left: item.x,
                    top: item.y,
                    right: item.x + item.width,
                    bottom: item.y + item.height
                };
                const boxRect = {
                    left: box.x,
                    top: box.y,
                    right: box.x + box.width,
                    bottom: box.y + box.height
                };
                return !(itemRect.right < boxRect.left || itemRect.left > boxRect.right || itemRect.bottom < boxRect.top || itemRect.top > boxRect.bottom);
            });
            const nextIds = nextSelected.map((item) => item.id);
            setSelectedIds((prev) => (box.addMode ? Array.from(new Set([...prev, ...nextIds])) : nextIds));
            setSelectionBox({ active: false, x: 0, y: 0, width: 0, height: 0, addMode: false });
            dragStart.current = null;
            return;
        }

        if (placementBox.active) {
            const box = placementBox;
            const toolType = box.type ?? activeTool;
            if (toolType) {
                const defaultSize = getDefaultSize(toolType);
                const width = box.width < 4 ? defaultSize.width : box.width;
                const height = box.height < 4 ? defaultSize.height : box.height;
                addItem(toolType, box.x, box.y, width, toolType === "line" ? Math.max(2, height) : height);
            }
            setPlacementBox({ active: false, x: 0, y: 0, width: 0, height: 0, type: null });
            placementStart.current = null;
        }
    };



    const handleItemMouseDown = (itemId: string) => (event: React.MouseEvent<HTMLDivElement>) => {
        if (activeTool !== "select") {
            setActiveTool("select");
        }
        event.stopPropagation();
        setSelectedIds((prev) => {
            if (event.shiftKey) {
                return prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId];
            }
            return [itemId];
        });
        beginMove(itemId, event);
    };

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
        const nextIndex = layers.length + 1;
        const newLayer = {
            id: `layer-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
            name: `Layer ${nextIndex}`
        };
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
        setItems((prev) => prev.map((item) => (item.layerId === layerId ? { ...item, layerId: fallbackLayerId } : item)));
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
    }, [formatCategoryLabel, sources]);
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

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();
            const isCmd = event.ctrlKey || event.metaKey;

            if (isEditableTarget(event.target)) {
                return;
            }

            if (key === "delete" || key === "backspace") {
                event.preventDefault();
                deleteSelection();
                return;
            }

            if (isCmd && key === "s") {
                event.preventDefault();
                void handleManualSave();
                return;
            }

            if (isCmd && key === "z") {
                event.preventDefault();
                if (historyIndexRef.current > 0) {
                    applyHistory(historyIndexRef.current - 1);
                }
                return;
            }

            if (isCmd && key === "y") {
                event.preventDefault();
                if (historyIndexRef.current < historyRef.current.length - 1) {
                    applyHistory(historyIndexRef.current + 1);
                }
                return;
            }

            if (isCmd && key === "c") {
                event.preventDefault();
                copySelection();
                return;
            }

            if (isCmd && key === "x") {
                event.preventDefault();
                copySelection();
                deleteSelection();
                return;
            }

            if (isCmd && key === "v") {
                event.preventDefault();
                pasteSelection();
            }
        };

        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [applyHistory, copySelection, deleteSelection, handleManualSave, pasteSelection]);

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

    const menuNode = element(
        "div",
        { style: "position: relative; z-index: 1000;" },
        node(
            ControlKind.menuBar,
            {},
            node(ControlKind.menuItem, { label: UiText.playground2.menu.file }),
            node(ControlKind.menuItem, { label: UiText.playground2.menu.edit }),
            node(
                ControlKind.menuItem,
                { label: UiText.playground2.menu.view },
                node(
                    ControlKind.menuItem,
                    { label: UiText.playground2.menu.windows },
                    node(
                        ControlKind.menuItemEntry,
                        { onClick: "openLayersToolbox" },
                        element("span", {}, UiText.playground2.menu.layers)
                    )
                )
            ),
            node(
                ControlKind.menuItem,
                { label: UiText.playground2.menu.tools },
                node(
                    ControlKind.menuItemEntry,
                    { onClick: "openWorkersView" },
                    element("span", {}, UiText.playground2.menu.workers)
                )
            ),
            node(ControlKind.menuItem, { label: UiText.playground2.menu.help })
        )
    );

    const layoutNode = node(
        ControlKind.layoutCanvas,
        {
            gridSize: 24,
            gridColor: "rgba(255,255,255,0.12)",
            background: "#0b6a6a",
            style: `width: 1920px; height: 1080px; position: relative;`,
            onMouseDown: handleCanvasMouseDown,
            onMouseMove: handleCanvasMouseMove,
            onMouseUp: handleCanvasMouseUp
        },
        ...items.map((item) => {
            const selected = selectedIds.includes(item.id);
            const progressPercent = item.type === "progress" ? getProgressPercent(item) : 0;
            const progressStyle = item.progressStyle ?? "blocks";
            const progressNode = item.type === "progress"
                ? element(
                    "div",
                    { className: "progressbar", style: "width: 100%; height: 100%;" },
                    element(
                        "div",
                        {
                            className: `progressbar-fill ${progressStyle === "blocks" ? "progressbar-blocks" : ""}`.trim(),
                            style: `width: ${progressPercent}%;`
                        },
                        progressStyle === "blocks"
                            ? element("div", { className: "progressbar-blocks-pattern" })
                            : null
                    )
                )
                : null;
            return element(
                "div",
                {
                    className: `canvas-item canvas-item-${item.type} ${selected ? "canvas-item-selected" : ""}`.trim(),
                    style: getItemStyle(item),
                    onMouseDown: handleItemMouseDown(item.id)
                },
                element("div", { className: "canvas-item-handles" },
                    element("div", { className: "canvas-item-handle canvas-item-handle-nw", onMouseDown: beginResize(item.id, "nw") }),
                    element("div", { className: "canvas-item-handle canvas-item-handle-ne", onMouseDown: beginResize(item.id, "ne") }),
                    element("div", { className: "canvas-item-handle canvas-item-handle-sw", onMouseDown: beginResize(item.id, "sw") }),
                    element("div", { className: "canvas-item-handle canvas-item-handle-se", onMouseDown: beginResize(item.id, "se") })
                ),
                progressNode,
                element("span", { className: "canvas-item-label" }, getDisplayLabel(item))
            );
        }),
        selectionBox.active
            ? element("div", {
                className: "canvas-selection-box",
                style: `left: ${selectionBox.x}px; top: ${selectionBox.y}px; width: ${selectionBox.width}px; height: ${selectionBox.height}px;`
            })
            : null,
        placementBox.active
            ? element("div", {
                className: "canvas-placement-box",
                style: `left: ${placementBox.x}px; top: ${placementBox.y}px; width: ${placementBox.width}px; height: ${placementBox.height}px;`
            })
            : null
    );

    const toolboxNode = node(ControlKind.toolbox, {
        title: UiText.playground2.toolboxTitle,
        tools,
        onSelect: "toolboxSelect",
        activeTool,
        style: "position: absolute; left: 16px; top: 52px; width: 220px;"
    });

    const statusBarNode = element(
        "div",
        { className: "status-bar designer-status-bar" },
        element("p", { className: "status-bar-field designer-status-cell" }, saveError ? "Save failed" : status),
        element(
            "p",
            { className: "status-bar-field designer-status-cell" },
            lastSavedUtc ? `Last saved: ${lastSavedUtc.toLocaleTimeString()}` : "Last saved: --"
        ),
        element(
            "p",
            { className: "status-bar-field designer-status-cell" },
            overlayName ? `Overlay: ${overlayName}` : "Overlay: Draft"
        ),
        element(
            "p",
            { className: "status-bar-field designer-status-cell", style: "display: flex; align-items: center; gap: 4px;" },
            node(ControlKind.button, { icon: "zoomOut", onClick: "zoomOut", style: "min-width: 20px; height: 18px; padding: 0 4px;" }),
            element("span", {}, `${Math.round(canvasScale * 100)}%`),
            node(ControlKind.button, { icon: "restore", onClick: "zoomReset", style: "min-width: 20px; height: 18px; padding: 0 4px;" }),
            node(ControlKind.button, { icon: "zoomIn", onClick: "zoomIn", style: "min-width: 20px; height: 18px; padding: 0 4px;" })
        ),
        element(
            "p",
            { className: "status-bar-field designer-status-cell designer-status-cell-right" },
            isSaving ? "Saving…" : isDirty ? "Unsaved changes" : "All changes saved",
            isSaving ? element("span", { className: "designer-status-spinner" }, "●") : null
        )
    );

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
                                    element("label", null, UiText.playground2.labels.name ?? "Name"),
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
                selectedLogId: selectedLogId,
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

    const dockPanelNode = element(
        "div",
        {
            className: isDockCollapsed ? "dock-panel dock-panel-collapsed" : "dock-panel"
        },
        node(ControlKind.button, {
            icon: isDockCollapsed ? "chevronLeft" : "chevronRight",
            onClick: "toggleDockPanel",
            className: "dock-toggle"
        }),
        ...(isDockCollapsed ? [] : dockedNodes)
    );

    return (
        <>
            <FormContainer node={node(
                ControlKind.panel,
                { className: "playground2-outer-form", style: "position: relative; width: 100%; height: 100vh; display: flex; flex-direction: column;" },
                menuNode,
                canvasFormNode,
                toolboxNode,
                isDocked("properties") ? null : propertiesNode,
                isDocked("layers") ? null : layersToolboxNode,
                isDocked("dataSourceExplorer") ? null : dataSourceExplorerNode,
                isDocked("textStyleEditor") ? null : textStyleEditorNode,
                isDocked("workerSetup") ? null : workerSetupNode,
                isDocked("workers") ? null : workersViewNode,
                isDocked("workerDetails") ? null : workerDetailsNode,
                isDocked("schedulerLogs") ? null : schedulerLogsNode,
                isDocked("triggers") ? null : triggersNode,
                isDockPreview ? element("div", { className: "dock-preview" }) : null,
                dockPanelNode,
                statusBarNode
            )} handlers={handlers} />
            {loadingOverlayNode}
        </>
    );
};

