export { };
/*
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
  categoryId?: string;
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
  textContent?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  sourceId?: string;
  endpointPath?: string;
  fieldPath?: string;
  format?: string;
  template?: string;
  pollIntervalMs?: number;
  textColor?: string;
  fontSize?: number;
  fontWeight?: string;
  textAlign?: "left" | "center" | "right";
};

type VirtualState = Record<string, unknown>;

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

const allowedWidgetKinds = ["text", "image", "marquee"] as const;

const widgetDefaults: Record<string, { width: number; height: number }> = {
  text: { width: 260, height: 120 },
  image: { width: 260, height: 180 },
  marquee: { width: 320, height: 80 }
};

const widgetDefs: WidgetDefinition[] = [
  { id: "text", name: "Text", description: "Static or data-bound text", category: "Basic" },
  { id: "image", name: "Image/GIF", description: "Remote image or animated GIF", category: "Media" },
  { id: "marquee", name: "Marquee", description: "Scrolling ticker for text", category: "Ticker" }
];

const buildDataKey = (sourceId: string | undefined, endpointPath: string | undefined) => {
  if (!sourceId || !endpointPath) return "";
  return `${sourceId}|${endpointPath}`;
};

// Context for sharing data across components
const DesignerContext = React.createContext<{
  sources: DataSource[];
  previews: Map<string, ApiResponseMetadata>;
  testResponses: Map<string, TestResponse>;
  virtualState: VirtualState;
  ensurePreview: (sourceId: string) => Promise<void>;
  runTest: (sourceId: string, endpointPath: string) => Promise<TestResponse | null>;
  ingestData: (sourceId: string, endpointPath: string, data: unknown) => void;
}>(
  {
    sources: [],
    previews: new Map(),
    testResponses: new Map(),
    virtualState: {},
    ensurePreview: async () => { },
    runTest: async () => null,
    ingestData: () => { }
  }
);

const useDesignerData = () => React.useContext(DesignerContext);

// Widget component
const Widget: React.FC<{
  widget: WidgetProps;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<WidgetProps>) => void;
  onOpenEditor: () => void;
}> = ({ widget, isSelected, onSelect, onUpdate, onOpenEditor }) => {
  const { sources, previews, ensurePreview, runTest, testResponses, virtualState } = useDesignerData();

  const preferredSource = useMemo(() => {
    return sources.find(s => s.kind === "public-api") || sources[0];
  }, [sources]);

  const resolvedSourceId = widget.sourceId || preferredSource?.id || "";
  const source = sources.find(s => s.id === resolvedSourceId) ?? preferredSource;
  const endpoints = source?.endpoints ?? [];
  const endpoint = endpoints.find(e => `${e.method}:${e.path}` === widget.endpointPath) ?? endpoints[0];
  const endpointKey = endpoint ? `${endpoint.method}:${endpoint.path}` : "";
  const dataKey = buildDataKey(source?.id, endpointKey);

  const preview = previews.get(resolvedSourceId);
  const fields = preview?.fields ?? endpoint?.response?.fields ?? [];
  const selectableFields = fields.filter(f => !f.isContainer);

  const testKey = dataKey;
  const testData = testKey ? testResponses.get(testKey) : undefined;

  useEffect(() => {
    if (!widget.pollIntervalMs || !source?.id || !endpointKey) return;
    const interval = window.setInterval(() => {
      runTest(source.id!, endpointKey).catch(() => undefined);
    }, Math.max(1000, widget.pollIntervalMs));
    return () => window.clearInterval(interval);
  }, [widget.pollIntervalMs, source?.id, endpointKey, runTest]);

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
    const fallbackText = widget.textContent || widget.title || "Text";
    const candidateSource = dataKey ? virtualState[dataKey] ?? testData?.data : testData?.data;

    if (!widget.fieldPath) {
      return fallbackText;
    }
    if (!candidateSource) return fallbackText;

    const path = widget.fieldPath.replace(/^response\./, "");
    const keys = path.split(".");
    let value: any = candidateSource;
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) break;
    }
    if (value === undefined || value === null) return fallbackText;
    if (widget.format === "uppercase" && typeof value === "string") value = value.toUpperCase();
    if (widget.format === "json") value = JSON.stringify(value, null, 2);

    if (widget.template && typeof value !== "object") {
      return widget.template.replace("{binding}", String(value));
    }

    return value;
  }, [dataKey, testData, virtualState, widget.fieldPath, widget.format, widget.textContent, widget.title, widget.template]);

  const renderKind = widget.widgetKind;
  const isPlainText = renderKind === "text";
  const textStyle: React.CSSProperties = isPlainText ? {
    color: widget.textColor || "#f2f6fb",
    fontSize: widget.fontSize ? `${widget.fontSize}px` : "1.5rem",
    fontWeight: widget.fontWeight || "600",
    textAlign: widget.textAlign || "left"
  } : {};

  const style: React.CSSProperties = {
    left: widget.x,
    top: widget.y,
    width: widget.width,
    height: widget.height
  };

  if (isPlainText) {
    return (
      <div
        className={`overlay-widget overlay-${renderKind} ${isSelected ? "is-selected" : ""}`}
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
        <div className="widget-body" style={textStyle}>
          <span>{String(displayValue)}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`overlay-widget overlay-${renderKind} ${isSelected ? "is-selected" : ""}`}
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
      <div className="widget-body" style={textStyle}>
        {renderKind === "image" && typeof displayValue === "string" && displayValue.startsWith("http") ? (
          <img src={displayValue} alt="" />
        ) : renderKind === "marquee" ? (
          <div className="marquee">
            <div className="marquee-track">
              <span>{Array.isArray(displayValue) ? displayValue.join(" • ") : String(displayValue)}</span>
              <span aria-hidden>{Array.isArray(displayValue) ? displayValue.join(" • ") : String(displayValue)}</span>
            </div>
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
  export { };
          ))}
        </div >
  <button className="btn ghost" onClick={onClose}>
    Close
  </button>
      </div >
    </div >
  );
};

// Main App Component
const App: React.FC = () => {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [previews, setPreviews] = useState<Map<string, ApiResponseMetadata>>(new Map());
  const [testResponses, setTestResponses] = useState<Map<string, TestResponse>>(new Map());
  const [virtualState, setVirtualState] = useState<VirtualState>({});
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

  const ingestData = useCallback((sourceId: string, endpointPath: string, data: unknown) => {
    const key = buildDataKey(sourceId, endpointPath);
    if (!key) return;
    setVirtualState((prev) => ({ ...prev, [key]: data }));
  }, []);

  const runTest = useCallback(async (sourceId: string, endpointPath: string) => {
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
  }, [ingestData]);

  useEffect(() => {
    const onResize = () => {
      setScreenSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const addWidget = (widgetKind: string) => {
    const defaults = widgetDefaults[widgetKind] || { width: 240, height: 120 };
    const newWidget: WidgetProps = {
      id: `widget-${Date.now()}`,
      widgetKind,
      title: widgetDefs.find(w => w.id === widgetKind)?.name || widgetKind,
      textContent: widgetKind === "text" ? "Text" : undefined,
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
      const widgets = (JSON.parse(data) as WidgetProps[]).filter((w) =>
        allowedWidgetKinds.includes(w.widgetKind as typeof allowedWidgetKinds[number])
      );
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

  useEffect(() => {
    if (!previewOpen) return;
    const seen = new Set<string>();
    canvasState.widgets.forEach((w) => {
      if (!w.sourceId || !w.endpointPath) return;
      const key = buildDataKey(w.sourceId, w.endpointPath);
      if (key && !seen.has(key)) {
        seen.add(key);
        runTest(w.sourceId, w.endpointPath).catch(() => undefined);
      }
    });
  }, [previewOpen, canvasState.widgets, runTest]);

  const contextValue = useMemo(
    () => ({ sources, previews, testResponses, virtualState, ensurePreview, runTest, ingestData }),
    [sources, previews, testResponses, virtualState, ensurePreview, runTest, ingestData]
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
*/
