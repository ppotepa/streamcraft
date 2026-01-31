"use strict";

const widgetPalette = document.getElementById("widget-palette");
const canvas = document.getElementById("designer-canvas");
const preview = document.getElementById("preview-json");
const categorySelect = document.getElementById("source-category");
const sourceSelect = document.getElementById("source-select");
const inspector = {
    empty: document.getElementById("inspector-empty"),
    form: document.getElementById("inspector-form"),
    widgetName: document.getElementById("inspector-widget-name"),
    source: document.getElementById("inspector-source"),
    field: document.getElementById("inspector-field"),
    value: document.getElementById("inspector-value"),
    format: document.getElementById("inspector-format")
};

const state = {
    widgets: [],
    widgetDefs: [],
    sources: [],
    previewCache: new Map(),
    selectedWidgetId: null,
    activeSourceId: null
};

const loadWidgets = async () => {
    try {
        const res = await fetch("/designer/widgets", { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        state.widgetDefs = await res.json();
        renderPalette();
    } catch (err) {
        console.warn("Failed to load widgets", err);
        if (widgetPalette) widgetPalette.innerHTML = "<li>No widgets loaded.</li>";
    }
};

const loadSources = async () => {
    try {
        const res = await fetch("/designer/sources", { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        state.sources = await res.json();
        renderSourceFilters();
    } catch (err) {
        console.warn("Failed to load sources", err);
    }
};

const renderPalette = () => {
    if (!widgetPalette) return;
    widgetPalette.innerHTML = "";
    state.widgetDefs.forEach((widget) => {
        const item = document.createElement("li");
        item.className = "palette-item";
        item.textContent = `${widget.name} — ${widget.description}`;
        item.draggable = true;
        item.addEventListener("dragstart", (event) => {
            event.dataTransfer?.setData("text/plain", widget.id);
        });
        item.addEventListener("click", () => addWidget(widget.id, 40, 40));
        widgetPalette.appendChild(item);
    });
};

const renderSourceFilters = () => {
    if (!categorySelect || !sourceSelect) return;
    const categories = Array.from(new Set(state.sources.map((s) => s.kind || "source"))).sort();
    categorySelect.innerHTML = "";
    const all = document.createElement("option");
    all.value = "all";
    all.textContent = "All";
    categorySelect.appendChild(all);
    categories.forEach((cat) => {
        const option = document.createElement("option");
        option.value = cat;
        option.textContent = cat;
        categorySelect.appendChild(option);
    });

    updateSourceSelect();
};

const updateSourceSelect = () => {
    if (!sourceSelect) return;
    const sources = getFilteredSources();
    sourceSelect.innerHTML = "";
    sources.forEach((source) => {
        const option = document.createElement("option");
        option.value = source.id ?? "";
        option.textContent = source.name ?? source.id ?? "source";
        sourceSelect.appendChild(option);
    });
    if (sources.length > 0) {
        setActiveSource(sources[0].id);
    } else {
        setActiveSource(null);
    }
};

const getFilteredSources = () => {
    const category = categorySelect?.value ?? "all";
    if (category === "all") return state.sources;
    return state.sources.filter((source) => (source.kind || "source") === category);
};

const setActiveSource = (sourceId) => {
    state.activeSourceId = sourceId;
    if (sourceSelect && sourceId) {
        sourceSelect.value = sourceId;
    }
    if (sourceId) {
        loadPreview(sourceId);
    } else if (preview) {
        preview.textContent = "Select a data source to preview.";
    }
};

const loadPreview = async (sourceId) => {
    if (!sourceId) return;
    try {
        const res = await fetch(`/designer/preview?sourceId=${encodeURIComponent(sourceId)}`, { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        state.previewCache.set(sourceId, data);
        if (preview) {
            preview.textContent = JSON.stringify(data, null, 2);
        }
        updateAllWidgetPreviews();
        updateInspectorValue();
    } catch (err) {
        console.warn("Failed to load preview", err);
        if (preview) {
            preview.textContent = JSON.stringify({ error: "Preview unavailable." }, null, 2);
        }
    }
};

const addWidget = (widgetId, x, y) => {
    const def = state.widgetDefs.find((w) => w.id === widgetId);
    if (!def) return;
    const widget = {
        id: `${widgetId}-${Date.now()}`,
        widgetId: widgetId,
        name: def.name,
        x,
        y,
        width: 220,
        height: 80,
        sourceId: state.activeSourceId ?? "",
        fieldPath: "",
        format: "raw"
    };
    state.widgets.push(widget);
    renderWidget(widget);
    selectWidget(widget.id);
};

const renderWidget = (widget) => {
    if (!canvas) return;
    const element = document.createElement("div");
    element.className = "canvas-widget";
    element.dataset.widgetId = widget.id;
    element.style.left = `${widget.x}px`;
    element.style.top = `${widget.y}px`;
    element.style.width = `${widget.width}px`;
    element.style.height = `${widget.height}px`;

    const header = document.createElement("div");
    header.className = "widget-header";
    header.textContent = widget.name;
    element.appendChild(header);

    const body = document.createElement("div");
    body.className = "widget-body";
    body.textContent = "Bind a field…";
    element.appendChild(body);

    element.addEventListener("mousedown", () => selectWidget(widget.id));
    header.addEventListener("mousedown", (event) => startDrag(event, widget.id));

    canvas.appendChild(element);
    updateWidgetPreview(widget);
};

const updateWidgetElement = (widget) => {
    const element = canvas?.querySelector(`[data-widget-id="${widget.id}"]`);
    if (!element) return;
    element.style.left = `${widget.x}px`;
    element.style.top = `${widget.y}px`;
    element.style.width = `${widget.width}px`;
    element.style.height = `${widget.height}px`;
};

const updateWidgetPreview = (widget) => {
    const element = canvas?.querySelector(`[data-widget-id="${widget.id}"]`);
    if (!element) return;
    const body = element.querySelector(".widget-body");
    if (!body) return;
    const previewData = widget.sourceId ? state.previewCache.get(widget.sourceId) : null;
    if (!widget.sourceId || !widget.fieldPath) {
        body.textContent = "Bind a field…";
        return;
    }
    if (!previewData) {
        body.textContent = "No preview";
        return;
    }
    const value = getByPath(previewData, widget.fieldPath);
    body.textContent = value === undefined ? "Not found" : formatValue(value, widget.format);
};

const updateAllWidgetPreviews = () => {
    state.widgets.forEach(updateWidgetPreview);
};

const selectWidget = (widgetId) => {
    state.selectedWidgetId = widgetId;
    if (!canvas) return;
    canvas.querySelectorAll(".canvas-widget").forEach((el) => el.classList.remove("selected"));
    const element = canvas.querySelector(`[data-widget-id="${widgetId}"]`);
    element?.classList.add("selected");
    updateInspector();
};

const updateInspector = () => {
    const widget = state.widgets.find((w) => w.id === state.selectedWidgetId);
    if (!widget) {
        inspector.empty?.classList.remove("hidden");
        inspector.form?.classList.add("hidden");
        return;
    }
    inspector.empty?.classList.add("hidden");
    inspector.form?.classList.remove("hidden");
    if (inspector.widgetName) inspector.widgetName.textContent = widget.name;
    if (inspector.source) {
        inspector.source.innerHTML = "";
        const none = document.createElement("option");
        none.value = "";
        none.textContent = "None";
        inspector.source.appendChild(none);
        state.sources.forEach((source) => {
            const option = document.createElement("option");
            option.value = source.id ?? "";
            option.textContent = source.name ?? source.id ?? "source";
            inspector.source.appendChild(option);
        });
        inspector.source.value = widget.sourceId ?? "";
    }
    if (inspector.field) inspector.field.value = widget.fieldPath ?? "";
    if (inspector.format) inspector.format.value = widget.format ?? "raw";
    updateInspectorValue();
};

const updateInspectorValue = () => {
    const widget = state.widgets.find((w) => w.id === state.selectedWidgetId);
    if (!widget || !inspector.value) return;
    const previewData = widget.sourceId ? state.previewCache.get(widget.sourceId) : null;
    if (!widget.sourceId || !widget.fieldPath) {
        inspector.value.textContent = "—";
        return;
    }
    if (!previewData) {
        inspector.value.textContent = "No preview";
        return;
    }
    const value = getByPath(previewData, widget.fieldPath);
    inspector.value.textContent = value === undefined ? "Not found" : formatValue(value, widget.format);
};

const startDrag = (event, widgetId) => {
    event.preventDefault();
    const widget = state.widgets.find((w) => w.id === widgetId);
    if (!widget || !canvas) return;
    const canvasRect = canvas.getBoundingClientRect();
    const offsetX = event.clientX - canvasRect.left - widget.x;
    const offsetY = event.clientY - canvasRect.top - widget.y;

    const onMove = (moveEvent) => {
        widget.x = Math.max(0, moveEvent.clientX - canvasRect.left - offsetX);
        widget.y = Math.max(0, moveEvent.clientY - canvasRect.top - offsetY);
        updateWidgetElement(widget);
    };

    const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
};

const getByPath = (obj, path) => {
    if (!obj || !path) return undefined;
    const tokens = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
    let current = obj;
    for (const token of tokens) {
        if (current == null) return undefined;
        current = current[token];
    }
    return current;
};

const formatValue = (value, format) => {
    if (format === "json") return JSON.stringify(value);
    if (format === "number" && typeof value === "number") return value.toFixed(2);
    if (format === "uppercase" && typeof value === "string") return value.toUpperCase();
    return typeof value === "string" ? value : JSON.stringify(value);
};

if (canvas) {
    canvas.addEventListener("dragover", (event) => event.preventDefault());
    canvas.addEventListener("drop", (event) => {
        event.preventDefault();
        const widgetId = event.dataTransfer?.getData("text/plain");
        if (!widgetId) return;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left - 110;
        const y = event.clientY - rect.top - 40;
        addWidget(widgetId, Math.max(0, x), Math.max(0, y));
    });
}

if (categorySelect) {
    categorySelect.addEventListener("change", () => {
        updateSourceSelect();
    });
}

if (sourceSelect) {
    sourceSelect.addEventListener("change", () => {
        const selected = sourceSelect.value;
        setActiveSource(selected);
    });
}

if (inspector.source) {
    inspector.source.addEventListener("change", (event) => {
        const widget = state.widgets.find((w) => w.id === state.selectedWidgetId);
        if (!widget) return;
        widget.sourceId = event.target.value;
        if (widget.sourceId) {
            setActiveSource(widget.sourceId);
        }
        updateWidgetPreview(widget);
        updateInspectorValue();
    });
}

if (inspector.field) {
    inspector.field.addEventListener("input", (event) => {
        const widget = state.widgets.find((w) => w.id === state.selectedWidgetId);
        if (!widget) return;
        widget.fieldPath = event.target.value;
        updateWidgetPreview(widget);
        updateInspectorValue();
    });
}

if (inspector.format) {
    inspector.format.addEventListener("change", (event) => {
        const widget = state.widgets.find((w) => w.id === state.selectedWidgetId);
        if (!widget) return;
        widget.format = event.target.value;
        updateWidgetPreview(widget);
        updateInspectorValue();
    });
}

loadWidgets();
loadSources();
