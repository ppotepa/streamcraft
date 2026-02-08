"use strict";

const state = {
    startup: null,
    bits: [],
    events: null,
    producers: [],
    triggers: [],
    effects: [],
    startedAt: Date.now()
};

const el = (id) => document.getElementById(id);

const setText = (id, value) => {
    const node = el(id);
    if (!node) return;
    node.textContent = value;
};

const setStatus = (id, value, variant) => {
    const node = el(id);
    if (!node) return;
    node.textContent = value;
    node.className = variant ? `form-status ${variant}` : "form-status";
};

const formatNumber = (value) => {
    if (typeof value !== "number" || Number.isNaN(value)) {
        return "--";
    }
    return value.toLocaleString("en-US");
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

const postJson = async (url, body) => {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        throw new Error(await res.text());
    }

    if (res.headers.get("content-type")?.includes("application/json")) {
        return res.json();
    }

    return null;
};

const deleteJson = async (url) => {
    const res = await fetch(url, { method: "DELETE" });
    if (!res.ok) {
        throw new Error(await res.text());
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

const resetEventStats = () => {
    ["events-messages", "events-triggers", "events-triggered", "events-effects-success", "events-effects-failed", "events-effects-dropped", "events-retries"].forEach((id) => setText(id, "--"));
    const active = el("events-active");
    if (active) {
        active.textContent = "--";
        active.classList.remove("ok", "warn", "fail");
    }
    const status = el("events-status");
    if (status) {
        status.textContent = "Event diagnostics unavailable.";
    }
    setText("events-updated", "--");
};

const renderEvents = () => {
    const snapshot = state.events;
    if (!snapshot) {
        resetEventStats();
        return;
    }

    setText("events-messages", formatNumber(snapshot.messagesReceived));
    setText("events-triggers", formatNumber(snapshot.triggersEvaluated));
    setText("events-triggered", formatNumber(snapshot.triggersFired));
    setText("events-effects-success", formatNumber(snapshot.effectsSucceeded));
    setText("events-effects-failed", formatNumber(snapshot.effectsFailed));
    setText("events-effects-dropped", formatNumber(snapshot.effectsDropped));
    setText("events-retries", formatNumber(snapshot.effectRetries));

    const active = el("events-active");
    if (active) {
        active.textContent = formatNumber(snapshot.activeEffects);
        active.classList.remove("ok", "warn", "fail");
    }

    const captured = snapshot.capturedAt ? new Date(snapshot.capturedAt).toLocaleTimeString() : "--";
    setText("events-updated", captured);

    const status = el("events-status");
    if (status) {
        status.textContent = `Last update ${captured}`;
    }
};

const renderList = (id, items, renderItem) => {
    const node = el(id);
    if (!node) return;
    node.innerHTML = "";

    if (!items?.length) {
        const empty = document.createElement("li");
        empty.textContent = "None";
        node.appendChild(empty);
        return;
    }

    items.forEach((item) => {
        const row = document.createElement("li");
        renderItem(row, item);
        node.appendChild(row);
    });
};

const renderRegistry = () => {
    setText("producers-count", `${state.producers.length}`);
    setText("triggers-count", `${state.triggers.length}`);
    setText("effects-count", `${state.effects.length}`);

    renderList("producers-list", state.producers, (row, item) => {
        row.className = "registry-row";
        const title = document.createElement("div");
        title.className = "registry-title";
        title.textContent = item.producerId;
        const meta = document.createElement("div");
        meta.className = "registry-meta";
        meta.textContent = `${item.messageType.category}/${item.messageType.name}`;
        row.appendChild(title);
        row.appendChild(meta);
    });

    renderList("triggers-list", state.triggers, (row, item) => {
        row.className = "registry-row";
        const title = document.createElement("div");
        title.className = "registry-title";
        title.textContent = item.id;
        const meta = document.createElement("div");
        meta.className = "registry-meta";
        meta.textContent = `${item.messageType.category}/${item.messageType.name} · effects: ${item.effectIds?.length ?? 0}`;
        const badge = document.createElement("span");
        badge.className = item.runtimeRegistered ? "pill ok" : "pill warn";
        badge.textContent = item.runtimeRegistered ? "runtime" : "not loaded";
        meta.appendChild(badge);
        const actions = document.createElement("div");
        actions.className = "registry-actions";
        const del = document.createElement("button");
        del.className = "nes-btn is-error is-small";
        del.textContent = "Delete";
        del.dataset.action = "delete-trigger";
        del.dataset.id = item.id;
        actions.appendChild(del);
        row.appendChild(title);
        row.appendChild(meta);
        row.appendChild(actions);
    });

    renderList("effects-list", state.effects, (row, item) => {
        row.className = "registry-row";
        const title = document.createElement("div");
        title.className = "registry-title";
        title.textContent = item.id;
        const meta = document.createElement("div");
        meta.className = "registry-meta";
        const type = item.typeName || item.runtimeType || "(unknown)";
        meta.textContent = `${type}`;
        const badge = document.createElement("span");
        badge.className = item.runtimeRegistered ? "pill ok" : "pill warn";
        badge.textContent = item.runtimeRegistered ? "runtime" : "not loaded";
        meta.appendChild(badge);
        const actions = document.createElement("div");
        actions.className = "registry-actions";
        const del = document.createElement("button");
        del.className = "nes-btn is-error is-small";
        del.textContent = "Delete";
        del.dataset.action = "delete-effect";
        del.dataset.id = item.id;
        actions.appendChild(del);
        row.appendChild(title);
        row.appendChild(meta);
        row.appendChild(actions);
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

    state.events = diagnostics?.events ?? null;

    await fetchRegistry();

    setText("run-id", diagnostics?.engine?.runId ?? "--");
    setText("environment", diagnostics?.engine?.environment ?? "--");
    setText("host-url", window.location.origin);

    updateStatus();
    renderWarnings();
    renderBits();
    renderEvents();
    renderRegistry();
};

const fetchRegistry = async () => {
    const producers = await safeFetch("/events/producers");
    const triggers = await safeFetch("/events/triggers");
    const effects = await safeFetch("/events/effects");

    state.producers = producers ?? [];
    state.triggers = triggers ?? [];
    state.effects = effects ?? [];
};

function handleEmitPrefill(kind) {
    const categoryInput = el("emit-category");
    const nameInput = el("emit-name");
    const payloadInput = el("emit-payload");

    const presets = {
        donation: {
            category: "EventPlayground",
            name: "Donation",
            payload: {
                amount: 10,
                currency: "USD",
                fromUser: "DemoUser",
                message: "Hype!",
                timestamp: new Date().toISOString()
            }
        },
        chat: {
            category: "EventPlayground",
            name: "ChatMessage",
            payload: {
                user: "demo",
                text: "gg",
                channel: "#demo",
                timestamp: new Date().toISOString()
            }
        }
    };

    const preset = presets[kind];
    if (!preset) return;
    if (categoryInput) categoryInput.value = preset.category;
    if (nameInput) nameInput.value = preset.name;
    if (payloadInput) payloadInput.value = JSON.stringify(preset.payload, null, 2);
}

async function handleEmitSubmit(evt) {
    evt.preventDefault();
    const category = el("emit-category")?.value?.trim();
    const name = el("emit-name")?.value?.trim();
    const source = el("emit-source")?.value?.trim();
    const payloadRaw = el("emit-payload")?.value?.trim();
    const status = el("emit-status");

    const fail = (message) => {
        if (status) {
            status.textContent = message;
            status.className = "emit-status fail";
        }
    };

    const ok = (message) => {
        if (status) {
            status.textContent = message;
            status.className = "emit-status ok";
        }
    };

    if (!category || !name) {
        fail("Category and name are required.");
        return;
    }

    let payload = {};
    if (payloadRaw) {
        try {
            payload = JSON.parse(payloadRaw);
        } catch (err) {
            fail("Payload must be valid JSON.");
            return;
        }
    }

    try {
        const body = {
            messageType: { category, name },
            payload,
            source: source || undefined
        };
        const result = await postJson("/events/emit", body);
        ok(result?.messageType ? `Emitted ${result.messageType}` : "Emitted test event.");
    } catch (err) {
        fail(err.message || "Emit failed.");
    }
}

async function handleEffectSubmit(evt) {
    evt.preventDefault();
    const id = el("effect-id")?.value?.trim();
    const typeName = el("effect-type")?.value?.trim();
    const description = el("effect-description")?.value?.trim();
    const config = el("effect-config")?.value?.trim();
    const enabled = el("effect-enabled")?.checked ?? true;

    if (!id || !typeName) {
        setStatus("effect-status", "Effect id and type are required.", "fail");
        return;
    }

    const body = {
        id,
        typeName,
        description: description || undefined,
        configurationJson: config || undefined,
        enabled
    };

    try {
        await postJson("/events/effects", body);
        setStatus("effect-status", "Effect saved.", "ok");
        await fetchRegistry();
        renderRegistry();
    } catch (err) {
        setStatus("effect-status", err.message || "Save failed.", "fail");
    }
}

async function handleTriggerSubmit(evt) {
    evt.preventDefault();
    const id = el("trigger-id")?.value?.trim();
    const category = el("trigger-category")?.value?.trim();
    const name = el("trigger-name")?.value?.trim();
    const typeName = el("trigger-type")?.value?.trim();
    const effectsInput = el("trigger-effects")?.value ?? "";
    const filter = el("trigger-filter")?.value?.trim();
    const description = el("trigger-description")?.value?.trim();
    const enabled = el("trigger-enabled")?.checked ?? true;

    if (!id || !category || !name) {
        setStatus("trigger-status", "Id, category, and name are required.", "fail");
        return;
    }

    const effectIds = effectsInput
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e.length);

    let filterJson = undefined;
    if (filter) {
        try {
            JSON.parse(filter);
            filterJson = filter;
        } catch (err) {
            setStatus("trigger-status", "Filter must be valid JSON.", "fail");
            return;
        }
    }

    const body = {
        id,
        messageType: { category, name },
        effectIds,
        typeName: typeName || undefined,
        filterJson,
        description: description || undefined,
        enabled
    };

    try {
        await postJson("/events/triggers", body);
        setStatus("trigger-status", "Trigger saved.", "ok");
        await fetchRegistry();
        renderRegistry();
    } catch (err) {
        setStatus("trigger-status", err.message || "Save failed.", "fail");
    }
}

async function handleRegistryClick(evt) {
    const btn = evt.target.closest("[data-action]");
    if (!btn) return;
    const { action, id } = btn.dataset;
    if (!id) return;

    try {
        if (action === "delete-effect") {
            await deleteJson(`/events/effects/${encodeURIComponent(id)}`);
        } else if (action === "delete-trigger") {
            await deleteJson(`/events/triggers/${encodeURIComponent(id)}`);
        }
        await fetchRegistry();
        renderRegistry();
    } catch (err) {
        alert(err.message || "Delete failed.");
    }
}

const init = async () => {
    updateTime();
    updateUptime();
    await loadData();
    setInterval(updateUptime, 1000);
    setInterval(updateTime, 5000);
    setInterval(loadData, 15000);

    const emitForm = el("emit-form");
    if (emitForm) {
        emitForm.addEventListener("submit", handleEmitSubmit);
    }
    const emitDonation = el("emit-prefill-donation");
    if (emitDonation) emitDonation.addEventListener("click", () => handleEmitPrefill("donation"));
    const emitChat = el("emit-prefill-chat");
    if (emitChat) emitChat.addEventListener("click", () => handleEmitPrefill("chat"));

    const effectForm = el("effect-form");
    if (effectForm) effectForm.addEventListener("submit", handleEffectSubmit);
    const triggerForm = el("trigger-form");
    if (triggerForm) triggerForm.addEventListener("submit", handleTriggerSubmit);

    const triggersList = el("triggers-list");
    if (triggersList) triggersList.addEventListener("click", handleRegistryClick);
    const effectsList = el("effects-list");
    if (effectsList) effectsList.addEventListener("click", handleRegistryClick);
};

init();
