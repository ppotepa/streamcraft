"use strict";

const widgetPalette = document.getElementById("widget-palette");
const canvas = document.getElementById("designer-canvas");
const preview = document.getElementById("preview-json");
const widgetCategory = document.getElementById("widget-category");
const widgetSearch = document.getElementById("widget-search");
const selectedWidgetLabel = document.getElementById("selected-widget");
const selectedBindingLabel = document.getElementById("selected-binding");
const canvasSizeChip = document.getElementById("canvas-size-chip");
const gridChip = document.getElementById("grid-chip");
const snapChip = document.getElementById("snap-chip");
const gridToggle = document.getElementById("grid-toggle");
const snapToggle = document.getElementById("snap-toggle");
const previewButton = document.getElementById("preview-live");
const previewModal = document.getElementById("preview-modal");
const previewBackdrop = document.getElementById("preview-backdrop");
const previewWindow = document.getElementById("preview-window");
const previewOverlay = document.getElementById("preview-overlay");
const previewClose = document.getElementById("preview-close");

const GRID_SIZE = 20;

const state = {
    widgets: [],
    widgetDefs: [],
    sources: [],
    previewCache: new Map(),
    selectedWidgetId: null,
    gridEnabled: true,
    snapEnabled: false,
    canvasRatio: 16 / 9
};

const loadWidgets = async () => {
    try {
        const res = await fetch("/designer/widgets", { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        state.widgetDefs = await res.json();
        renderWidgetFilters();
        renderPalette();
    } catch (err) {
        console.warn("Failed to load widgets", err);
        if (widgetPalette) widgetPalette.innerHTML = "<div class=\"widget-card\">No widgets loaded.</div>";
    }
};

const loadSources = async () => {
    try {
        const res = await fetch("/designer/sources", { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        state.sources = await res.json();
        refreshAllWidgetBindings();
        updateFooterPreview();
    } catch (err) {
        console.warn("Failed to load sources", err);
    }
};

const resizeCanvas = () => {
    if (!canvas) return;
    const row = canvas.parentElement;
    if (!row) return;
    const header = row.querySelector(".canvas-header");
    const rowRect = row.getBoundingClientRect();
    const headerHeight = header instanceof HTMLElement ? header.offsetHeight : 0;
    const availableHeight = rowRect.height - headerHeight - 24;
    const availableWidth = rowRect.width - 4;

    const ratio = window.innerWidth / Math.max(1, window.innerHeight);
    state.canvasRatio = ratio;
    let targetWidth = availableWidth;
    let targetHeight = targetWidth / ratio;

    if (targetHeight > availableHeight) {
        targetHeight = availableHeight;
        targetWidth = targetHeight * ratio;
    }

    canvas.style.width = `${Math.max(0, Math.floor(targetWidth))}px`;
    canvas.style.height = `${Math.max(0, Math.floor(targetHeight))}px`;
    canvas.style.margin = "0 auto";
    canvas.style.setProperty("--grid-size", `${GRID_SIZE}px`);

    if (canvasSizeChip) {
        const widthLabel = Math.max(1, Math.round(window.innerWidth));
        const heightLabel = Math.max(1, Math.round(window.innerHeight));
        canvasSizeChip.textContent = `${widthLabel}×${heightLabel}`;
    }
};

const updateGridUI = () => {
    if (!canvas) return;
    canvas.classList.toggle("grid-on", state.gridEnabled);
    if (gridChip) gridChip.textContent = `Grid: ${state.gridEnabled ? "On" : "Off"}`;
    if (gridToggle) gridToggle.checked = state.gridEnabled;
};

const updateSnapUI = () => {
    if (snapChip) snapChip.textContent = `Snap: ${state.snapEnabled ? "On" : "Off"}`;
    if (snapToggle) snapToggle.checked = state.snapEnabled;
};

const snapValue = (value) => {
    if (!state.snapEnabled) return value;
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
};

const renderWidgetFilters = () => {
    if (!widgetCategory) return;
    const categories = Array.from(new Set(state.widgetDefs.map((w) => w.category || "Other"))).sort();
    widgetCategory.innerHTML = "";
    const all = document.createElement("option");
    all.value = "all";
    all.textContent = "All";
    widgetCategory.appendChild(all);
    categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        widgetCategory.appendChild(option);
    });
};

const getFilteredWidgets = () => {
    const category = widgetCategory?.value ?? "all";
    const query = (widgetSearch?.value || "").toLowerCase().trim();
    return state.widgetDefs.filter((widget) => {
        if (category !== "all" && widget.category !== category) return false;
        if (!query) return true;
        return (
            widget.name?.toLowerCase().includes(query) ||
            widget.description?.toLowerCase().includes(query) ||
            widget.id?.toLowerCase().includes(query)
        );
    });
};

const renderPalette = () => {
    if (!widgetPalette) return;
    widgetPalette.innerHTML = "";
    const widgets = getFilteredWidgets();
    widgets.forEach((widget) => {
        const card = document.createElement("button");
        card.className = "widget-card";
        card.type = "button";
        card.draggable = true;
        card.innerHTML = `
            <div class="widget-card-title">${widget.name}</div>
            <div class="widget-card-desc">${widget.description}</div>
            <div class="widget-card-tag">${widget.category}</div>
        `;
        card.addEventListener("dragstart", (event) => {
            event.dataTransfer?.setData("text/plain", widget.id);
        });
        card.addEventListener("click", () => addWidget(widget.id, 40, 40));
        widgetPalette.appendChild(card);
    });
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
        width: 240,
        height: 120,
        sourceId: "",
        endpointPath: "",
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
    header.appendChild(buildInfographic());
    element.appendChild(header);

    const body = document.createElement("div");
    body.className = "widget-body";
    body.textContent = "Bind a field to preview.";
    element.appendChild(body);

    const binding = document.createElement("div");
    binding.className = "widget-binding";

    const sourceSelect = document.createElement("select");
    sourceSelect.className = "widget-source";
    const endpointSelect = document.createElement("select");
    endpointSelect.className = "widget-endpoint";
    const fieldSelect = document.createElement("select");
    fieldSelect.className = "widget-field";

    binding.appendChild(sourceSelect);
    binding.appendChild(endpointSelect);
    binding.appendChild(fieldSelect);
    element.appendChild(binding);

    element.addEventListener("mousedown", () => selectWidget(widget.id));
    header.addEventListener("mousedown", (event) => startDrag(event, widget.id));

    sourceSelect.addEventListener("change", () => {
        widget.sourceId = sourceSelect.value;
        widget.endpointPath = "";
        widget.fieldPath = "";
        refreshWidgetBinding(widget, element);
        ensurePreview(widget.sourceId);
        updateWidgetPreview(widget);
        updateFooterPreview();
    });

    endpointSelect.addEventListener("change", () => {
        widget.endpointPath = endpointSelect.value;
        widget.fieldPath = "";
        refreshWidgetBinding(widget, element);
        updateWidgetPreview(widget);
        updateFooterPreview();
    });

    fieldSelect.addEventListener("change", () => {
        widget.fieldPath = fieldSelect.value;
        updateWidgetPreview(widget);
        updateFooterPreview();
    });

    canvas.appendChild(element);
    refreshWidgetBinding(widget, element);
    updateWidgetPreview(widget);
};

const refreshAllWidgetBindings = () => {
    state.widgets.forEach((widget) => {
        const element = canvas?.querySelector(`[data-widget-id="${widget.id}"]`);
        if (element) {
            refreshWidgetBinding(widget, element);
        }
    });
};

const refreshWidgetBinding = (widget, element) => {
    const sourceSelect = element.querySelector(".widget-source");
    const endpointSelect = element.querySelector(".widget-endpoint");
    const fieldSelect = element.querySelector(".widget-field");

    if (!sourceSelect || !endpointSelect || !fieldSelect) return;

    sourceSelect.innerHTML = "";
    const sources = state.sources;
    if (sources.length === 0) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "No sources";
        sourceSelect.appendChild(option);
        sourceSelect.disabled = true;
        endpointSelect.disabled = true;
        fieldSelect.disabled = true;
        return;
    }

    sourceSelect.disabled = false;
    sources.forEach((source) => {
        const option = document.createElement("option");
        option.value = source.id ?? "";
        option.textContent = source.name ?? source.id ?? "source";
        sourceSelect.appendChild(option);
    });

    if (!widget.sourceId || !getSourceById(widget.sourceId)) {
        widget.sourceId = sources[0].id;
    }
    sourceSelect.value = widget.sourceId;
    ensurePreview(widget.sourceId);

    const source = getSourceById(widget.sourceId);
    const endpoints = getEndpointsForSource(source);

    endpointSelect.innerHTML = "";
    if (endpoints.length === 0) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "No endpoints";
        endpointSelect.appendChild(option);
        endpointSelect.disabled = true;
    } else {
        endpointSelect.disabled = false;
        endpoints.forEach((endpoint) => {
            const option = document.createElement("option");
            const pathValue = endpoint.path || endpoint.name || "";
            const method = endpoint.method ? endpoint.method.toUpperCase() : "";
            option.value = pathValue;
            option.textContent = method ? `${endpoint.name || endpoint.path} (${method})` : (endpoint.name || endpoint.path || "Endpoint");
            endpointSelect.appendChild(option);
        });

        if (!widget.endpointPath || !endpointExists(endpoints, widget.endpointPath)) {
            widget.endpointPath = getDefaultEndpointPath(source);
        }
        endpointSelect.value = widget.endpointPath;
    }

    const endpoint = getEndpointByPath(source, widget.endpointPath);
    const fields = endpoint?.response?.fields || [];
    fieldSelect.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = fields.length > 0 ? "Pick a field" : "No fields";
    fieldSelect.appendChild(placeholder);

    fields.forEach((field) => {
        if (!field.path) return;
        const option = document.createElement("option");
        const displayPath = toDisplayFieldPath(source, field.path);
        const suffix = field.type ? ` (${field.type})` : "";
        option.value = displayPath;
        option.textContent = `${displayPath}${suffix}`;
        fieldSelect.appendChild(option);
    });

    fieldSelect.disabled = fields.length === 0;

    const normalized = normalizeFieldPath(widget.fieldPath || "");
    if (normalized && fields.some((field) => field.path === normalized)) {
        widget.fieldPath = toDisplayFieldPath(source, normalized);
    } else {
        widget.fieldPath = "";
    }

    if (widget.widgetId === "autodetect" && !widget.fieldPath) {
        const autoPath = autoPickField(source, endpoint, fields);
        if (autoPath) {
            widget.fieldPath = autoPath;
        }
    }

    if (widget.fieldPath) {
        fieldSelect.value = widget.fieldPath;
    }
};

const endpointExists = (endpoints, endpointPath) =>
    endpoints.some((endpoint) => endpoint.path === endpointPath || endpoint.name === endpointPath);

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

    if (!widget.sourceId || !widget.fieldPath) {
        body.textContent = "Bind a field to preview.";
        return;
    }

    const previewDataRaw = state.previewCache.get(widget.sourceId);
    const previewData = isPreviewPlaceholder(previewDataRaw) ? null : previewDataRaw;
    const normalizedPath = normalizeFieldPath(widget.fieldPath);
    const value = previewData ? getByPath(previewData, normalizedPath) : undefined;
    const metadata = getFieldMetadata(widget);
    const exampleValue = metadata?.example;

    if (value === undefined && exampleValue === undefined) {
        if (metadata?.type === "object") {
            body.textContent = "Example: { ... }";
            return;
        }
        if (metadata?.type === "array") {
            body.textContent = "Example: [ ... ]";
            return;
        }
        body.textContent = previewData ? "Not found" : "No preview";
        return;
    }

    const displayValue = value !== undefined ? value : exampleValue;
    const isExample = value === undefined;

    if (widget.widgetId === "image" && typeof displayValue === "string" && displayValue.startsWith("http")) {
        body.innerHTML = `<img src="${displayValue}" alt="image" style="max-width:100%; max-height:100%; border-radius:10px;" />`;
        return;
    }

    const formatted = formatValue(displayValue, widget.format);
    body.textContent = isExample ? `Example: ${formatted}` : formatted;
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
    const widget = getSelectedWidget();
    if (widget?.sourceId) {
        ensurePreview(widget.sourceId);
    }
    updateFooterPreview();
};

const updateFooterPreview = () => {
    const widget = getSelectedWidget();
    if (!widget) {
        if (selectedWidgetLabel) selectedWidgetLabel.textContent = "No widget selected";
        if (selectedBindingLabel) selectedBindingLabel.textContent = "—";
        if (preview) preview.textContent = "Select a widget to preview its data source.";
        return;
    }

    if (selectedWidgetLabel) selectedWidgetLabel.textContent = widget.name;
    if (selectedBindingLabel) {
        selectedBindingLabel.textContent = widget.fieldPath
            ? `${widget.sourceId || "source"} → ${widget.fieldPath}`
            : "Field not bound";
    }

    const previewDataRaw = widget.sourceId ? state.previewCache.get(widget.sourceId) : null;
    const previewData = isPreviewPlaceholder(previewDataRaw) ? null : previewDataRaw;
    if (previewData) {
        if (preview) preview.textContent = JSON.stringify(previewData, null, 2);
        return;
    }

    const source = getSourceById(widget.sourceId);
    const endpoint = getEndpointByPath(source, widget.endpointPath);
    if (endpoint?.response) {
        if (preview) preview.textContent = JSON.stringify(endpoint.response, null, 2);
        return;
    }

    if (preview) preview.textContent = "Loading preview...";
};

const ensurePreview = async (sourceId) => {
    if (!sourceId || state.previewCache.has(sourceId)) return;
    await loadPreview(sourceId);
};

const loadPreview = async (sourceId) => {
    if (!sourceId) return;
    try {
        const res = await fetch(`/designer/preview?sourceId=${encodeURIComponent(sourceId)}`, { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        state.previewCache.set(sourceId, data);
        updateAllWidgetPreviews();
        updateFooterPreview();
    } catch (err) {
        console.warn("Failed to load preview", err);
        if (preview) {
            preview.textContent = JSON.stringify({ error: "Preview unavailable." }, null, 2);
        }
    }
};

const buildInfographic = () => {
    const container = document.createElement("div");
    container.className = "widget-infographic";
    for (let i = 0; i < 10; i += 1) {
        const bar = document.createElement("span");
        bar.style.height = `${6 + Math.floor(Math.random() * 12)}px`;
        container.appendChild(bar);
    }
    return container;
};

const startDrag = (event, widgetId) => {
    event.preventDefault();
    const widget = state.widgets.find((w) => w.id === widgetId);
    if (!widget || !canvas) return;
    const canvasRect = canvas.getBoundingClientRect();
    const offsetX = event.clientX - canvasRect.left - widget.x;
    const offsetY = event.clientY - canvasRect.top - widget.y;

    const onMove = (moveEvent) => {
        const rawX = Math.max(0, moveEvent.clientX - canvasRect.left - offsetX);
        const rawY = Math.max(0, moveEvent.clientY - canvasRect.top - offsetY);
        widget.x = snapValue(rawX);
        widget.y = snapValue(rawY);
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

const getSourceById = (sourceId) => {
    if (!sourceId) return null;
    return state.sources.find((source) => source.id === sourceId) ?? null;
};

const getEndpointsForSource = (source) => {
    if (!source || !Array.isArray(source.endpoints)) return [];
    return source.endpoints;
};

const getDefaultEndpointPath = (source) => {
    const endpoints = getEndpointsForSource(source);
    const first = endpoints[0];
    if (!first) return "";
    return first.path || first.name || "";
};

const getEndpointByPath = (source, endpointPath) => {
    if (!source) return null;
    const endpoints = getEndpointsForSource(source);
    if (endpoints.length === 0) return null;
    if (!endpointPath) return endpoints[0];
    return endpoints.find((endpoint) => endpoint.path === endpointPath || endpoint.name === endpointPath) ?? endpoints[0];
};

const isApiSource = (source) => Array.isArray(source?.endpoints);

const normalizeFieldPath = (path) => {
    if (!path) return "";
    if (path.startsWith("response.")) return path.slice("response.".length);
    if (path.startsWith("response[")) return path.slice("response".length);
    return path;
};

const toDisplayFieldPath = (source, path) => {
    if (!path) return path;
    if (!isApiSource(source)) return path;
    return path.startsWith("[") ? `response${path}` : `response.${path}`;
};

const getFieldMetadata = (widget) => {
    const source = getSourceById(widget?.sourceId);
    const endpoint = getEndpointByPath(source, widget?.endpointPath);
    const fields = endpoint?.response?.fields || [];
    const normalized = normalizeFieldPath(widget?.fieldPath || "");
    return fields.find((field) => field.path === normalized) ?? null;
};

const isPreviewPlaceholder = (data) => {
    if (!data || typeof data !== "object") return false;
    const message = data.message || data.Message;
    const source = data.source || data.Source;
    return Boolean(message && source);
};

const autoPickField = (source, endpoint, fields) => {
    if (!fields || fields.length === 0) return "";
    const priority = ["title", "name", "label", "description", "summary", "value", "count", "status", "url", "image", "img", "icon", "avatar", "photo", "thumbnail"];
    const rankedFields = fields.filter((field) => field.path && (!field.isContainer || field.example));
    const candidate = (rankedFields.length > 0 ? rankedFields : fields).find((field) => {
        if (!field.path) return false;
        const last = field.path.split(".").pop()?.toLowerCase() || "";
        return priority.includes(last);
    });
    const fallback = candidate ?? (rankedFields.length > 0 ? rankedFields[0] : fields.find((field) => field.path));
    if (!fallback?.path) return "";
    return toDisplayFieldPath(source, fallback.path);
};

const openPreviewModal = () => {
    if (!previewModal || !previewOverlay || !previewWindow || !canvas) return;
    previewModal.classList.remove("hidden");

    const ratio = state.canvasRatio || 16 / 9;
    let width = Math.min(window.innerWidth * 0.9, 1200);
    let height = width / ratio;
    const maxHeight = window.innerHeight * 0.8;
    if (height > maxHeight) {
        height = maxHeight;
        width = height * ratio;
    }

    previewWindow.style.width = `${Math.floor(width)}px`;
    previewWindow.style.height = `${Math.floor(height)}px`;

    previewOverlay.innerHTML = "";
    const clone = canvas.cloneNode(true);
    clone.id = "preview-canvas";
    clone.classList.remove("grid-on");
    clone.classList.add("preview-canvas");
    clone.querySelectorAll?.(".widget-binding")?.forEach((node) => node.remove());
    previewOverlay.appendChild(clone);
};

const closePreviewModal = () => {
    if (!previewModal) return;
    previewModal.classList.add("hidden");
};

if (canvas) {
    canvas.addEventListener("dragover", (event) => event.preventDefault());
    canvas.addEventListener("drop", (event) => {
        event.preventDefault();
        const widgetId = event.dataTransfer?.getData("text/plain");
        if (!widgetId) return;
        const rect = canvas.getBoundingClientRect();
        const x = Math.max(0, event.clientX - rect.left - 120);
        const y = Math.max(0, event.clientY - rect.top - 60);
        addWidget(widgetId, snapValue(x), snapValue(y));
    });
}

if (widgetCategory) {
    widgetCategory.addEventListener("change", () => renderPalette());
}

if (widgetSearch) {
    widgetSearch.addEventListener("input", () => renderPalette());
}

const getSelectedWidget = () => state.widgets.find((w) => w.id === state.selectedWidgetId) ?? null;

if (gridToggle) {
    gridToggle.addEventListener("change", () => {
        state.gridEnabled = gridToggle.checked;
        updateGridUI();
    });
}

if (snapToggle) {
    snapToggle.addEventListener("change", () => {
        state.snapEnabled = snapToggle.checked;
        updateSnapUI();
    });
}

if (previewButton) {
    previewButton.addEventListener("click", () => {
        openPreviewModal();
    });
}

if (previewBackdrop) {
    previewBackdrop.addEventListener("click", () => {
        closePreviewModal();
    });
}

if (previewClose) {
    previewClose.addEventListener("click", () => {
        closePreviewModal();
    });
}

window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closePreviewModal();
    }
});

window.addEventListener("resize", () => {
    resizeCanvas();
});

updateGridUI();
updateSnapUI();
resizeCanvas();

loadWidgets();
loadSources();
