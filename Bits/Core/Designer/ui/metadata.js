"use strict";

const sourceList = document.getElementById("source-list");
const endpointList = document.getElementById("endpoint-list");
const summary = document.getElementById("meta-summary");
const fieldsBody = document.getElementById("fields-body");
const raw = document.getElementById("meta-raw");
const live = document.getElementById("meta-live");
const statusChip = document.getElementById("meta-status");
const searchInput = document.getElementById("source-search");
const testButton = document.getElementById("test-request");

const state = {
    sources: [],
    filteredSources: [],
    activeSourceId: null,
    activeEndpointPath: null
};

const loadSources = async () => {
    try {
        const res = await fetch("/designer/sources", { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        state.sources = data.filter((source) => Array.isArray(source.endpoints) && source.endpoints.length > 0);
        applySearch();
        if (state.filteredSources.length > 0) {
            setActiveSource(state.filteredSources[0].id);
        } else {
            renderEndpoints([]);
            renderMetadata(null, null);
        }
    } catch (err) {
        console.warn("Failed to load sources", err);
        if (summary) summary.textContent = "Failed to load API sources.";
    }
};

const applySearch = () => {
    const query = (searchInput?.value || "").toLowerCase().trim();
    if (!query) {
        state.filteredSources = [...state.sources];
    } else {
        state.filteredSources = state.sources.filter((source) => {
            const name = (source.name || "").toLowerCase();
            const id = (source.id || "").toLowerCase();
            const description = (source.description || "").toLowerCase();
            return name.includes(query) || id.includes(query) || description.includes(query);
        });
    }
    renderSources();
};

const renderSources = () => {
    if (!sourceList) return;
    sourceList.innerHTML = "";
    if (state.filteredSources.length === 0) {
        const item = document.createElement("li");
        item.textContent = "No API sources found.";
        sourceList.appendChild(item);
        return;
    }
    state.filteredSources.forEach((source) => {
        const item = document.createElement("li");
        item.className = "metadata-item";
        item.dataset.sourceId = source.id;
        item.textContent = source.name || source.id || "source";
        if (source.id === state.activeSourceId) item.classList.add("active");
        sourceList.appendChild(item);
    });
};

const renderEndpoints = (endpoints) => {
    if (!endpointList) return;
    endpointList.innerHTML = "";
    if (!endpoints || endpoints.length === 0) {
        const item = document.createElement("li");
        item.textContent = "No endpoints.";
        endpointList.appendChild(item);
        return;
    }
    endpoints.forEach((endpoint) => {
        const item = document.createElement("li");
        item.className = "metadata-item";
        item.dataset.endpointPath = endpoint.path || endpoint.name || "";
        const method = endpoint.method ? endpoint.method.toUpperCase() : "";
        const label = endpoint.name || endpoint.path || "endpoint";
        item.textContent = method ? `${label} (${method})` : label;
        if (item.dataset.endpointPath === state.activeEndpointPath) item.classList.add("active");
        endpointList.appendChild(item);
    });
};

const renderMetadata = (source, endpoint) => {
    if (summary) summary.innerHTML = "";
    if (fieldsBody) fieldsBody.innerHTML = "";
    if (raw) raw.textContent = "";
    if (live) live.textContent = "Run a test request to see the response.";
    if (statusChip) statusChip.textContent = "—";
    if (testButton) testButton.disabled = !endpoint;

    if (!source || !endpoint) {
        if (summary) summary.textContent = "Select an API source and endpoint to inspect metadata.";
        if (raw) raw.textContent = "No endpoint selected.";
        return;
    }

    const response = endpoint.response || null;
    const summaryLines = [];
    summaryLines.push(`<div><strong>Source:</strong> ${source.name || source.id}</div>`);
    summaryLines.push(`<div><strong>Endpoint:</strong> ${endpoint.method || "GET"} ${endpoint.path || endpoint.name}</div>`);
    if (endpoint.description) summaryLines.push(`<div><strong>Description:</strong> ${endpoint.description}</div>`);
    if (source.baseUrl) summaryLines.push(`<div><strong>Base URL:</strong> ${source.baseUrl}</div>`);
    summaryLines.push(`<div><strong>Binding prefix:</strong> response</div>`);
    if (response?.fetchedUtc) summaryLines.push(`<div><strong>Fetched:</strong> ${new Date(response.fetchedUtc).toLocaleString()}</div>`);
    if (response?.contentType) summaryLines.push(`<div><strong>Content Type:</strong> ${response.contentType}</div>`);
    if (response?.statusCode) summaryLines.push(`<div><strong>Status:</strong> ${response.statusCode}</div>`);
    if (summary) summary.innerHTML = summaryLines.join("");

    if (!response) {
        if (raw) raw.textContent = "No metadata available for this endpoint.";
        return;
    }

    if (statusChip) {
        statusChip.textContent = response.success ? "success" : "error";
        statusChip.classList.toggle("chip-success", !!response.success);
        statusChip.classList.toggle("chip-error", !response.success);
    }

    if (response.error) {
        if (raw) raw.textContent = response.error;
        return;
    }

    const fields = Array.isArray(response.fields) ? response.fields : [];
    if (fields.length === 0) {
        const row = document.createElement("div");
        row.className = "metadata-row";
        row.innerHTML = "<span>—</span><span>—</span><span>No fields captured</span>";
        fieldsBody?.appendChild(row);
    } else {
        fields.forEach((field) => {
            const row = document.createElement("div");
            row.className = "metadata-row";
            if (field.isContainer) row.classList.add("metadata-row-container");
            const example = field.example ? field.example : "";
            row.innerHTML = `<span>${field.path || ""}</span><span>${field.type || ""}</span><span>${example}</span>`;
            fieldsBody?.appendChild(row);
        });
    }

    if (raw) raw.textContent = JSON.stringify(response, null, 2);
};

const runTestRequest = async () => {
    const source = state.filteredSources.find((item) => item.id === state.activeSourceId) || null;
    const endpoints = source?.endpoints || [];
    const endpoint = endpoints.find((item) => (item.path || item.name) === state.activeEndpointPath) || null;
    if (!source || !endpoint) return;
    if (!live) return;

    live.textContent = "Running request...";
    try {
        const url = `/public-api-sources/test?sourceId=${encodeURIComponent(source.id)}&endpointPath=${encodeURIComponent(endpoint.path || endpoint.name || "")}`;
        const res = await fetch(url, { cache: "no-store" });
        const text = await res.text();
        let parsed = null;
        try {
            parsed = JSON.parse(text);
        } catch {
            parsed = { error: "Non-JSON response", raw: text };
        }
        live.textContent = JSON.stringify(parsed, null, 2);
    } catch (err) {
        live.textContent = JSON.stringify({ error: err?.message || "Request failed" }, null, 2);
    }
};

const setActiveSource = (sourceId) => {
    state.activeSourceId = sourceId;
    renderSources();
    const source = state.filteredSources.find((item) => item.id === sourceId) || null;
    const endpoints = source?.endpoints || [];
    state.activeEndpointPath = endpoints[0]?.path || endpoints[0]?.name || null;
    renderEndpoints(endpoints);
    const endpoint = endpoints.find((item) => (item.path || item.name) === state.activeEndpointPath) || null;
    renderMetadata(source, endpoint);
};

const setActiveEndpoint = (endpointPath) => {
    state.activeEndpointPath = endpointPath;
    const source = state.filteredSources.find((item) => item.id === state.activeSourceId) || null;
    const endpoints = source?.endpoints || [];
    renderEndpoints(endpoints);
    const endpoint = endpoints.find((item) => (item.path || item.name) === endpointPath) || null;
    renderMetadata(source, endpoint);
};

if (searchInput) {
    searchInput.addEventListener("input", () => {
        applySearch();
        if (!state.filteredSources.some((s) => s.id === state.activeSourceId)) {
            const fallback = state.filteredSources[0];
            if (fallback) {
                setActiveSource(fallback.id);
            } else {
                renderEndpoints([]);
                renderMetadata(null, null);
            }
        }
    });
}

if (sourceList) {
    sourceList.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const sourceId = target.dataset.sourceId;
        if (sourceId) setActiveSource(sourceId);
    });
}

if (endpointList) {
    endpointList.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const endpointPath = target.dataset.endpointPath;
        if (endpointPath) setActiveEndpoint(endpointPath);
    });
}

if (testButton) {
    testButton.addEventListener("click", () => {
        runTestRequest();
    });
}

loadSources();
