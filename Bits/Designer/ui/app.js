"use strict";

const list = document.getElementById("api-sources");
const preview = document.getElementById("preview-json");
const widgetPalette = document.getElementById("widget-palette");
const widgetCanvas = document.getElementById("widget-canvas");
const categorySelect = document.getElementById("source-category");
const sourceSelect = document.getElementById("source-select");

const state = {
    sources: [],
    widgets: [],
    previewCache: new Map(),
    activeSourceId: null
};

const renderSources = (sources) => {
    if (!list) return;
    list.innerHTML = "";
    if (!sources || sources.length === 0) {
        const item = document.createElement("li");
        item.textContent = "No sources loaded.";
        list.appendChild(item);
        return;
    }

    sources.slice(0, 24).forEach((source) => {
        const item = document.createElement("li");
        const kind = source.kind ? `[${source.kind}]` : "[source]";
        item.textContent = `${kind} ${source.name ?? "Unknown"} — ${source.description ?? "No description"}`;
        item.setAttribute("data-source-id", source.id ?? "");
        item.addEventListener("click", () => {
            if (sourceSelect) {
                sourceSelect.value = source.id ?? "";
            }
            loadPreview(source.id);
        });
        list.appendChild(item);
    });
};

const renderCategorySelect = (sources) => {
    if (!categorySelect) return;
    const categories = Array.from(new Set(sources.map((s) => s.kind || "source"))).sort();
    categorySelect.innerHTML = "";
    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All";
    categorySelect.appendChild(allOption);
    categories.forEach((cat) => {
        const option = document.createElement("option");
        option.value = cat;
        option.textContent = cat;
        categorySelect.appendChild(option);
    });
};

const renderSourceSelect = (sources) => {
    if (!sourceSelect) return;
    sourceSelect.innerHTML = "";
    sources.forEach((source) => {
        const option = document.createElement("option");
        option.value = source.id ?? "";
        option.textContent = source.name ?? source.id ?? "source";
        sourceSelect.appendChild(option);
    });
    if (sources.length > 0) {
        sourceSelect.value = sources[0].id ?? "";
    }
};

const getFilteredSources = () => {
    const category = categorySelect?.value ?? "all";
    if (category === "all") return state.sources;
    return state.sources.filter((source) => (source.kind || "source") === category);
};

const renderWidgets = (widgets) => {
    if (!widgetCanvas) return;
    widgetCanvas.innerHTML = "";
    if (!widgets.length) {
        const empty = document.createElement("p");
        empty.className = "empty";
        empty.textContent = "Add a control to start binding data.";
        widgetCanvas.appendChild(empty);
        return;
    }

    widgets.forEach((widget, index) => {
        const card = document.createElement("div");
        card.className = "widget-card";

        const header = document.createElement("div");
        header.className = "widget-header";
        const name = document.createElement("div");
        name.className = "widget-name";
        name.textContent = widget.name;
        const remove = document.createElement("button");
        remove.className = "nes-btn remove";
        remove.textContent = "Remove";
        remove.addEventListener("click", () => {
            state.widgets.splice(index, 1);
            renderWidgets(state.widgets);
        });
        header.appendChild(name);
        header.appendChild(remove);
        card.appendChild(header);

        const sourceLabel = document.createElement("label");
        sourceLabel.textContent = "Data source";
        card.appendChild(sourceLabel);

        const sourceSelect = document.createElement("select");
        sourceSelect.className = "nes-select";
        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "Select source";
        sourceSelect.appendChild(defaultOption);
        state.sources.forEach((source) => {
            const option = document.createElement("option");
            option.value = source.id;
            option.textContent = source.name ?? source.id;
            if (source.id === widget.sourceId) {
                option.selected = true;
            }
            sourceSelect.appendChild(option);
        });
        sourceSelect.addEventListener("change", (ev) => {
            widget.sourceId = ev.target.value;
            if (widget.sourceId) {
                loadPreview(widget.sourceId);
            }
        });
        card.appendChild(sourceSelect);

        const pathLabel = document.createElement("label");
        pathLabel.textContent = "Field path (dot/bracket)";
        card.appendChild(pathLabel);

        const pathInput = document.createElement("input");
        pathInput.className = "nes-input";
        pathInput.value = widget.fieldPath ?? "";
        pathInput.placeholder = "e.g. topProcesses[0].memoryMb";
        pathInput.addEventListener("input", (ev) => {
            widget.fieldPath = ev.target.value;
            renderWidgetPreview(card, widget);
        });
        card.appendChild(pathInput);

        const valueLabel = document.createElement("label");
        valueLabel.textContent = "Preview value";
        card.appendChild(valueLabel);

        const valueBox = document.createElement("div");
        valueBox.className = "nes-container is-dark";
        valueBox.textContent = "—";
        valueBox.dataset.previewValue = "1";
        card.appendChild(valueBox);

        widgetCanvas.appendChild(card);
        renderWidgetPreview(card, widget);
    });
};

const renderWidgetPreview = (card, widget) => {
    const valueBox = card.querySelector("[data-preview-value]");
    if (!valueBox) return;
    if (!widget.sourceId || !widget.fieldPath) {
        valueBox.textContent = "—";
        return;
    }

    const preview = state.previewCache.get(widget.sourceId);
    if (!preview) {
        valueBox.textContent = "No preview";
        return;
    }

    const value = getByPath(preview, widget.fieldPath);
    valueBox.textContent = value === undefined ? "Not found" : JSON.stringify(value);
};

const renderPalette = (widgets) => {
    if (!widgetPalette) return;
    widgetPalette.innerHTML = "";
    widgets.forEach((widget) => {
        const item = document.createElement("li");
        item.textContent = `${widget.name} — ${widget.description}`;
        item.addEventListener("click", () => addWidget(widget));
        widgetPalette.appendChild(item);
    });
};

const addWidget = (widgetDef) => {
    state.widgets.push({
        id: `${widgetDef.id}-${Date.now()}`,
        widgetId: widgetDef.id,
        name: widgetDef.name,
        sourceId: state.activeSourceId ?? "",
        fieldPath: ""
    });
    renderWidgets(state.widgets);
};

const renderPreview = (data, title) => {
    if (!preview) return;
    const header = title ? `${title}\n\n` : "";
    preview.textContent = header + JSON.stringify(data, null, 2);
};

const loadPreview = async (sourceId) => {
    if (!sourceId) return;
    try {
        const res = await fetch(`/designer/preview?sourceId=${encodeURIComponent(sourceId)}`, { cache: "no-store" });
        if (!res.ok) {
            throw new Error(await res.text());
        }
        const data = await res.json();
        state.previewCache.set(sourceId, data);
        state.activeSourceId = sourceId;
        renderPreview(data, `Preview: ${sourceId}`);
        renderWidgets(state.widgets);
    } catch (err) {
        console.warn("Failed to load preview", err);
        renderPreview({ error: "Failed to load preview." }, `Preview: ${sourceId}`);
    }
};

const getByPath = (obj, path) => {
    if (!obj || !path) return undefined;
    const tokens = path
        .replace(/\[(\d+)\]/g, ".$1")
        .split(".")
        .filter(Boolean);

    let current = obj;
    for (const token of tokens) {
        if (current == null) return undefined;
        current = current[token];
    }
    return current;
};

const loadWidgets = async () => {
    try {
        const res = await fetch("/designer/widgets", { cache: "no-store" });
        if (!res.ok) {
            throw new Error(await res.text());
        }
        const widgets = await res.json();
        renderPalette(widgets);
    } catch (err) {
        console.warn("Failed to load widgets", err);
        renderPalette([]);
    }
};

const loadSources = async () => {
    try {
        const res = await fetch("/designer/sources", { cache: "no-store" });
        if (!res.ok) {
            throw new Error(await res.text());
        }
        const sources = await res.json();
        state.sources = sources;
        renderCategorySelect(sources);
        const filtered = getFilteredSources();
        renderSourceSelect(filtered);
        renderSources(filtered);
        if (filtered && filtered.length > 0) {
            loadPreview(filtered[0].id);
        }
    } catch (err) {
        console.warn("Failed to load API sources", err);
        renderSources([]);
    }
};

loadWidgets();
loadSources();

if (categorySelect) {
    categorySelect.addEventListener("change", () => {
        const filtered = getFilteredSources();
        renderSourceSelect(filtered);
        renderSources(filtered);
        if (filtered.length > 0) {
            loadPreview(filtered[0].id);
        }
    });
}

if (sourceSelect) {
    sourceSelect.addEventListener("change", () => {
        const selected = sourceSelect.value;
        if (selected) {
            loadPreview(selected);
        }
    });
}
