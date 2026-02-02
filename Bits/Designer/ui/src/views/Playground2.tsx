import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormContainer } from "../forms/FormContainer";
import { element, node } from "../forms/core";
import { ControlKind } from "../forms/controlKinds";
import { UiText } from "./uiText";
import { workerRegistry, type WorkerRegistration } from "./workerRegistry";

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
    baseUrl?: string;
    docsUrl?: string;
    endpoints?: ApiEndpoint[];
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
            x: number;
            y: number;
            width: number;
            height: number;
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
    const [sources, setSources] = useState<DataSource[]>([]);
    const [previews, setPreviews] = useState<Map<string, ApiResponseMetadata>>(new Map());
    const [testResponses, setTestResponses] = useState<Map<string, TestResponse>>(new Map());
    const [virtualState, setVirtualState] = useState<Record<string, unknown>>({});
    const [bindingData, setBindingData] = useState<Record<string, any>>({
        user: { name: "Ada Lovelace", title: "Engineer" },
        media: { imageUrl: "https://via.placeholder.com/320x180.png?text=Bound+Image" },
        metrics: { score: 42 }
    });
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [collapsedSections, setCollapsedSections] = useState({
        basic: false,
        binding: false,
        worker: false,
        events: false,
        text: false
    });
    const [showTextStyleEditor, setShowTextStyleEditor] = useState(false);
    const [showWorkerSetup, setShowWorkerSetup] = useState(false);
    const [showWorkersView, setShowWorkersView] = useState(false);
    const [workerDetailsId, setWorkerDetailsId] = useState<string | null>(null);
    const [activeWorkers, setActiveWorkers] = useState<WorkerRegistration[]>(() => workerRegistry.getWorkers());
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
    const textCounter = useRef(1);

    useEffect(() => workerRegistry.subscribe(() => setActiveWorkers(workerRegistry.getWorkers())), []);

    const refreshSources = useCallback(async () => {
        const res = await fetch("/designer/sources", { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as DataSource[];
        setSources(data || []);
    }, []);

    useEffect(() => {
        refreshSources().catch((err) => console.warn("Failed to load sources", err));
    }, [refreshSources]);

    const ensurePreview = useCallback(
        async (sourceId: string) => {
            if (!sourceId || previews.has(sourceId)) return;
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
        [previews]
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
        if (!sourceId || !endpointPath || !fieldPath) return undefined;
        const key = buildDataKey(sourceId, endpointPath);
        if (!key) return undefined;
        const data = virtualState[key];
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

    const getDisplayLabel = (item: (typeof items)[number]) => {
        if (item.type === "text" && item.sourceId && item.endpointPath && item.fieldPath) {
            const bound = resolveFieldValue(item.sourceId, item.endpointPath, item.fieldPath);
            if (bound !== undefined && bound !== null) {
                if (item.format === "uppercase" && typeof bound === "string") return bound.toUpperCase();
                if (item.format === "json") return JSON.stringify(bound, null, 2);
                return String(bound);
            }
        }
        return item.label ?? "";
    };

    const getImageSource = (item: (typeof items)[number]) => {
        if (item.type === "image" && item.sourceId && item.endpointPath && item.fieldPath) {
            const bound = resolveFieldValue(item.sourceId, item.endpointPath, item.fieldPath);
            if (typeof bound === "string" && bound.length > 0) return bound;
        }
        return item.src ?? "";
    };

    const getItemStyle = (item: (typeof items)[number]) => {
        const parts = [`left: ${item.x}px;`, `top: ${item.y}px;`, `width: ${item.width}px;`, `height: ${item.height}px;`];
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

    const addItem = (toolType: string, x: number, y: number, width: number, height: number) => {
        if (toolType === "bind" || toolType === "polygon") {
            setStatus(`${toolType} tool not implemented yet.`);
            return;
        }

        const id = `item-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        const base = {
            id,
            type: toolType,
            x,
            y,
            width,
            height
        };

        const nextItem =
            toolType === "text"
                ? {
                    ...base,
                    label: `Text ${textCounter.current++}`,
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

    const beginMove = (itemId: string, event: React.MouseEvent<HTMLDivElement>) => {
        if (activeTool !== "select") return;
        const item = items.find((candidate) => candidate.id === itemId);
        if (!item) return;
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
            setStatus("Select a tool first.");
            return;
        }

        if (activeTool === "select") {
            dragStart.current = { x, y, canvasRect: rect };
            setSelectionBox({ active: true, x, y, width: 0, height: 0, addMode: event.shiftKey });
            setPlacementBox({ active: false, x: 0, y: 0, width: 0, height: 0, type: null });
            if (!event.shiftKey) {
                setSelectedIds([]);
            }
            return;
        }

        placementStart.current = { x, y, canvasRect: rect };
        setPlacementBox({ active: true, x, y, width: 0, height: 0, type: activeTool });
    };

    const handleCanvasMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
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
        if (transformRef.current) {
            transformRef.current = null;
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
        if (activeTool !== "select") return;
        event.stopPropagation();
        setSelectedIds((prev) => {
            if (event.shiftKey) {
                return prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId];
            }
            return [itemId];
        });
        beginMove(itemId, event);
    };

    const selectedItem = selectedIds.length > 0 ? items.find((item) => item.id === selectedIds[0]) ?? null : null;
    const selectedSource = selectedItem?.sourceId ? sources.find((source) => source.id === selectedItem.sourceId) ?? null : null;
    const selectedEndpoints = selectedSource?.endpoints ?? [];
    const selectedEndpoint = selectedItem?.endpointPath
        ? selectedEndpoints.find((endpoint) => endpoint.path === selectedItem.endpointPath)
        : null;
    const selectedPreview = selectedItem?.sourceId ? previews.get(selectedItem.sourceId) : undefined;
    const previewFields = selectedPreview?.fields ?? [];
    const endpointFields = selectedEndpoint?.response?.fields ?? [];
    const availableFields = endpointFields.length > 0 ? endpointFields : previewFields;
    const selectedKey = selectedItem ? buildDataKey(selectedItem.sourceId, selectedItem.endpointPath) : "";
    const selectedTest = selectedKey ? testResponses.get(selectedKey) : undefined;
    const hasBinding = Boolean(selectedItem?.sourceId && selectedItem?.endpointPath && selectedItem?.fieldPath);
    const workerDetails = workerDetailsId ? activeWorkers.find((worker) => worker.id === workerDetailsId) ?? null : null;
    const workerDetailsItem = workerDetails ? items.find((item) => item.id === workerDetails.id) ?? null : null;

    const handlers = useMemo(
        () => ({
            toolboxSelect: (args: any) => {
                const tool = args?.tool;
                if (tool?.id) {
                    setActiveTool(tool.id);
                }
            },
            openWorkersView: () => setShowWorkersView(true),
            toggleBasicSection: () => setCollapsedSections((prev) => ({ ...prev, basic: !prev.basic })),
            toggleBindingSection: () => setCollapsedSections((prev) => ({ ...prev, binding: !prev.binding })),
            toggleWorkerSection: () => setCollapsedSections((prev) => ({ ...prev, worker: !prev.worker })),
            toggleEventsSection: () => setCollapsedSections((prev) => ({ ...prev, events: !prev.events })),
            toggleTextSection: () => setCollapsedSections((prev) => ({ ...prev, text: !prev.text })),
            closeTextStyleEditor: () => setShowTextStyleEditor(false),
            closeWorkerSetup: () => setShowWorkerSetup(false),
            closeWorkerDetails: () => setWorkerDetailsId(null),
            toggleWorkerEnabled: (args: any) => {
                if (!selectedItem) return;
                updateItem(selectedItem.id, { workerEnabled: Boolean(args?.checked) });
            }
        }),
        [selectedItem]
    );

    useEffect(() => {
        if (selectedItem?.sourceId) {
            ensurePreview(selectedItem.sourceId);
        }
    }, [ensurePreview, selectedItem?.sourceId]);

    useEffect(() => {
        const nextWorkers = items
            .filter((item) => Boolean(item.workerEnabled && item.sourceId && item.endpointPath && item.fieldPath))
            .map((item) => ({
                id: item.id,
                label: item.label ?? item.type,
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

    const tools = [
        UiText.playground2.tools.select,
        UiText.playground2.tools.text,
        UiText.playground2.tools.image,
        UiText.playground2.tools.rect,
        UiText.playground2.tools.ellipse,
        UiText.playground2.tools.line,
        UiText.playground2.tools.polygon,
        UiText.playground2.tools.bind
    ];

    const menuNode = element(
        "div",
        { style: "position: relative; z-index: 2100;" },
        node(
            ControlKind.menuBar,
            {},
            node(ControlKind.menuItem, { label: UiText.playground2.menu.file }),
            node(ControlKind.menuItem, { label: UiText.playground2.menu.edit }),
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
            style: "width: 100%; height: 100%;",
            onMouseDown: handleCanvasMouseDown,
            onMouseMove: handleCanvasMouseMove,
            onMouseUp: handleCanvasMouseUp
        },
        ...items.map((item) => {
            const selected = selectedIds.includes(item.id);
            return element(
                "div",
                {
                    className: `canvas-item canvas-item-${item.type} ${selected ? "canvas-item-selected" : ""}`.trim(),
                    style: getItemStyle(item),
                    onMouseDown: handleItemMouseDown(item.id)
                },
                element("span", { className: "canvas-item-label" }, getDisplayLabel(item)),
                selected && activeTool === "select"
                    ? element(
                        "div",
                        { className: "canvas-item-handles" },
                        element("div", { className: "canvas-item-handle canvas-item-handle-nw", onMouseDown: beginResize(item.id, "nw") }),
                        element("div", { className: "canvas-item-handle canvas-item-handle-ne", onMouseDown: beginResize(item.id, "ne") }),
                        element("div", { className: "canvas-item-handle canvas-item-handle-sw", onMouseDown: beginResize(item.id, "sw") }),
                        element("div", { className: "canvas-item-handle canvas-item-handle-se", onMouseDown: beginResize(item.id, "se") })
                    )
                    : null
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

    const statusNode = element(
        "div",
        {
            style: "position: absolute; right: 16px; bottom: 16px; padding: 8px 10px; background: rgba(0,0,0,0.35); color: white; font-size: 12px; border-radius: 4px;"
        },
        status
    );

    const canvasFormNode = node(
        ControlKind.panel,
        {
            className: "playground2-canvas-form",
            style: "position: relative; flex: 1; min-height: 0;"
        },
        layoutNode
    );

    const propertiesNode = selectedItem
        ? node(
            ControlKind.panel,
            {
                title: UiText.playground2.propertiesTitle,
                close: false,
                minimize: false,
                maximize: false,
                draggable: true,
                className: "properties-container",
                style: "position: absolute; right: 16px; top: 52px; width: fit-content; max-width: 420px;"
            },
            element(
                "div",
                { className: "canvas-properties" },
                element("div", { className: "canvas-properties-body" },
                    node(
                        ControlKind.groupBox,
                        {
                            text: UiText.playground2.sections.basic,
                            style: "margin-bottom: 10px;",
                            collapsible: true,
                            collapsed: collapsedSections.basic,
                            onToggle: "toggleBasicSection"
                        },
                        element("div", { className: "canvas-properties-section" },
                            element("div", { className: "canvas-properties-row" },
                                element("label", null, UiText.playground2.labels.type),
                                element("div", { className: "canvas-properties-readonly" }, selectedItem.type)
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
                    selectedItem.type === "text"
                        ? node(
                            ControlKind.groupBox,
                            {
                                text: UiText.playground2.sections.text,
                                style: "margin-bottom: 10px;",
                                collapsible: true,
                                collapsed: collapsedSections.text,
                                onToggle: "toggleTextSection"
                            },
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
                        ControlKind.groupBox,
                        {
                            text: UiText.playground2.sections.binding,
                            style: "margin-bottom: 10px;",
                            collapsible: true,
                            collapsed: collapsedSections.binding,
                            onToggle: "toggleBindingSection"
                        },
                        element("div", { className: "canvas-properties-section" },
                            (selectedItem.type === "text" || selectedItem.type === "image")
                                ? element(
                                    "div",
                                    { className: "canvas-properties-row" },
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
                                        ...sources.map((source) => element("option", { value: source.id }, source.name))
                                    )
                                )
                                : element("div", { className: "canvas-properties-empty" }, UiText.playground2.empty.noBinding),
                            (selectedItem.type === "text" || selectedItem.type === "image")
                                ? element(
                                    "div",
                                    { className: "canvas-properties-row" },
                                    element("label", null, UiText.playground2.labels.endpoint),
                                    element(
                                        "select",
                                        {
                                            value: selectedItem.endpointPath ?? "",
                                            onChange: (event: React.ChangeEvent<HTMLSelectElement>) => updateItem(selectedItem.id, { endpointPath: event.target.value || undefined })
                                        },
                                        element("option", { value: "" }, UiText.playground2.options.select),
                                        ...selectedEndpoints.map((endpoint) => element("option", { value: endpoint.path }, `${endpoint.method} ${endpoint.path}`))
                                    )
                                )
                                : null,
                            (selectedItem.type === "text" || selectedItem.type === "image")
                                ? element("div", { className: "canvas-properties-row" },
                                    element("label", null, UiText.playground2.labels.field),
                                    availableFields.length > 0
                                        ? element(
                                            "select",
                                            {
                                                value: selectedItem.fieldPath ?? "",
                                                onChange: (event: React.ChangeEvent<HTMLSelectElement>) => updateItem(selectedItem.id, { fieldPath: event.target.value || undefined })
                                            },
                                            element("option", { value: "" }, UiText.playground2.options.select),
                                            ...availableFields
                                                .filter((field) => !field.isContainer)
                                                .map((field) => element("option", { value: `response.${field.path}` }, field.path))
                                        )
                                        : element("input", {
                                            type: "text",
                                            placeholder: UiText.playground2.placeholders.fieldPath,
                                            value: selectedItem.fieldPath ?? "",
                                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { fieldPath: event.target.value })
                                        })
                                )
                                : null,
                            (selectedItem.type === "text" || selectedItem.type === "image") && availableFields.length > 0
                                ? element("div", { className: "canvas-properties-row" },
                                    element("label", null, UiText.playground2.labels.fieldPath),
                                    element("input", {
                                        type: "text",
                                        placeholder: UiText.playground2.placeholders.fieldPath,
                                        value: selectedItem.fieldPath ?? "",
                                        onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { fieldPath: event.target.value })
                                    })
                                )
                                : null,
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
                            (selectedItem.type === "text" || selectedItem.type === "image") && selectedItem.sourceId && selectedItem.endpointPath
                                ? element(
                                    "div",
                                    { className: "canvas-properties-row" },
                                    element("label", null, UiText.playground2.labels.fetch),
                                    element("button", {
                                        className: "canvas-properties-button",
                                        onClick: () => {
                                            void runTest(selectedItem.sourceId ?? "", selectedItem.endpointPath ?? "");
                                        }
                                    }, UiText.playground2.buttons.test)
                                )
                                : null,
                            (selectedItem.type === "text" || selectedItem.type === "image") && selectedItem.sourceId && selectedItem.endpointPath && selectedItem.fieldPath
                                ? element("div", { className: "canvas-properties-row" },
                                    element("label", null, UiText.playground2.labels.value),
                                    element("input", {
                                        type: "text",
                                        value: String(resolveFieldValue(selectedItem.sourceId, selectedItem.endpointPath, selectedItem.fieldPath) ?? ""),
                                        readOnly: true
                                    })
                                )
                                : null,
                            selectedTest
                                ? element("div", { className: "canvas-properties-row" },
                                    element("label", null, UiText.playground2.labels.status),
                                    element("div", { className: "canvas-properties-readonly" }, selectedTest.success ? `OK (${selectedTest.statusCode})` : `Error (${selectedTest.statusCode})`)
                                )
                                : null
                        )
                    ),
                    node(
                        ControlKind.groupBox,
                        {
                            text: UiText.playground2.sections.worker,
                            style: "margin-bottom: 10px;",
                            className: hasBinding ? "" : "group-box-disabled",
                            collapsible: true,
                            collapsed: collapsedSections.worker,
                            onToggle: "toggleWorkerSection"
                        },
                        element("div", { className: "canvas-properties-section" },
                            hasBinding
                                ? element(
                                    "div",
                                    { className: "canvas-properties-row" },
                                    element("label", null, UiText.playground2.labels.workerSetup),
                                    element(
                                        "div",
                                        { style: "display: flex; align-items: center; gap: 8px;" },
                                        element("button", { className: "canvas-properties-button", onClick: () => setShowWorkerSetup(true) }, UiText.playground2.buttons.setupWorker),
                                        node(ControlKind.checkBox, {
                                            text: UiText.playground2.labels.enabled,
                                            checked: Boolean(selectedItem.workerEnabled),
                                            onChange: "toggleWorkerEnabled",
                                            style: "font-size: 11px;"
                                        })
                                    )
                                )
                                : element("div", { className: "canvas-properties-empty" }, UiText.playground2.empty.noWorker)
                        )
                    ),
                    node(
                        ControlKind.groupBox,
                        {
                            text: UiText.playground2.sections.events,
                            style: "margin-bottom: 10px;",
                            collapsible: true,
                            collapsed: collapsedSections.events,
                            onToggle: "toggleEventsSection"
                        },
                        element("div", { className: "canvas-properties-section" },
                            element("div", { className: "canvas-properties-event" }, UiText.playground2.eventSample)
                        )
                    )
                )
            )
        )
        : null;

const textStyleEditorNode = selectedItem && selectedItem.type === "text" && showTextStyleEditor
    ? node(
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
    )
    : null;

const workerSetupNode = selectedItem && showWorkerSetup
    ? node(
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
    )
    : null;

const workersViewNode = showWorkersView
    ? node(
        ControlKind.window,
        {
            title: UiText.playground2.workersViewTitle,
            dialog: true,
            draggable: true,
            close: false,
            style: "position: absolute; right: 24px; top: 88px; width: fit-content; max-width: 480px;"
        },
        element(
            "div",
            { className: "canvas-properties" },
            ...(activeWorkers.length > 0
                ? [
                    element("div", { className: "canvas-properties-section" },
                        ...activeWorkers.map((worker) =>
                            element(
                                "div",
                                {
                                    className: "canvas-properties-row",
                                    onDoubleClick: () => setWorkerDetailsId(worker.id)
                                },
                                element("div", { style: "flex: 1;" },
                                    element("div", { style: "font-weight: 600;" }, worker.label),
                                    element("div", { className: "canvas-properties-readonly" }, worker.sourceId)
                                ),
                                element("div", { style: "text-align: right; min-width: 120px;" },
                                    element("div", { className: "canvas-properties-readonly" }, UiText.playground2.labels.type),
                                    element("div", { style: "font-weight: 600;" }, worker.type)
                                )
                            )
                        )
                    )
                ]
                : [element("div", { className: "canvas-properties-empty" }, UiText.playground2.empty.noActiveWorkers)]),
            element("div", { style: "display: flex; justify-content: flex-end; padding: 8px 12px;" },
                element("button", { className: "canvas-properties-button", onClick: () => setShowWorkersView(false) }, UiText.playground2.buttons.close)
            )
        )
    )
    : null;

const workerDetailsNode = workerDetails
    ? node(
        ControlKind.window,
        {
            title: UiText.playground2.workerDetailsTitle,
            dialog: true,
            draggable: true,
            onClose: "closeWorkerDetails",
            style: "position: absolute; right: 24px; top: 180px; width: fit-content; max-width: 520px;"
        },
        element("div", { className: "canvas-properties" },
            element("div", { className: "canvas-properties-section" },
                element("div", { style: "font-weight: 600; margin-bottom: 6px;" }, workerDetails.label),
                element("div", { className: "canvas-properties-row" },
                    element("label", null, UiText.playground2.labels.type),
                    element("div", { className: "canvas-properties-readonly" }, workerDetails.type)
                ),
                element("div", { className: "canvas-properties-row" },
                    element("label", null, UiText.playground2.labels.source),
                    element("div", { className: "canvas-properties-readonly" }, workerDetails.sourceId)
                ),
                element("div", { className: "canvas-properties-row" },
                    element("label", null, UiText.playground2.labels.endpoint),
                    element("div", { className: "canvas-properties-readonly" }, workerDetails.endpointPath)
                ),
                element("div", { className: "canvas-properties-row" },
                    element("label", null, UiText.playground2.labels.field),
                    element("div", { className: "canvas-properties-readonly" }, workerDetails.fieldPath)
                ),
                element("div", { className: "canvas-properties-row" },
                    element("label", null, UiText.playground2.labels.trigger),
                    element("div", { className: "canvas-properties-readonly" }, workerDetails.trigger ?? "interval")
                ),
                element("div", { className: "canvas-properties-row" },
                    element("label", null, UiText.playground2.labels.interval),
                    element("div", { className: "canvas-properties-readonly" }, String(workerDetails.intervalMs ?? 5000))
                ),
                element("div", { className: "canvas-properties-row" },
                    element("label", null, UiText.playground2.labels.debounce),
                    element("div", { className: "canvas-properties-readonly" }, String(workerDetails.debounceMs ?? 300))
                )
            ),
            element("div", { style: "display: flex; justify-content: flex-end; gap: 8px; padding: 8px 12px;" },
                element("button", {
                    className: "canvas-properties-button",
                    onClick: () => workerDetailsItem && updateItem(workerDetailsItem.id, { workerEnabled: true })
                }, UiText.playground2.buttons.start),
                element("button", {
                    className: "canvas-properties-button",
                    onClick: () => workerDetailsItem && updateItem(workerDetailsItem.id, { workerEnabled: false })
                }, UiText.playground2.buttons.stop),
                element("button", { className: "canvas-properties-button", onClick: () => setWorkerDetailsId(null) }, UiText.playground2.buttons.close)
            )
        )
    )
    : null;

return <FormContainer node={node(
    ControlKind.panel,
    { className: "playground2-outer-form", style: "position: relative; width: 100%; height: 100vh; display: flex; flex-direction: column;" },
    menuNode,
    canvasFormNode,
    toolboxNode,
    propertiesNode,
    textStyleEditorNode,
    workerSetupNode,
    workersViewNode,
    workerDetailsNode,
    statusNode
)} handlers={handlers} />;
};
