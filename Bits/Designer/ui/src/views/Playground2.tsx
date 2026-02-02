import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormContainer } from "../forms/FormContainer";
import { element, node } from "../forms/core";

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
};

const buildDataKey = (sourceId: string | undefined, endpointPath: string | undefined) => {
    if (!sourceId || !endpointPath) return "";
    return `${sourceId}|${endpointPath}`;
};

export const Playground2: React.FC = () => {
    const [status, setStatus] = useState("Select a tool to start.");
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

    const handlers = useMemo(
        () => ({
            toolboxSelect: (args: any) => {
                const tool = args?.tool;
                if (tool?.id) {
                    setActiveTool(tool.id);
                    setStatus(`Tool mode: ${tool.label ?? tool.id}`);
                }
            }
        }),
        [activeTool]
    );

    const getDefaultSize = (type: string) => {
        if (type === "text") return { width: 120, height: 36 };
        if (type === "line") return { width: 120, height: 2 };
        return { width: 120, height: 80 };
    };

    const addItem = (type: string, x: number, y: number, width?: number, height?: number) => {
        const baseSize = getDefaultSize(type);
        const finalWidth = Math.max(2, width ?? baseSize.width);
        const finalHeight = Math.max(2, height ?? baseSize.height);
        const label = type === "text" ? `Text${textCounter.current++}` : type[0].toUpperCase() + type.slice(1);
        const stroke = type === "line" ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.35)";
        const fill = type === "rect" || type === "ellipse" ? "transparent" : undefined;
        setItems((prev) => [
            ...prev,
            {
                id: `${type}-${Date.now()}`,
                type,
                x,
                y,
                width: finalWidth,
                height: type === "line" ? Math.max(2, finalHeight) : finalHeight,
                label,
                fill,
                stroke,
                strokeWidth: type === "line" ? Math.max(2, finalHeight) : undefined,
                src: type === "image" ? "" : undefined,
                sourceId: undefined,
                endpointPath: undefined,
                fieldPath: undefined,
                format: "text"
            }
        ]);
    };

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

    const resolveFieldValue = (sourceId?: string, endpointPath?: string, fieldPath?: string) => {
        if (!sourceId || !endpointPath || !fieldPath) return undefined;
        const key = buildDataKey(sourceId, endpointPath);
        if (!key) return undefined;
        const data = virtualState[key];
        if (!data) return undefined;
        const path = fieldPath.replace(/^response\./, "");
        const keys = path.split(".").filter(Boolean);
        let current: any = data;
        for (const keyPart of keys) {
            current = current?.[keyPart];
            if (current === undefined) break;
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

    useEffect(() => {
        if (selectedItem?.sourceId) {
            ensurePreview(selectedItem.sourceId);
        }
    }, [ensurePreview, selectedItem?.sourceId]);

    const tools = [
        { id: "select", label: "Select", icon: "select" },
        { id: "text", label: "Text", icon: "text" },
        { id: "image", label: "Image", icon: "image" },
        { id: "rect", label: "Rectangle", icon: "rect" },
        { id: "ellipse", label: "Ellipse", icon: "ellipse" },
        { id: "line", label: "Line", icon: "line" },
        { id: "polygon", label: "Polygon", icon: "polygon" },
        { id: "bind", label: "Bind", icon: "bind" }
    ];

    const layoutNode = node(
        "layoutCanvas",
        {
            gridSize: 24,
            gridColor: "rgba(255,255,255,0.12)",
            background: "#0b6a6a",
            style: "width: 100%; height: 100vh;",
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

    const toolboxNode = node("toolbox", {
        title: "Tools",
        tools,
        onSelect: "toolboxSelect",
        activeTool,
        style: "position: absolute; left: 16px; top: 16px; width: 220px;"
    });

    const statusNode = element(
        "div",
        {
            style: "position: absolute; right: 16px; bottom: 16px; padding: 8px 10px; background: rgba(0,0,0,0.35); color: white; font-size: 12px; border-radius: 4px;"
        },
        status
    );

    const propertiesNode = selectedItem
        ? node(
            "window",
            {
                title: "Properties",
                dialog: true,
                close: false,
                minimize: false,
                maximize: false,
                draggable: true,
                style: "position: absolute; right: 16px; top: 16px; width: 280px;"
            },
            element(
                "div",
                { className: "canvas-properties" },
                element("div", { className: "canvas-properties-body" },
                    element("div", { className: "canvas-properties-row" },
                        element("label", null, "Type"),
                        element("div", { className: "canvas-properties-readonly" }, selectedItem.type)
                    ),
                    element("div", { className: "canvas-properties-row" },
                        element("label", null, "X"),
                        element("input", {
                            type: "number",
                            value: selectedItem.x,
                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { x: Number(event.target.value) || 0 })
                        })
                    ),
                    element("div", { className: "canvas-properties-row" },
                        element("label", null, "Y"),
                        element("input", {
                            type: "number",
                            value: selectedItem.y,
                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { y: Number(event.target.value) || 0 })
                        })
                    ),
                    element("div", { className: "canvas-properties-row" },
                        element("label", null, "W"),
                        element("input", {
                            type: "number",
                            value: selectedItem.width,
                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { width: Math.max(2, Number(event.target.value) || 0) })
                        })
                    ),
                    element("div", { className: "canvas-properties-row" },
                        element("label", null, "H"),
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
                            element("label", null, "Text"),
                            element("input", {
                                type: "text",
                                value: selectedItem.label ?? "",
                                onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { label: event.target.value })
                            })
                        )
                        : null,
                    (selectedItem.type === "text" || selectedItem.type === "image")
                        ? element(
                            "div",
                            { className: "canvas-properties-row" },
                            element("label", null, "Source"),
                            element(
                                "select",
                                {
                                    value: selectedItem.sourceId ?? "",
                                    onChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
                                        const nextSourceId = event.target.value || undefined;
                                        updateItem(selectedItem.id, { sourceId: nextSourceId, endpointPath: undefined, fieldPath: undefined });
                                    }
                                },
                                element("option", { value: "" }, "-- select --"),
                                ...sources.map((source) => element("option", { value: source.id }, source.name))
                            )
                        )
                        : null,
                    (selectedItem.type === "text" || selectedItem.type === "image")
                        ? element(
                            "div",
                            { className: "canvas-properties-row" },
                            element("label", null, "Endpoint"),
                            element(
                                "select",
                                {
                                    value: selectedItem.endpointPath ?? "",
                                    onChange: (event: React.ChangeEvent<HTMLSelectElement>) => updateItem(selectedItem.id, { endpointPath: event.target.value || undefined })
                                },
                                element("option", { value: "" }, "-- select --"),
                                ...selectedEndpoints.map((endpoint) => element("option", { value: endpoint.path }, `${endpoint.method} ${endpoint.path}`))
                            )
                        )
                        : null,
                    (selectedItem.type === "text" || selectedItem.type === "image")
                        ? element("div", { className: "canvas-properties-row" },
                            element("label", null, "Field"),
                            previewFields.length > 0
                                ? element(
                                    "select",
                                    {
                                        value: selectedItem.fieldPath ?? "",
                                        onChange: (event: React.ChangeEvent<HTMLSelectElement>) => updateItem(selectedItem.id, { fieldPath: event.target.value || undefined })
                                    },
                                    element("option", { value: "" }, "-- select --"),
                                    ...previewFields
                                        .filter((field) => !field.isContainer)
                                        .map((field) => element("option", { value: `response.${field.path}` }, field.path))
                                )
                                : element("input", {
                                    type: "text",
                                    placeholder: "response.data.title",
                                    value: selectedItem.fieldPath ?? "",
                                    onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { fieldPath: event.target.value })
                                })
                        )
                        : null,
                    (selectedItem.type === "text" || selectedItem.type === "image") && previewFields.length > 0
                        ? element("div", { className: "canvas-properties-row" },
                            element("label", null, "Field path"),
                            element("input", {
                                type: "text",
                                placeholder: "response.data.title",
                                value: selectedItem.fieldPath ?? "",
                                onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { fieldPath: event.target.value })
                            })
                        )
                        : null,
                    selectedItem.type === "text"
                        ? element("div", { className: "canvas-properties-row" },
                            element("label", null, "Format"),
                            element(
                                "select",
                                {
                                    value: selectedItem.format ?? "text",
                                    onChange: (event: React.ChangeEvent<HTMLSelectElement>) => updateItem(selectedItem.id, { format: event.target.value as "text" | "uppercase" | "json" })
                                },
                                element("option", { value: "text" }, "Text"),
                                element("option", { value: "uppercase" }, "Uppercase"),
                                element("option", { value: "json" }, "JSON")
                            )
                        )
                        : null,
                    (selectedItem.type === "text" || selectedItem.type === "image") && selectedItem.sourceId && selectedItem.endpointPath
                        ? element(
                            "div",
                            { className: "canvas-properties-row" },
                            element("label", null, "Fetch"),
                            element("button", {
                                className: "canvas-properties-button",
                                onClick: () => {
                                    void runTest(selectedItem.sourceId ?? "", selectedItem.endpointPath ?? "");
                                }
                            }, "Test")
                        )
                        : null,
                    (selectedItem.type === "text" || selectedItem.type === "image") && selectedItem.sourceId && selectedItem.endpointPath && selectedItem.fieldPath
                        ? element("div", { className: "canvas-properties-row" },
                            element("label", null, "Value"),
                            element("input", {
                                type: "text",
                                value: String(resolveFieldValue(selectedItem.sourceId, selectedItem.endpointPath, selectedItem.fieldPath) ?? ""),
                                readOnly: true
                            })
                        )
                        : null,
                    selectedTest
                        ? element("div", { className: "canvas-properties-row" },
                            element("label", null, "Status"),
                            element("div", { className: "canvas-properties-readonly" }, selectedTest.success ? `OK (${selectedTest.statusCode})` : `Error (${selectedTest.statusCode})`)
                        )
                        : null,
                    selectedItem.type === "image"
                        ? element("div", { className: "canvas-properties-row" },
                            element("label", null, "Image URL"),
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
                            element("label", null, "Fill"),
                            element("input", {
                                type: "color",
                                value: selectedItem.fill && selectedItem.fill !== "transparent" ? selectedItem.fill : "#ffffff",
                                onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { fill: event.target.value })
                            }),
                            element("button", {
                                className: "canvas-properties-button",
                                onClick: () => updateItem(selectedItem.id, { fill: "transparent" })
                            }, "Clear")
                        )
                        : null,
                    selectedItem.type === "rect" || selectedItem.type === "ellipse" || selectedItem.type === "line"
                        ? element(
                            "div",
                            { className: "canvas-properties-row" },
                            element("label", null, "Stroke"),
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
                            element("label", null, "Thickness"),
                            element("input", {
                                type: "number",
                                value: selectedItem.strokeWidth ?? selectedItem.height,
                                onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { strokeWidth: Math.max(2, Number(event.target.value) || 2), height: Math.max(2, Number(event.target.value) || 2) })
                            })
                        )
                        : null
                )
            )
        )
        : null;

    return <FormContainer node={element("div", { style: "position: relative; width: 100%; height: 100vh;" }, layoutNode, toolboxNode, propertiesNode, statusNode)} handlers={handlers} />;
};
