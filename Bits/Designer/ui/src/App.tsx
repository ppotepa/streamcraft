
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Editor, Element, Frame, useEditor, useNode } from "@craftjs/core";
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
  success?: boolean;
  statusCode?: number;
  url?: string;
  contentType?: string;
  fetchedUtc?: string;
  response?: unknown;
  error?: string | null;
};

type DesignerDataContextValue = {
  sources: DataSource[];
  previews: Map<string, unknown>;
  testResponses: Map<string, TestResponse>;
  ensurePreview: (sourceId: string) => Promise<void>;
  refreshSources: () => Promise<void>;
  runTest: (sourceId: string, endpointPath: string) => Promise<TestResponse | null>;
};

const DesignerDataContext = React.createContext<DesignerDataContextValue | null>(null);

const useDesignerData = () => {
  const context = React.useContext(DesignerDataContext);
  if (!context) {
    throw new Error("DesignerDataContext not available");
  }
  return context;
};


const normalizeKey = (value: string) => value.trim().toLowerCase();

const makeEndpointKey = (endpoint: ApiEndpoint) => endpoint.path || endpoint.name;

const makeTestKey = (sourceId: string, endpointKey: string) =>
  `${normalizeKey(sourceId)}::${normalizeKey(endpointKey)}`;

const findPreferredSource = (sources: DataSource[]) => {
  if (sources.length === 0) return undefined;
  return sources.find((source) => (source.endpoints?.length ?? 0) > 0) ?? sources[0];
};

const findEndpoint = (endpoints: ApiEndpoint[], endpointPath?: string) => {
  if (!endpointPath) return undefined;
  const normalized = normalizeKey(endpointPath);
  return endpoints.find(
    (endpoint) =>
      normalizeKey(endpoint.path || "") === normalized ||
      normalizeKey(endpoint.name || "") === normalized
  );
};

const unwrapResponse = (payload: unknown) => {
  if (!payload || typeof payload !== "object") return payload;
  if ("response" in payload) {
    return (payload as { response?: unknown }).response;
  }
  return payload;
};

const resolvePath = (value: unknown, path?: string) => {
  if (!value || !path) return undefined;
  const normalized = path.startsWith("response.") ? path.slice("response.".length) : path;
  const tokens = normalized.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let current: any = value;
  for (const token of tokens) {
    if (current == null) return undefined;
    current = current[token];
  }
  return current;
};

const formatValue = (value: unknown, format?: string) => {
  if (format === "json") return JSON.stringify(value, null, 2);
  if (format === "uppercase" && typeof value === "string") return value.toUpperCase();
  if (format === "number" && typeof value === "number") return value.toFixed(2);
  if (typeof value === "string") return value;
  return value == null ? "" : JSON.stringify(value);
};

const autoPickField = (fields: ApiFieldSpec[] = []) => {
  const priority = [
    "title",
    "name",
    "label",
    "description",
    "summary",
    "value",
    "count",
    "status",
    "url",
    "image",
    "img",
    "icon",
    "avatar",
    "photo",
    "thumbnail"
  ];
  const candidate = fields.find((field) => {
    const last = field.path?.split(".").pop()?.toLowerCase() ?? "";
    return priority.includes(last);
  });
  return candidate?.path ?? fields[0]?.path ?? "";
};

const detectAutoKind = (value: unknown, fieldPath?: string, fieldType?: string) => {
  const pathHint = (fieldPath ?? "").toLowerCase();
  const imageHints = [
    "image",
    "img",
    "avatar",
    "photo",
    "thumbnail",
    "icon",
    "logo",
    "cover",
    "banner",
    "picture"
  ];
  const looksLikeImage = imageHints.some((hint) => pathHint.includes(hint));

  if (typeof value === "string" && /https?:\/\/.*\.(png|jpg|jpeg|gif|webp|svg)/i.test(value)) {
    return "image";
  }
  if (looksLikeImage) return "image";
  if (Array.isArray(value)) return "list";
  if (typeof value === "number") return "progress";
  if (fieldType === "array") return "list";
  if (fieldType === "number") return "progress";
  return "value-card";
};


const DesignerDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [previews, setPreviews] = useState<Map<string, unknown>>(new Map());
  const [testResponses, setTestResponses] = useState<Map<string, TestResponse>>(new Map());

  const refreshSources = useCallback(async () => {
    const res = await fetch("/designer/sources", { cache: "no-store" });
    if (!res.ok) {
      throw new Error(await res.text());
    }
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
        const res = await fetch(`/designer/preview?sourceId=${encodeURIComponent(sourceId)}`, {
          cache: "no-store"
        });
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
    const key = makeTestKey(sourceId, endpointPath);

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
      const payload = {
        success: false,
        error: err instanceof Error ? err.message : "Request failed"
      };
      setTestResponses((prev) => {
        const next = new Map(prev);
        next.set(key, payload);
        return next;
      });
      return payload;
    }
  }, []);

  return (
    <DesignerDataContext.Provider
      value={{ sources, previews, testResponses, ensurePreview, refreshSources, runTest }}
    >
      {children}
    </DesignerDataContext.Provider>
  );
};

type CanvasRootComponent = React.FC<{ children?: React.ReactNode }> & { craft?: { displayName?: string } };

const CanvasRoot: CanvasRootComponent = ({ children }) => {
  const { connectors } = useNode();
  return (
    <div ref={(ref) => ref && connectors.connect(ref)} className="canvas-root">
      {children}
    </div>
  );
};

CanvasRoot.craft = {
  displayName: "Canvas"
};


const WidgetShell: React.FC<WidgetProps> = (props) => {
  const { sources, previews, ensurePreview, runTest, testResponses } = useDesignerData();
  const { connectors, setProp, selected, id } = useNode((node) => ({
    selected: node.events.selected,
    id: node.id
  }));

  const preferredSource = useMemo(() => findPreferredSource(sources), [sources]);
  const resolvedSourceId = props.sourceId || preferredSource?.id || "";
  const source = sources.find((item) => item.id === resolvedSourceId) ?? preferredSource;
  const endpoints = source?.endpoints ?? [];
  const endpoint = findEndpoint(endpoints, props.endpointPath) ?? endpoints[0];
  const endpointKey = endpoint ? makeEndpointKey(endpoint) : "";
  const fields = endpoint?.response?.fields ?? [];
  const leafFields = fields.filter((field) => !field.isContainer);
  const selectableFields = leafFields.length > 0 ? leafFields : fields;

  const testKey = source && endpointKey ? makeTestKey(source.id, endpointKey) : null;
  const testPayload = testKey ? testResponses.get(testKey) : null;
  const previewPayload = source?.id ? previews.get(source.id) : null;

  const metadataField = fields.find(
    (field) => field.path === props.fieldPath?.replace("response.", "")
  );

  const dataValue = unwrapResponse(testPayload) ?? unwrapResponse(previewPayload);
  const resolvedValue = resolvePath(dataValue, props.fieldPath);
  const displayValue =
    resolvedValue ??
    metadataField?.example ??
    (metadataField?.type === "array" ? "[ ... ]" : metadataField?.type === "object" ? "{ ... }" : undefined);

  const renderKind =
    props.widgetKind === "autodetect"
      ? detectAutoKind(displayValue, metadataField?.path, metadataField?.type)
      : props.widgetKind;

  useEffect(() => {
    if (!props.sourceId && preferredSource?.id) {
      setProp((draft) => {
        (draft as WidgetProps).sourceId = preferredSource.id;
      });
    }
  }, [preferredSource?.id, props.sourceId, setProp]);

  useEffect(() => {
    if (!source || endpoints.length === 0) return;
    const match = findEndpoint(endpoints, props.endpointPath);
    if (!match) {
      const nextEndpoint = endpoints[0];
      if (!nextEndpoint) return;
      setProp((draft) => {
        const propsDraft = draft as WidgetProps;
        propsDraft.endpointPath = makeEndpointKey(nextEndpoint);
        propsDraft.fieldPath = "";
      });
    }
  }, [endpoints, props.endpointPath, setProp, source]);

  useEffect(() => {
    if (!selectableFields.length) return;
    if (!props.fieldPath) {
      const pick = autoPickField(selectableFields);
      if (pick) {
        setProp((draft) => {
          (draft as WidgetProps).fieldPath = `response.${pick}`;
        });
      }
    }
  }, [props.fieldPath, selectableFields, setProp]);

  useEffect(() => {
    if (source?.id) {
      ensurePreview(source.id);
    }
  }, [ensurePreview, source?.id]);

  const handleSourceChange = (value: string) => {
    setProp((draft) => {
      const propsDraft = draft as WidgetProps;
      propsDraft.sourceId = value;
      propsDraft.endpointPath = "";
      propsDraft.fieldPath = "";
    });
  };

  const handleEndpointChange = (value: string) => {
    setProp((draft) => {
      const propsDraft = draft as WidgetProps;
      propsDraft.endpointPath = value;
      propsDraft.fieldPath = "";
    });
  };

  const handleFieldChange = (value: string) => {
    setProp((draft) => {
      (draft as WidgetProps).fieldPath = value;
    });
  };

  const handleFormatChange = (value: string) => {
    setProp((draft) => {
      (draft as WidgetProps).format = value;
    });
  };

  const handleTest = async () => {
    if (!source?.id || !endpointKey) return;
    await runTest(source.id, endpointKey);
  };

  const stopPointer = (event: React.MouseEvent | React.PointerEvent) => {
    event.stopPropagation();
  };

  const style: React.CSSProperties = {
    left: props.x,
    top: props.y,
    width: props.width,
    height: props.height
  };

  return (
    <div
      ref={(ref) => ref && connectors.connect(ref)}
      className={`overlay-widget ${selected ? "is-selected" : ""}`}
      style={style}
      data-node-id={id}
      data-kind={props.widgetKind}
    >
      <div className="widget-header">
        <div>
          <p className="widget-kicker">{props.widgetKind}</p>
          <h3>{props.title}</h3>
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
              <div
                className="progress-fill"
                style={{ width: `${Math.min(100, Math.max(0, displayValue))}%` }}
              />
            </div>
            <span>{displayValue.toFixed(0)}%</span>
          </div>
        ) : renderKind === "value-card" ? (
          <div className="value-card">
            <span className="value-card-label">{props.fieldPath || "Bind field"}</span>
            <strong>{displayValue !== undefined ? formatValue(displayValue, props.format) : "-"}</strong>
          </div>
        ) : renderKind === "list" && Array.isArray(displayValue) ? (
          <ul>
            {displayValue.slice(0, 3).map((item, index) => (
              <li key={index}>{formatValue(item, props.format)}</li>
            ))}
          </ul>
        ) : (
          <span>{displayValue !== undefined ? formatValue(displayValue, props.format) : "Bind a field"}</span>
        )}
      </div>
      <div className="widget-binding" onPointerDown={stopPointer}>
        <select value={resolvedSourceId} onChange={(event) => handleSourceChange(event.target.value)}>
          {sources.length === 0 ? (
            <option value="">No sources</option>
          ) : (
            sources.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name || item.id}
              </option>
            ))
          )}
        </select>
        <select
          value={props.endpointPath || endpointKey || ""}
          onChange={(event) => handleEndpointChange(event.target.value)}
        >
          {endpoints.length === 0 ? (
            <option value="">No endpoints</option>
          ) : (
            endpoints.map((item) => {
              const key = makeEndpointKey(item);
              return (
                <option key={key} value={key}>
                  {item.name || item.path}
                </option>
              );
            })
          )}
        </select>
        <select
          value={props.fieldPath || (selectableFields[0] ? `response.${selectableFields[0].path}` : "")}
          onChange={(event) => handleFieldChange(event.target.value)}
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
        <select value={props.format || "raw"} onChange={(event) => handleFormatChange(event.target.value)}>
          <option value="raw">Raw</option>
          <option value="number">Number</option>
          <option value="uppercase">Uppercase</option>
          <option value="json">JSON</option>
        </select>
        <button className="btn micro" onClick={handleTest} disabled={!source?.id || !endpointKey}>
          Test
        </button>
      </div>
    </div>
  );
};


const LabelWidget: React.FC<WidgetProps> = (props) => <WidgetShell {...props} />;
const ImageWidget: React.FC<WidgetProps> = (props) => <WidgetShell {...props} widgetKind="image" />;
const ValueCardWidget: React.FC<WidgetProps> = (props) => (
  <WidgetShell {...props} widgetKind="value-card" />
);
const ListWidget: React.FC<WidgetProps> = (props) => <WidgetShell {...props} widgetKind="list" />;
const ProgressWidget: React.FC<WidgetProps> = (props) => (
  <WidgetShell {...props} widgetKind="progress" />
);
const AutoDetectWidget: React.FC<WidgetProps> = (props) => (
  <WidgetShell {...props} widgetKind="autodetect" />
);

const widgetDefaults: Record<string, Partial<WidgetProps>> = {
  label: { width: 220, height: 90 },
  "value-card": { width: 240, height: 120 },
  image: { width: 220, height: 150 },
  list: { width: 240, height: 160 },
  progress: { width: 220, height: 100 },
  autodetect: { width: 240, height: 120 }
};

const widgetComponents: Record<string, React.FC<WidgetProps>> = {
  label: LabelWidget,
  "value-card": ValueCardWidget,
  image: ImageWidget,
  list: ListWidget,
  progress: ProgressWidget,
  autodetect: AutoDetectWidget
};

const Palette: React.FC<{ widgets: WidgetDefinition[] }> = ({ widgets }) => {
  const { connectors } = useEditor();

  return (
    <div className="palette-strip">
      {widgets.map((widget) => {
        const Component = widgetComponents[widget.id] ?? LabelWidget;
        const defaults = widgetDefaults[widget.id] ?? { width: 220, height: 120 };
        return (
          <button
            key={widget.id}
            className="palette-card"
            data-widget={widget.id}
            ref={(ref) =>
              ref &&
              connectors.create(
                ref,
                <Component
                  widgetKind={widget.id}
                  title={widget.name}
                  x={40}
                  y={40}
                  width={defaults.width ?? 220}
                  height={defaults.height ?? 120}
                />
              )
            }
          >
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
        );
      })}
    </div>
  );
};

const MoveableLayer: React.FC<{ canvasRef: React.RefObject<HTMLDivElement>; snapEnabled: boolean }> = ({
  canvasRef,
  snapEnabled
}) => {
  const { selected, actions, query } = useEditor((state) => ({
    selected: state.events.selected
  }));

  const selectedId = selected ? Array.from(selected)[0] : undefined;
  const target = selectedId ? query.node(selectedId).get().dom : null;
  const startRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  if (!selectedId || !target) {
    return null;
  }

  const updateProps = (next: Partial<WidgetProps>) => {
    actions.setProp(selectedId, (props) => {
      Object.assign(props as WidgetProps, next);
    });
  };

  return (
    <Moveable
      target={target as HTMLElement}
      container={canvasRef.current ?? undefined}
      draggable
      resizable
      snappable={snapEnabled}
      snapGridWidth={GRID_SIZE}
      snapGridHeight={GRID_SIZE}
      elementGuidelines={Array.from(document.querySelectorAll(".overlay-widget"))}
      onDragStart={() => {
        const props = query.node(selectedId).get().data.props as WidgetProps;
        startRef.current = { x: props.x, y: props.y, width: props.width, height: props.height };
      }}
      onDrag={({ beforeTranslate }) => {
        const { x, y } = startRef.current;
        updateProps({
          x: Math.max(0, x + beforeTranslate[0]),
          y: Math.max(0, y + beforeTranslate[1])
        });
      }}
      onResizeStart={() => {
        const props = query.node(selectedId).get().data.props as WidgetProps;
        startRef.current = { x: props.x, y: props.y, width: props.width, height: props.height };
      }}
      onResize={({ width, height, drag }) => {
        const { x, y } = startRef.current;
        const nextX = x + drag.beforeTranslate[0];
        const nextY = y + drag.beforeTranslate[1];
        updateProps({
          x: Math.max(0, nextX),
          y: Math.max(0, nextY),
          width: Math.max(120, width),
          height: Math.max(70, height)
        });
      }}
    />
  );
};

const PreviewModal: React.FC<{ open: boolean; onClose: () => void; serialized: string | null }> = ({
  open,
  onClose,
  serialized
}) => {
  if (!open || !serialized) return null;
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
          <Editor
            enabled={false}
            resolver={{
              CanvasRoot,
              LabelWidget,
              ImageWidget,
              ValueCardWidget,
              ListWidget,
              ProgressWidget,
              AutoDetectWidget
            }}
          >
            <Frame data={serialized} />
          </Editor>
        </div>
        <button className="btn ghost" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};


const DesignerShell: React.FC = () => {
  const { query, actions, enabled } = useEditor((state) => ({
    enabled: state.options.enabled
  }));
  const { sources, previews, testResponses, runTest } = useDesignerData();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [widgetDefs, setWidgetDefs] = useState<WidgetDefinition[]>([]);
  const [gridEnabled, setGridEnabled] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [safeZoneEnabled, setSafeZoneEnabled] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSerialized, setPreviewSerialized] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [screenSize, setScreenSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const { selectedId, selectedProps } = useEditor((state) => {
    const selected = state.events.selected;
    const selectedId = selected ? Array.from(selected)[0] : undefined;
    if (!selectedId) {
      return { selectedId: undefined, selectedProps: null };
    }
    return {
      selectedId,
      selectedProps: state.nodes[selectedId]?.data.props as WidgetProps
    };
  });

  useEffect(() => {
    const loadWidgets = async () => {
      const res = await fetch("/designer/widgets", { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as WidgetDefinition[];
      setWidgetDefs(data ?? []);
    };

    loadWidgets().catch((err) => console.warn("Failed to load widgets", err));
  }, []);

  useEffect(() => {
    const loadLayout = async () => {
      const res = await fetch(`/designer/layout?layoutId=${encodeURIComponent(LAYOUT_ID)}`, {
        cache: "no-store"
      });
      if (res.status === 204) return;
      if (!res.ok) throw new Error(await res.text());
      const json = await res.text();
      if (json) {
        actions.deserialize(json);
      }
    };

    loadLayout().catch((err) => console.warn("Failed to load layout", err));
  }, [actions]);

  useEffect(() => {
    const onResize = () => {
      setScreenSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (!canvasRef.current) return;
      const container = canvasRef.current.parentElement;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const ratio = screenSize.width / Math.max(1, screenSize.height);
      let width = rect.width;
      let height = width / ratio;
      if (height > rect.height) {
        height = rect.height;
        width = height * ratio;
      }
      setCanvasSize({ width, height });
    });

    if (canvasRef.current?.parentElement) {
      observer.observe(canvasRef.current.parentElement);
    }

    return () => observer.disconnect();
  }, [screenSize]);

  const saveLayout = async (label: string) => {
    const serialized = query.serialize();
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
    setTimeout(() => setStatus(null), 2000);
  };

  const exportLayout = () => {
    const serialized = query.serialize();
    const blob = new Blob([serialized], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "streamcraft-layout.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const openPreview = () => {
    const serialized = query.serialize();
    setPreviewSerialized(serialized);
    setPreviewOpen(true);
  };

  const closePreview = () => {
    setPreviewOpen(false);
  };

  const selectedSource = useMemo(() => {
    if (selectedProps?.sourceId) {
      return sources.find((source) => source.id === selectedProps.sourceId);
    }
    return findPreferredSource(sources);
  }, [selectedProps?.sourceId, sources]);

  const selectedEndpoints = selectedSource?.endpoints ?? [];
  const selectedEndpoint = useMemo(() => {
    if (!selectedEndpoints.length) return undefined;
    if (selectedProps?.endpointPath) {
      return findEndpoint(selectedEndpoints, selectedProps.endpointPath) ?? selectedEndpoints[0];
    }
    return selectedEndpoints[0];
  }, [selectedEndpoints, selectedProps?.endpointPath]);

  const selectedEndpointKey = selectedEndpoint ? makeEndpointKey(selectedEndpoint) : "";
  const selectedFields = selectedEndpoint?.response?.fields ?? [];
  const selectedTestKey =
    selectedSource && selectedEndpointKey ? makeTestKey(selectedSource.id, selectedEndpointKey) : null;
  const selectedTest = selectedTestKey ? testResponses.get(selectedTestKey) : null;
  const selectedPreview = selectedSource ? previews.get(selectedSource.id) : null;
  const selectedPayload = unwrapResponse(selectedTest) ?? unwrapResponse(selectedPreview);

  return (
    <div className="designer-app">
      <header className="app-header">
        <div className="header-copy">
          <p className="eyebrow">StreamCraft Designer</p>
          <h1>Overlay Composer</h1>
          <span className="subtitle">Drag widgets, bind API fields, and preview a live overlay instantly.</span>
        </div>
        <div className="header-actions">
          <button className="btn ghost" onClick={exportLayout}>
            Export JSON
          </button>
          <button className="btn ghost" onClick={() => actions.clearEvents()}>
            Clear Selection
          </button>
          <button className="btn primary" onClick={openPreview}>
            Preview Live
          </button>
          <button className="btn accent" onClick={() => saveLayout("Saved layout")}>
            Save
          </button>
          <button className="btn warning" onClick={() => saveLayout("Published layout")}>
            Publish
          </button>
        </div>
      </header>

      <section className="tools-row">
        <div className="tools-header">
          <div>
            <p className="eyebrow">Tools | Widgets</p>
            <h2>Palette</h2>
          </div>
          <div className="tools-controls">
            <label className="toggle">
              <input type="checkbox" checked={gridEnabled} onChange={(event) => setGridEnabled(event.target.checked)} />
              <span>Show grid</span>
            </label>
            <label className="toggle">
              <input type="checkbox" checked={snapEnabled} onChange={(event) => setSnapEnabled(event.target.checked)} />
              <span>Align to grid</span>
            </label>
            <label className="toggle">
              <input type="checkbox" checked={safeZoneEnabled} onChange={(event) => setSafeZoneEnabled(event.target.checked)} />
              <span>Safe zone</span>
            </label>
            <span className="chip">
              {Math.round(screenSize.width)}x{Math.round(screenSize.height)}
            </span>
          </div>
        </div>
        <Palette widgets={widgetDefs} />
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
            <span className={`chip ${enabled ? "" : "chip-muted"}`}>{enabled ? "Edit" : "Locked"}</span>
          </div>
        </div>
        <div
          className={`canvas-stage ${gridEnabled ? "grid-on" : ""}`}
          style={{ width: canvasSize.width, height: canvasSize.height }}
          ref={canvasRef}
        >
          {safeZoneEnabled && <div className="safe-zone" />}
          <Frame>
            <Element is={CanvasRoot} canvas>
              <LabelWidget widgetKind="label" title="Label" x={60} y={60} width={220} height={90} />
            </Element>
          </Frame>
          <MoveableLayer canvasRef={canvasRef} snapEnabled={snapEnabled} />
        </div>
      </section>

      <footer className="footer-row">
        <div className="footer-header">
          <div>
            <p className="eyebrow">Response Metadata</p>
            <h2>Field Explorer</h2>
          </div>
          <div className="footer-actions">
            <span className="chip">Widget: {selectedId ? selectedProps?.title ?? "Selected" : "None"}</span>
            <span className="chip">Source: {selectedSource?.name ?? "-"}</span>
            <span className="chip">Endpoint: {selectedEndpoint?.name ?? selectedEndpoint?.path ?? "-"}</span>
            <button
              className="btn micro"
              onClick={() => selectedSource && selectedEndpointKey && runTest(selectedSource.id, selectedEndpointKey)}
              disabled={!selectedSource || !selectedEndpointKey}
            >
              Test Request
            </button>
            {status && <span className="status-pill">{status}</span>}
          </div>
        </div>
        <div className="footer-grid">
          <section className="metadata-panel">
            <div className="panel-header">
              <h3>Available fields</h3>
              <span>{selectedFields.length} fields</span>
            </div>
            <div className="metadata-list">
              {selectedFields.length === 0 ? (
                <p className="muted">Select a widget and endpoint to see field metadata.</p>
              ) : (
                selectedFields.map((field) => (
                  <div className="metadata-row" key={field.path}>
                    <span className="field-path">{field.path}</span>
                    <span className={`field-type ${field.isContainer ? "is-container" : ""}`}>{field.type}</span>
                    <span className="field-example">{field.example ?? "-"}</span>
                  </div>
                ))
              )}
            </div>
          </section>
          <section className="response-panel">
            <div className="panel-header">
              <h3>Live response</h3>
              <span>{selectedTest?.statusCode ?? ""}</span>
            </div>
            <div className="response-body">
              <pre>{JSON.stringify(selectedTest ?? selectedPayload ?? {}, null, 2)}</pre>
            </div>
          </section>
        </div>
      </footer>

      <PreviewModal open={previewOpen} onClose={closePreview} serialized={previewSerialized} />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <DesignerDataProvider>
      <Editor
        resolver={{ CanvasRoot, LabelWidget, ImageWidget, ValueCardWidget, ListWidget, ProgressWidget, AutoDetectWidget }}
      >
        <DesignerShell />
      </Editor>
    </DesignerDataProvider>
  );
};

export default App;
