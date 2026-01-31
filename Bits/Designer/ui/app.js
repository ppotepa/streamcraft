"use strict";

const list = document.getElementById("api-sources");

const renderSources = (sources) => {
    if (!list) return;
    list.innerHTML = "";
    if (!sources || sources.length === 0) {
        const item = document.createElement("li");
        item.textContent = "No sources loaded.";
        list.appendChild(item);
        return;
    }

    sources.slice(0, 12).forEach((source) => {
        const item = document.createElement("li");
        item.textContent = `${source.name} — ${source.description}`;
        list.appendChild(item);
    });
};

const loadSources = async () => {
    try {
        const res = await fetch("/designer/sources", { cache: "no-store" });
        if (!res.ok) {
            throw new Error(await res.text());
        }
        const sources = await res.json();
        renderSources(sources);
    } catch (err) {
        console.warn("Failed to load API sources", err);
        renderSources([]);
    }
};

loadSources();
