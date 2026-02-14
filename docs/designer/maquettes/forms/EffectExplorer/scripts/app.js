const effects = [
  {
    id: "core.effect.confetti",
    name: "Confetti Burst",
    category: "Visual",
    desc: "Renders celebratory confetti particles on the selected overlay.",
    options: [
      {
        key: "intensity",
        label: "Intensity",
        type: "select",
        defaultValue: "medium",
        values: [
          { value: "low", label: "Low" },
          { value: "medium", label: "Medium" },
          { value: "high", label: "High" }
        ]
      },
      { key: "durationMs", label: "Duration (ms)", type: "number", defaultValue: 2200 }
    ]
  },
  {
    id: "core.effect.caption",
    name: "Show Caption",
    category: "Text",
    desc: "Shows short text caption or donation message for a moment.",
    options: [
      { key: "text", label: "Caption Text", type: "text", defaultValue: "Huge donation incoming!" },
      {
        key: "position",
        label: "Position",
        type: "select",
        defaultValue: "bottom",
        values: [
          { value: "top", label: "Top" },
          { value: "center", label: "Center" },
          { value: "bottom", label: "Bottom" }
        ]
      },
      { key: "durationMs", label: "Duration (ms)", type: "number", defaultValue: 2000 }
    ]
  },
  {
    id: "core.effect.sound",
    name: "Play Sound",
    category: "Audio",
    desc: "Plays quick sound cue from local asset or URL.",
    options: [
      { key: "toneHz", label: "Tone (Hz)", type: "number", defaultValue: 880 },
      { key: "volume", label: "Volume (0-1)", type: "number", defaultValue: 0.25, step: 0.05 },
      { key: "durationMs", label: "Duration (ms)", type: "number", defaultValue: 650 }
    ]
  },
  {
    id: "core.effect.flash",
    name: "Screen Flash",
    category: "Visual",
    desc: "Quick white/brand-color flash to emphasize important events.",
    options: [
      { key: "color", label: "Flash Color", type: "color", defaultValue: "#ffffff" },
      { key: "durationMs", label: "Duration (ms)", type: "number", defaultValue: 650 }
    ]
  },
  {
    id: "core.effect.badge",
    name: "Badge Pop",
    category: "Attention",
    desc: "Pops small icon/badge near selected element with tiny bounce.",
    options: [
      { key: "label", label: "Badge Label", type: "text", defaultValue: "NEW!" },
      { key: "color", label: "Badge Color", type: "color", defaultValue: "#ffd95a" },
      { key: "durationMs", label: "Duration (ms)", type: "number", defaultValue: 1200 }
    ]
  }
];

const categories = ["All", "Visual", "Text", "Audio", "Attention"];

const appState = {
  activeCategory: "All",
  activeEffectId: "core.effect.confetti",
  effectOptions: {}
};

const dom = {
  categories: document.getElementById("categories"),
  effectsList: document.getElementById("effectsList"),
  search: document.getElementById("search"),
  status: document.getElementById("status"),
  effectName: document.getElementById("effectName"),
  effectCategory: document.getElementById("effectCategory"),
  effectId: document.getElementById("effectId"),
  effectDescription: document.getElementById("effectDescription"),
  effectOptions: document.getElementById("effectOptions"),
  triggerSource: document.getElementById("triggerSource"),
  triggerRule: document.getElementById("triggerRule"),
  attachBtn: document.getElementById("attachBtn"),
  testBtn: document.getElementById("testBtn"),
  saveBtn: document.getElementById("saveBtn"),
  previewHost: document.getElementById("previewWindowHost"),
  overlayName: document.getElementById("overlayName"),
  selectedElementName: document.getElementById("selectedElementName")
};

const PreviewWindowCtor = window.EffectPreviewWindow;
if (typeof PreviewWindowCtor !== "function") {
  throw new Error("EffectPreviewWindow is not available.");
}

const preview = new PreviewWindowCtor({
  mount: dom.previewHost,
  onStatus: setStatus
});

ensureDefaultOptions();
wireEvents();
renderAll();

function wireEvents() {
  dom.search.addEventListener("input", renderEffectsList);

  dom.attachBtn.addEventListener("click", () => {
    const effect = getActiveEffect();
    const source = dom.triggerSource.value;
    const rule = dom.triggerRule.value;
    setStatus("Attached: " + effect.name + " <- " + source + " (" + rule + ")");
  });

  dom.testBtn.addEventListener("click", () => {
    preview.play(true);
  });

  dom.saveBtn.addEventListener("click", () => {
    const effect = getActiveEffect();
    setStatus("Saved setup for " + effect.name + " (maquette only).");
  });
}

function ensureDefaultOptions() {
  effects.forEach((effect) => {
    if (appState.effectOptions[effect.id]) return;
    const options = {};
    effect.options.forEach((schema) => {
      options[schema.key] = schema.defaultValue;
    });
    appState.effectOptions[effect.id] = options;
  });
}

function renderAll() {
  renderCategories();
  renderEffectsList();
  renderDetails();
  renderOptionEditor();
  syncPreview(false);
}

function renderCategories() {
  dom.categories.innerHTML = "";

  categories.forEach((category) => {
    const button = document.createElement("button");
    button.className = "category-btn";
    button.textContent = category;
    if (category === appState.activeCategory) {
      button.classList.add("is-active");
    }
    button.addEventListener("click", () => {
      appState.activeCategory = category;
      renderCategories();
      renderEffectsList();
    });
    dom.categories.appendChild(button);
  });
}

function renderEffectsList() {
  const search = dom.search.value.trim().toLowerCase();
  const filtered = effects.filter((effect) => {
    const categoryOk = appState.activeCategory === "All" || effect.category === appState.activeCategory;
    const searchOk = !search || effect.name.toLowerCase().includes(search) || effect.desc.toLowerCase().includes(search);
    return categoryOk && searchOk;
  });

  dom.effectsList.innerHTML = "";

  filtered.forEach((effect) => {
    const item = document.createElement("button");
    item.className = "effect-item";
    if (effect.id === appState.activeEffectId) {
      item.classList.add("is-active");
    }

    item.innerHTML =
      '<div class="effect-title">' + escapeHtml(effect.name) + "</div>" +
      '<div class="effect-meta">' + escapeHtml(effect.category) + " | " + escapeHtml(effect.id) + "</div>" +
      '<div class="effect-desc">' + escapeHtml(effect.desc) + "</div>";

    item.addEventListener("click", () => {
      appState.activeEffectId = effect.id;
      renderEffectsList();
      renderDetails();
      renderOptionEditor();
      syncPreview(true);
      setStatus("Selected effect: " + effect.name);
    });

    dom.effectsList.appendChild(item);
  });

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "effect-desc";
    empty.textContent = "No effects found.";
    dom.effectsList.appendChild(empty);
  }
}

function renderDetails() {
  const effect = getActiveEffect();
  dom.effectName.textContent = effect.name;
  dom.effectCategory.textContent = effect.category;
  dom.effectId.textContent = effect.id;
  dom.effectDescription.textContent = effect.desc;
}

function renderOptionEditor() {
  const effect = getActiveEffect();
  const currentOptions = appState.effectOptions[effect.id];
  dom.effectOptions.innerHTML = "";

  effect.options.forEach((schema) => {
    const field = document.createElement("div");
    field.className = "effect-option-field";
    const label = document.createElement("label");
    label.textContent = schema.label;
    field.appendChild(label);

    const input = createInputBySchema(schema, currentOptions[schema.key]);
    input.addEventListener("input", () => onOptionChanged(effect.id, schema, input));
    input.addEventListener("change", () => onOptionChanged(effect.id, schema, input));
    field.appendChild(input);
    dom.effectOptions.appendChild(field);
  });
}

function createInputBySchema(schema, currentValue) {
  if (schema.type === "select") {
    const select = document.createElement("select");
    schema.values.forEach((entry) => {
      const option = document.createElement("option");
      option.value = entry.value;
      option.textContent = entry.label;
      if (String(currentValue) === String(entry.value)) {
        option.selected = true;
      }
      select.appendChild(option);
    });
    return select;
  }

  const input = document.createElement("input");
  input.type = schema.type === "color" ? "color" : schema.type === "number" ? "number" : "text";
  if (schema.step !== undefined) {
    input.step = String(schema.step);
  }
  input.value = String(currentValue);
  return input;
}

function onOptionChanged(effectId, schema, input) {
  let value = input.value;
  if (schema.type === "number") {
    value = Number(input.value);
  }
  appState.effectOptions[effectId][schema.key] = value;
  syncPreview(true);
}

function syncPreview(play) {
  const effect = getActiveEffect();
  const options = appState.effectOptions[effect.id];

  preview.setCanvasState({
    overlayName: dom.overlayName.textContent.trim(),
    selectedElementName: dom.selectedElementName.textContent.trim(),
    selectedElementType: "canvas-item"
  });

  if (play) {
    preview.setEffect(effect, options);
  } else {
    preview.setEffect(effect, options);
  }
}

function getActiveEffect() {
  return effects.find((effect) => effect.id === appState.activeEffectId) || effects[0];
}

function setStatus(message) {
  dom.status.textContent = message;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
