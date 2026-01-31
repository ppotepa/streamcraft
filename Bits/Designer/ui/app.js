"use strict";

const list = document.getElementById("api-sources");
const preview = document.getElementById("preview-json");

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
        item.addEventListener("click", () => loadPreview(source.id));
        list.appendChild(item);
    });
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
        renderPreview(data, `Preview: ${sourceId}`);
    } catch (err) {
        console.warn("Failed to load preview", err);
        renderPreview({ error: "Failed to load preview." }, `Preview: ${sourceId}`);
    }
};

const loadSources = async () => {
    try {
        const res = await fetch("/designer/sources", { cache: "no-store" });
        if (!res.ok) {
            throw new Error(await res.text());
        }
        const sources = await res.json();
        renderSources(sources);
        if (sources && sources.length > 0) {
            loadPreview(sources[0].id);
        }
    } catch (err) {
        console.warn("Failed to load API sources", err);
        renderSources([]);
    }
};

loadSources();
