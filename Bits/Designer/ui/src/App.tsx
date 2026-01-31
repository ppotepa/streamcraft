import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Moveable from "react-moveable";

const GRID_SIZE = 16;
const LAYOUT_ID = "default";

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

type WidgetDefinition = {
    id: string;
    name: string;
    description: string;
    category?: string;
};

type WidgetProps = {
    id: string;
    widgetKind: string;
    title: string;
    x: number;
    y: number;
    width: number;
    height: number;
    sourceId?: string;
    endpointPath?: string;
    fieldPath?: string;
    format?: string;
};

type TestResponse = {
    success: boolean;
    statusCode: number;
    error?: string | null;
    data?: unknown;
};

type CanvasState = {
    widgets: WidgetProps[];
    selectedId: string | null;
};

const widgetDefaults: Record<string, { width: number; height: number }> = {
    label: { width: 220, height: 90 },
    "value-card": { width: 240, height: 120 },
    image: { width: 220, height: 150 },
    list: { width: 240, height: 160 },
    progress: { width: 220, height: 100 },
    autodetect: { width: 240, height: 120 }
};

const widgetDefs: WidgetDefinition[] = [
    { id: "label", name: "Label", description: "Text label", category: "Basic" },
    { id: "value-card", name: "Value Card", description: "Value with label", category: "Data" },
    { id: "image", name: "Image", description: "Image display", category: "Media" },
    { id: "list", name: "List", description: "List of items", category: "Data" },
    { id: "progress", name: "Progress", description: "Progress bar", category: "Data" },
    { id: "autodetect", name: "Auto Detect", description: "Auto-detect type", category: "Smart" }
];

// Context for sharing data across components
const DesignerContext = React.createContext<{
    sources: DataSource[];
    previews: Map<string, ApiResponseMetadata>;
    testResponses: Map<string, TestResponse>;
    ensurePreview: (sourceId: string) => Promise<void>;
    runTest: (sourceId: string, endpointPath: string) => Promise<TestResponse | null>;
}>({
    sources: [],
    previews: new Map(),
    testResponses: new Map(),
    ensurePreview: async () => { },
    runTest: async () => null
});

const useDesignerData = () => React.useContext(DesignerContext);

// Widget component
const Widget: React.FC<{
    widget: WidgetProps;
    isSelected: boolean;
    onSelect: () => void;
    onUpdate: (updates: Partial<WidgetProps>) => void;
    onOpenEditor: () => void;
}> = ({ widget, isSelected, onSelect, onUpdate, onOpenEditor }) => {
    const { sources, previews, ensurePreview, runTest, testResponses } = useDesignerData();

    const preferredSource = useMemo(() => {
        return sources.find(s => s.kind === "public-api") || sources[0];
    }, [sources]);

    const resolvedSourceId = widget.sourceId || preferredSource?.id || "";
    const source = sources.find(s => s.id === resolvedSourceId) ?? preferredSource;
    const endpoints = source?.endpoints ?? [];
    const endpoint = endpoints.find(e => `${e.method}:${e.path}` === widget.endpointPath) ?? endpoints[0];
    const endpointKey = endpoint ? `${endpoint.method}:${endpoint.path}` : "";

    const preview = previews.get(resolvedSourceId);
    const fields = preview?.fields ?? endpoint?.response?.fields ?? [];
    const selectableFields = fields.filter(f => !f.isContainer);

    const testKey = source?.id && endpointKey ? `${source.id}|${endpointKey}` : "";
    const testData = testKey ? testResponses.get(testKey) : undefined;

    useEffect(() => {
        if (source?.id) {
            ensurePreview(source.id);
        }
    }, [ensurePreview, source?.id]);

    useEffect(() => {
        if (!widget.endpointPath && endpoint) {
            onUpdate({ endpointPath: endpointKey });
        }
    }, [endpoint, endpointKey, onUpdate, widget.endpointPath]);

    useEffect(() => {
        if (selectableFields.length && !widget.fieldPath) {
            const pick = selectableFields[0];
            if (pick) {
                onUpdate({ fieldPath: `response.${pick.path}` });
            }
        }
    }, [selectableFields, onUpdate, widget.fieldPath]);

    const displayValue = useMemo(() => {
        if (!testData?.data || !widget.fieldPath) return "No data";
        const path = widget.fieldPath.replace(/^response\./, "");
        const keys = path.split(".");
        let value: any = testData.data;
        for (const key of keys) {
            value = value?.[key];
            if (value === undefined) break;
        }
        return value ?? "N/A";
    }, [testData, widget.fieldPath]);

    const renderKind = widget.widgetKind;

    const style: React.CSSProperties = {
        left: widget.x,
        top: widget.y,
        width: widget.width,
        height: widget.height
    };

    return (
        <div
            className={`overlay-widget ${isSelected ? "is-selected" : ""}`}
            style={style}
            data-widget-id={widget.id}
            data-kind={widget.widgetKind}
            onClick={(e) => {
                e.stopPropagation();
                onSelect();
            }}
            onDoubleClick={(e) => {
                e.stopPropagation();
                onOpenEditor();
            }}
        >
            <div className="widget-header">
                <div>
                    <p className="widget-kicker">{widget.widgetKind}</p>
                    <h3>{widget.title}</h3>
                </div>
                <div className="widget-spark">
                    {Array.from({ length: 8 }).map((_, index) => (
                        <span key={index} style={{ height: `${6 + ((index * 7) % 14)}px` }} />
                    ))}
                </div>
            </div>
            <div className="widget-body">
                {renderKind === "image" && typeof displayValue === "string" && displayValue.startsWith("http") ? (
                    <img src={displayValue} alt="" />
                ) : renderKind === "progress" && typeof displayValue === "number" ? (
                    <div className="progress-shell">
                        <div className="progress-track">
                            <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, displayValue))}%` }} />
                        </div>
                        <span>{displayValue.toFixed(0)}%</span>
                    </div>
                ) : (
                    <span>{String(displayValue)}</span>
                )}
            </div>
        </div>
    );
};

// Palette component
const Palette: React.FC<{ onAddWidget: (widgetKind: string) => void }> = ({ onAddWidget }) => {
    return (
        <div className="palette-strip">
            {widgetDefs.map((widget) => (
                <button key={widget.id} className="palette-card" data-widget={widget.id} onClick={() => onAddWidget(widget.id)}>
                    <div className="palette-preview" data-widget={widget.id}>
                        <span />
                        <span />
                        <span />
                    </div>
                    <div className="palette-info">
                        <h4>{widget.name}</h4>
                        <p>{widget.description}</p>
                        <span>{widget.category || "Widget"}</span>
                    </div>
                </button>
            ))}
        </div>
    );
};

// Moveable layer for selected widget
const MoveableLayer: React.FC<{
    selectedWidget: WidgetProps | null;
    onUpdate: (updates: Partial<WidgetProps>) => void;
    canvasRef: React.RefObject<HTMLDivElement>;
    snapEnabled: boolean;
}> = ({ selectedWidget, onUpdate, canvasRef, snapEnabled }) => {
    const startRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

    if (!selectedWidget) return null;

    const target = document.querySelector(`[data-widget-id="${selectedWidget.id}"]`) as HTMLElement;
    if (!target) return null;

    return (
        <Moveable
            target={target}
            container={canvasRef.current ?? undefined}
            draggable
            resizable
            snappable={snapEnabled}
            snapGridWidth={GRID_SIZE}
            snapGridHeight={GRID_SIZE}
            elementGuidelines={Array.from(document.querySelectorAll(".overlay-widget"))}
            onDragStart={() => {
                startRef.current = { x: selectedWidget.x, y: selectedWidget.y, width: selectedWidget.width, height: selectedWidget.height };
            }}
            onDrag={({ beforeTranslate }) => {
                const { x, y } = startRef.current;
                onUpdate({
                    x: Math.max(0, x + beforeTranslate[0]),
                    y: Math.max(0, y + beforeTranslate[1])
                });
            }}
            onResizeStart={() => {
                startRef.current = { x: selectedWidget.x, y: selectedWidget.y, width: selectedWidget.width, height: selectedWidget.height };
            }}
            onResize={({ width, height, drag }) => {
                const { x, y } = startRef.current;
                const nextX = x + drag.beforeTranslate[0];
                const nextY = y + drag.beforeTranslate[1];
                onUpdate({
                    x: Math.max(0, nextX),
                    y: Math.max(0, nextY),
                    width: Math.max(120, width),
                    height: Math.max(70, height)
                });
            }}
        />
    );
};

// Modal editor for widget configuration
const WidgetEditorModal: React.FC<{
    open: boolean;
    draft: WidgetProps | null;
    sources: DataSource[];
    previews: Map<string, ApiResponseMetadata>;
    onChangeDraft: (next: WidgetProps) => void;
    onClose: () => void;
    onSave: () => void;
    ensurePreview: (sourceId: string) => Promise<void>;
    runTest: (sourceId: string, endpointPath: string) => Promise<TestResponse | null>;
}> = ({ open, draft, sources, previews, onChangeDraft, onClose, onSave, ensurePreview, runTest }) => {
    const resolvedSourceId = draft?.sourceId || sources[0]?.id || "";
    const source = sources.find((s) => s.id === resolvedSourceId) ?? sources[0];
    const endpoints = source?.endpoints ?? [];
    const endpoint = endpoints.find((ep) => `${ep.method}:${ep.path}` === draft?.endpointPath) ?? endpoints[0];
    const endpointKey = endpoint ? `${endpoint.method}:${endpoint.path}` : "";

    useEffect(() => {
        if (resolvedSourceId) {
            ensurePreview(resolvedSourceId).catch(() => undefined);
        }
    }, [ensurePreview, resolvedSourceId]);

    const preview = resolvedSourceId ? previews.get(resolvedSourceId) : undefined;
    const fields = preview?.fields ?? endpoint?.response?.fields ?? [];
    const selectableFields = fields.filter((f) => !f.isContainer);

    if (!open || !draft) return null;

    const updateDraft = (updates: Partial<WidgetProps>) => {
        onChangeDraft({ ...draft, ...updates });
    };

    const handleTest = async () => {
        if (resolvedSourceId && endpointKey) {
            await runTest(resolvedSourceId, endpointKey);
        }
    };

    return (
        <div className="editor-modal">
            <div className="editor-backdrop" onClick={onClose} />
            <div className="editor-panel">
                <div className="editor-header">
                    <div>
                        <p className="eyebrow">Widget Editor</p>
                        <h3>{draft.title}</h3>
                    </div>
                    <div className="editor-actions">
                        <button className="btn ghost" onClick={onClose}>Cancel</button>
                        <button className="btn primary" onClick={onSave}>Save</button>
                    </div>
                </div>

                <div className="editor-grid">
                    <section className="editor-section">
                        <h4>Basics</h4>
                        <label className="field">
                            <span>Title</span>
                            <input
                                type="text"
                                value={draft.title}
                                onChange={(e) => updateDraft({ title: e.target.value })}
                            />
                        </label>
                        <label className="field">
                            <span>Source</span>
                            <select
                                value={resolvedSourceId}
                                onChange={(e) => updateDraft({ sourceId: e.target.value, endpointPath: "", fieldPath: "" })}
                            >
                                {sources.map((src) => (
                                    <option key={src.id} value={src.id}>
                                        {src.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="field">
                            <span>Endpoint</span>
                            <select
                                value={draft.endpointPath || endpointKey}
                                onChange={(e) => updateDraft({ endpointPath: e.target.value, fieldPath: "" })}
                            >
                                {endpoints.map((ep) => (
                                    <option key={`${ep.method}:${ep.path}`} value={`${ep.method}:${ep.path}`}>
                                        {ep.name || ep.path}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="field">
                            <span>Field</span>
                            <select
                                value={draft.fieldPath || ""}
                                onChange={(e) => updateDraft({ fieldPath: e.target.value })}
                            >
                                {selectableFields.length === 0 ? (
                                    <option value="">No fields</option>
                                ) : (
                                    selectableFields.map((field) => (
                                        <option key={field.path} value={`response.${field.path}`}>
                                            {field.path}
                                        </option>
                                    ))
                                )}
                            </select>
                        </label>
                        <label className="field">
                            <span>Format</span>
                            <select
                                value={draft.format || "text"}
                                onChange={(e) => updateDraft({ format: e.target.value })}
                            >
                                <option value="text">Text</option>
                                <option value="number">Number</option>
                                <option value="json">JSON</option>
                                <option value="uppercase">Uppercase</option>
                            </select>
                        </label>
                        <button className="btn micro" onClick={handleTest} disabled={!resolvedSourceId || !endpointKey}>
                            Test request
                        </button>
                    </section>

                    <section className="editor-section">
                        <h4>Layout</h4>
                        <div className="layout-grid">
                            <label className="field">
                                <span>X</span>
                                <input
                                    type="number"
                                    value={draft.x}
                                    onChange={(e) => updateDraft({ x: Number(e.target.value) })}
                                />
                            </label>
                            <label className="field">
                                <span>Y</span>
                                <input
                                    type="number"
                                    value={draft.y}
                                    onChange={(e) => updateDraft({ y: Number(e.target.value) })}
                                />
                            </label>
                            <label className="field">
                                <span>Width</span>
                                <input
                                    type="number"
                                    value={draft.width}
                                    onChange={(e) => updateDraft({ width: Number(e.target.value) })}
                                />
                            </label>
                            <label className="field">
                                <span>Height</span>
                                <input
                                    type="number"
                                    value={draft.height}
                                    onChange={(e) => updateDraft({ height: Number(e.target.value) })}
                                />
                            </label>
                        </div>
                        <div className="editor-note">Double-click opens this editor. Drag/resize stays on canvas.</div>
                    </section>
                </div>
            </div>
        </div>
    );
};

// Preview modal overlaying widgets on sample video
const PreviewModal: React.FC<{
    open: boolean;
    widgets: WidgetProps[];
    onClose: () => void;
}> = ({ open, widgets, onClose }) => {
    if (!open) return null;

    return (
        <div className="preview-modal">
            <div className="preview-backdrop" onClick={onClose} />
            <div className="preview-window">
                <video className="preview-video" autoPlay muted loop playsInline>
                    <source
                        src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
                        type="video/mp4"
                    />
                </video>
                <div className="preview-overlay">
                    {widgets.map((widget) => (
                        <Widget
                            key={widget.id}
                            widget={widget}
                            isSelected={false}
                            onSelect={() => { }}
                            onUpdate={() => { }}
                            onOpenEditor={() => { }}
                        />
                    ))}
                </div>
                <button className="btn ghost" onClick={onClose}>
                    Close
                </button>
            </div>
        </div>
    );
};

// Main App Component
const App: React.FC = () => {
    const [sources, setSources] = useState<DataSource[]>([]);
    const [previews, setPreviews] = useState<Map<string, ApiResponseMetadata>>(new Map());
    const [testResponses, setTestResponses] = useState<Map<string, TestResponse>>(new Map());
    const [canvasState, setCanvasState] = useState<CanvasState>({ widgets: [], selectedId: null });
    const [screenSize, setScreenSize] = useState({ width: window.innerWidth, height: window.innerHeight });
    const [gridEnabled, setGridEnabled] = useState(true);
    const [snapEnabled, setSnapEnabled] = useState(true);
    const [safeZoneEnabled, setSafeZoneEnabled] = useState(true);
    const [status, setStatus] = useState("");
    const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);
    const [editorDraft, setEditorDraft] = useState<WidgetProps | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);

    const canvasRef = useRef<HTMLDivElement>(null);

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

    const runTest = useCallback(async (sourceId: string, endpointPath: string) => {
        if (!sourceId || !endpointPath) return null;
        const key = `${sourceId}|${endpointPath}`;

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
    }, []);

    useEffect(() => {
        const onResize = () => {
            setScreenSize({ width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const addWidget = (widgetKind: string) => {
        const defaults = widgetDefaults[widgetKind] || { width: 220, height: 120 };
        const newWidget: WidgetProps = {
            id: `widget-${Date.now()}`,
            widgetKind,
            title: widgetDefs.find(w => w.id === widgetKind)?.name || widgetKind,
            x: 40,
            y: 40,
            width: defaults.width,
            height: defaults.height
        };
        setCanvasState((prev) => ({
            widgets: [...prev.widgets, newWidget],
            selectedId: newWidget.id
        }));
    };

    const updateWidget = (id: string, updates: Partial<WidgetProps>) => {
        setCanvasState((prev) => ({
            ...prev,
            widgets: prev.widgets.map((w) => (w.id === id ? { ...w, ...updates } : w))
        }));
    };

    const selectWidget = (id: string | null) => {
        setCanvasState((prev) => ({ ...prev, selectedId: id }));
    };

    const saveLayout = async (label: string) => {
        const serialized = JSON.stringify(canvasState.widgets);
        const res = await fetch(`/designer/layout?layoutId=${encodeURIComponent(LAYOUT_ID)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: serialized
        });
        if (!res.ok) {
            setStatus("Save failed");
            return;
        }
        setStatus(label);
        setTimeout(() => setStatus(""), 2000);
    };

    const loadLayout = useCallback(async () => {
        const res = await fetch(`/designer/layout?layoutId=${encodeURIComponent(LAYOUT_ID)}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data === "string") {
            const widgets = JSON.parse(data) as WidgetProps[];
            setCanvasState({ widgets, selectedId: null });
        }
    }, []);

    useEffect(() => {
        loadLayout().catch((err) => console.warn("Failed to load layout", err));
    }, [loadLayout]);

    const selectedWidget = canvasState.widgets.find((w) => w.id === canvasState.selectedId) || null;

    const handleOpenEditor = (widget: WidgetProps) => {
        setEditingWidgetId(widget.id);
        setEditorDraft({ ...widget });
    };

    const handleCloseEditor = () => {
        setEditingWidgetId(null);
        setEditorDraft(null);
    };

    const handleSaveEditor = () => {
        if (editingWidgetId && editorDraft) {
            updateWidget(editingWidgetId, editorDraft);
        }
        handleCloseEditor();
    };

    const openPreview = () => setPreviewOpen(true);
    const closePreview = () => setPreviewOpen(false);

    const contextValue = useMemo(
        () => ({ sources, previews, testResponses, ensurePreview, runTest }),
        [sources, previews, testResponses, ensurePreview, runTest]
    );

    return (
        <DesignerContext.Provider value={contextValue}>
            <div className="designer-app">
                <header className="app-header">
                    <div>
                        <p className="eyebrow">StreamCraft Designer</p>
                        <h1>Overlay Builder</h1>
                        <p className="subtitle">Drag, drop, and configure overlay widgets</p>
                    </div>
                    <div className="header-actions">
                        <button className="btn ghost" onClick={openPreview}>
                            Preview
                        </button>
                        <button className="btn primary" onClick={() => saveLayout("Saved layout")}>
                            Save
                        </button>
                        <button className="btn accent" onClick={() => saveLayout("Published layout")}>
                            Publish
                        </button>
                        <button className="btn ghost" onClick={() => window.location.reload()}>
                            Reset
                        </button>
                    </div>
                </header>

                <section className="tools-row">
                    <div className="tools-header">
                        <div>
                            <p className="eyebrow">Widget Palette</p>
                            <h2>Palette</h2>
                        </div>
                        <div className="tools-controls">
                            <label className="toggle">
                                <input type="checkbox" checked={gridEnabled} onChange={(e) => setGridEnabled(e.target.checked)} />
                                <span>Show grid</span>
                            </label>
                            <label className="toggle">
                                <input type="checkbox" checked={snapEnabled} onChange={(e) => setSnapEnabled(e.target.checked)} />
                                <span>Align to grid</span>
                            </label>
                            <label className="toggle">
                                <input type="checkbox" checked={safeZoneEnabled} onChange={(e) => setSafeZoneEnabled(e.target.checked)} />
                                <span>Safe zone</span>
                            </label>
                            <span className="chip">
                                {Math.round(screenSize.width)}x{Math.round(screenSize.height)}
                            </span>
                        </div>
                    </div>
                    <Palette onAddWidget={addWidget} />
                </section>

                <section className="canvas-row">
                    <div className="canvas-header">
                        <div>
                            <p className="eyebrow">Canvas</p>
                            <h2>Live Layout</h2>
                        </div>
                        <div className="canvas-meta">
                            <span className="chip">
                                {Math.round(screenSize.width)}x{Math.round(screenSize.height)}
                            </span>
                            <span className={`chip ${snapEnabled ? "" : "chip-muted"}`}>Snap: {snapEnabled ? "On" : "Off"}</span>
                            <span className={`chip ${safeZoneEnabled ? "" : "chip-muted"}`}>Safe Zone</span>
                            <span className="chip">{canvasState.widgets.length} widgets</span>
                        </div>
                    </div>
                    <div
                        className={`canvas-stage ${gridEnabled ? "grid-on" : ""}`}
                        ref={canvasRef}
                        onClick={() => selectWidget(null)}
                    >
                        {safeZoneEnabled && <div className="safe-zone" />}
                        {canvasState.widgets.map((widget) => (
                            <Widget
                                key={widget.id}
                                widget={widget}
                                isSelected={widget.id === canvasState.selectedId}
                                onSelect={() => selectWidget(widget.id)}
                                onUpdate={(updates) => updateWidget(widget.id, updates)}
                                onOpenEditor={() => handleOpenEditor(widget)}
                            />
                        ))}
                        <MoveableLayer
                            selectedWidget={selectedWidget}
                            onUpdate={(updates) => selectedWidget && updateWidget(selectedWidget.id, updates)}
                            canvasRef={canvasRef}
                            snapEnabled={snapEnabled}
                        />
                    </div>
                </section>

                <WidgetEditorModal
                    open={Boolean(editingWidgetId && editorDraft)}
                    draft={editorDraft}
                    sources={sources}
                    previews={previews}
                    onChangeDraft={(next) => setEditorDraft(next)}
                    onClose={handleCloseEditor}
                    onSave={handleSaveEditor}
                    ensurePreview={ensurePreview}
                    runTest={runTest}
                />

                <PreviewModal
                    open={previewOpen}
                    widgets={canvasState.widgets}
                    onClose={closePreview}
                />

                {status && <div className="status-pill">{status}</div>}
            </div>
        </DesignerContext.Provider>
    );
};

export default App;
