"use strict";

const state = {
    startup: null,
    bits: [],
    startedAt: Date.now()
};

const el = (id) => document.getElementById(id);

const setText = (id, value) => {
    const node = el(id);
    if (!node) return;
    node.textContent = value;
};

const setPill = (id, status, text) => {
    const node = el(id);
    if (!node) return;
    node.textContent = text;
    node.classList.remove("ok", "warn", "fail");
    if (status) {
        node.classList.add(status);
    }
};

const fetchJson = async (url) => {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
        throw new Error(await res.text());
    }
    return res.json();
};

const safeFetch = async (url) => {
    try {
        return await fetchJson(url);
    } catch (err) {
        console.warn(`Failed to fetch ${url}`, err);
        return null;
    }
};

const updateUptime = () => {
    const elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    setText("uptime", `${mins}m ${secs}s`);
};

const updateTime = () => {
    setText("utc-time", new Date().toISOString().replace("T", " ").replace("Z", " UTC"));
};

const renderWarnings = () => {
    const list = el("warnings");
    if (!list) return;
    list.innerHTML = "";

    const warnings = [];
    if (state.startup?.results) {
        state.startup.results.forEach((result) => {
            if (result.status && result.status.toLowerCase() === "warning") {
                warnings.push(result.message || `${result.name} warning`);
            }
        });
    }

    if (!warnings.length) {
        const item = document.createElement("li");
        item.textContent = "No warnings.";
        list.appendChild(item);
        return;
    }

    warnings.forEach((warn) => {
        const item = document.createElement("li");
        item.textContent = warn;
        list.appendChild(item);
    });
};

const renderBits = () => {
    const grid = el("bits-grid");
    if (!grid) return;
    grid.innerHTML = "";

    if (!state.bits.length) {
        const empty = document.createElement("div");
        empty.className = "nes-container is-dark bit-card";
        empty.textContent = "No bits discovered.";
        grid.appendChild(empty);
        return;
    }

    state.bits.forEach((bit) => {
        const card = document.createElement("div");
        card.className = "nes-container is-dark bit-card";

        const title = document.createElement("h3");
        title.textContent = bit.name || bit.route || "Unknown";
        card.appendChild(title);

        const meta = document.createElement("div");
        meta.className = "bit-meta";
        const route = document.createElement("span");
        route.className = "bit-route";
        route.textContent = bit.route || "--";
        const config = document.createElement("span");
        config.textContent = bit.configured ? "configured" : "needs config";
        config.className = bit.configured ? "nes-text is-success" : "nes-text is-warning";
        meta.appendChild(route);
        meta.appendChild(config);
        card.appendChild(meta);

        const actions = document.createElement("div");
        actions.className = "bit-actions";

        actions.appendChild(makeButton("Open", bit.route));
        actions.appendChild(makeButton("Config", `${bit.route}/config`));
        actions.appendChild(makeButton("State", `${bit.route}/state`));
        if (bit.hasDebug) {
            actions.appendChild(makeButton("Debug", `${bit.route}/debug`));
        }

        card.appendChild(actions);
        grid.appendChild(card);
    });
};

const makeButton = (label, href) => {
    const link = document.createElement("a");
    link.className = "nes-btn is-primary";
    link.href = href;
    link.textContent = label;
    return link;
};

const updateStatus = () => {
    const startup = state.startup;
    if (!startup) {
        setPill("host-status", "warn", "unknown");
        setPill("db-status", "warn", "unknown");
        setPill("migrations-status", "warn", "unknown");
        setText("bits-count", `${state.bits.length}`);
        return;
    }

    setPill("host-status", "ok", "online");
    setPill("db-status", statusFromCheck("Database"), labelFromCheck("Database"));
    setPill("migrations-status", statusFromCheck("Migrations"), labelFromCheck("Migrations"));
    setText("bits-count", `${state.bits.length}`);
};

const statusFromCheck = (name) => {
    const check = findCheck(name);
    if (!check) return "warn";
    const status = (check.status || "").toLowerCase();
    if (status === "ok") return "ok";
    if (status === "warning") return "warn";
    if (status === "fail") return "fail";
    return "warn";
};

const labelFromCheck = (name) => {
    const check = findCheck(name);
    if (!check) return "unknown";
    const status = (check.status || "").toLowerCase();
    if (status === "ok") return "ok";
    if (status === "warning") return "warn";
    if (status === "fail") return "fail";
    return status;
};

const findCheck = (name) => {
    if (!state.startup?.results) return null;
    return state.startup.results.find((result) => result.name?.toLowerCase() === name.toLowerCase());
};

const loadData = async () => {
    const startup = await safeFetch("/diagnostics/startup");
    if (startup) {
        state.startup = startup;
        if (startup.startedUtc) {
            state.startedAt = Date.parse(startup.startedUtc) || Date.now();
        }
    }

    const diagnostics = await safeFetch("/diagnostics");
    if (diagnostics?.bits) {
    state.bits = diagnostics.bits.map((bit) => ({
        name: bit.name,
        route: bit.route,
        hasUi: bit.hasUi,
        hasDebug: bit.hasDebug,
        configured: bit.configured
    }));
    }

    setText("run-id", diagnostics?.engine?.runId ?? "--");
    setText("environment", diagnostics?.engine?.environment ?? "--");
    setText("host-url", window.location.origin);

    updateStatus();
    renderWarnings();
    renderBits();
};

const init = async () => {
    updateTime();
    updateUptime();
    await loadData();
    setInterval(updateUptime, 1000);
    setInterval(updateTime, 5000);
    setInterval(loadData, 15000);
};

init();
