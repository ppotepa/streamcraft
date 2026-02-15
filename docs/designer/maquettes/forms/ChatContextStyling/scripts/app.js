const PRESETS = {
  classic: { label: "Classic", t: { bg: "#101318", border: "#3d4652", bubble: "#1b212b", text: "#f2f4f8", username: "#8ec8ff", timestamp: "#a9b2c0", badgeBg: "#ffd95a", badgeText: "#2a2a2a", fontSize: 14, radius: 7, padding: 8, gap: 6 } },
  compact: { label: "Compact", t: { bg: "#111315", border: "#43464d", bubble: "#171a1f", text: "#e6e8ed", username: "#a6c8ff", timestamp: "#9ba3af", badgeBg: "#c4e470", badgeText: "#1d2610", fontSize: 12, radius: 4, padding: 6, gap: 4 } },
  streamer: { label: "Streamer", t: { bg: "#1b1224", border: "#8255a7", bubble: "#2a1b38", text: "#f7efff", username: "#ffb7ff", timestamp: "#d7bfdc", badgeBg: "#ff7dc8", badgeText: "#2b1230", fontSize: 15, radius: 9, padding: 9, gap: 7 } },
  minimal: { label: "Minimal", t: { bg: "#0d0d0d", border: "#2b2b2b", bubble: "#131313", text: "#f2f2f2", username: "#ffffff", timestamp: "#9a9a9a", badgeBg: "#dcdcdc", badgeText: "#212121", fontSize: 13, radius: 3, padding: 7, gap: 5 } },
  glass: { label: "Glass", t: { bg: "#0d1524", border: "#5c82b0", bubble: "#1a2f4d", text: "#e9f4ff", username: "#8de7ff", timestamp: "#b8cbdf", badgeBg: "#7df0c6", badgeText: "#113023", fontSize: 14, radius: 11, padding: 8, gap: 6 } }
};

const CSS_SCOPE = '[data-preview-id="chat-maq-preview"]';
const SNIPPETS = {
  "left-accent": ".chat-message-content { border-left: 3px solid #ff4d88; }",
  "soft-glass": ".chat-message-content { backdrop-filter: blur(3px); background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.28); }",
  "compact-clean": ".chat-meta { margin-bottom: 2px; font-size: 10px; } .chat-message-content { padding: 5px 7px; border-radius: 4px; }"
};
const MAX_MSG = 10;
const RANDOM_TEXT = ["nice update", "looks clean", "good pacing", "switch preset?", "lets go"];

const state = {
  sourceId: "system-chat", lineCount: 4, sourceStatus: "connected", lastMessageAt: "--:--:--",
  showUsername: true, showTimestamp: true, showBadges: true, showAvatars: false, showRoleColor: true,
  flow: "bottom", align: "left", widthMode: "full", previewViewport: "desktop",
  presetId: "classic", backgroundMode: "solid", containerOpacity: 100, bubbleOpacity: 100, borderIntensity: 70, shadowIntensity: 35, blurAmount: 0,
  customCssEnabled: false, customCss: "", tokens: { ...PRESETS.classic.t },
  triggers: [
    {
      id: "rule-1",
      eventType: "chat.message",
      operator: "equals",
      value: "!help",
      action: "display_caption",
      payload: "Type !commands for all commands",
      cooldown: 5,
      enabled: true
    }
  ],
  selectedTriggerId: "rule-1",
  messages: [
    { username: "Nova", text: "Huge play right there!", timestamp: "19:48:25", badges: ["VIP"], role: "vip" },
    { username: "ModCore", text: "Keep it civil and enjoy the stream.", timestamp: "19:48:34", badges: ["MOD"], role: "mod" },
    { username: "Pawel", text: "Testing this new chat style flow now.", timestamp: "19:48:40", badges: ["BCAST"], role: "broadcaster" },
    { username: "Drew", text: "gg", timestamp: "19:48:45", badges: [], role: "viewer" }
  ]
};

let saved = null;
let renderTimer = null;
let renderFrame = null;
let lastRender = 0;

const id = (name) => document.getElementById(name);
const dom = {
  tabs: id("tabs"), panels: document.querySelectorAll(".tab-panel"),
  sourceSelect: id("sourceSelect"), lineCount: id("lineCount"), lineCountNumber: id("lineCountNumber"), sourceStatus: id("sourceStatus"), lastMessageAt: id("lastMessageAt"), testSourceBtn: id("testSourceBtn"),
  triggerRuleCount: id("triggerRuleCount"), openTriggersBtn: id("openTriggersBtn"),
  showUsername: id("showUsername"), showTimestamp: id("showTimestamp"), showBadges: id("showBadges"), showAvatars: id("showAvatars"), showRoleColor: id("showRoleColor"),
  presetBar: id("presetBar"), modifiedFlag: id("modifiedFlag"),
  backgroundMode: id("backgroundMode"), tokenBg: id("tokenBg"), containerOpacity: id("containerOpacity"), containerOpacityValue: id("containerOpacityValue"),
  tokenBorder: id("tokenBorder"), borderIntensity: id("borderIntensity"), borderIntensityValue: id("borderIntensityValue"),
  shadowIntensity: id("shadowIntensity"), shadowIntensityValue: id("shadowIntensityValue"), blurAmount: id("blurAmount"), blurAmountValue: id("blurAmountValue"), blurSupportStatus: id("blurSupportStatus"),
  tokenBubble: id("tokenBubble"), bubbleOpacity: id("bubbleOpacity"), bubbleOpacityValue: id("bubbleOpacityValue"), tokenText: id("tokenText"),
  tokenUsername: id("tokenUsername"), tokenTimestamp: id("tokenTimestamp"), tokenBadgeBg: id("tokenBadgeBg"), tokenBadgeText: id("tokenBadgeText"),
  tokenFontSize: id("tokenFontSize"), tokenRadius: id("tokenRadius"), tokenPadding: id("tokenPadding"), tokenGap: id("tokenGap"),
  messageFlow: id("messageFlow"), messageAlign: id("messageAlign"), widthMode: id("widthMode"),
  scopeSelector: id("scopeSelector"), cssValidation: id("cssValidation"), customCssEnabled: id("customCssEnabled"), cssSnippetSelect: id("cssSnippetSelect"),
  applySnippetBtn: id("applySnippetBtn"), customCssInput: id("customCssInput"), copyCssBtn: id("copyCssBtn"), clearCssBtn: id("clearCssBtn"),
  previewViewport: id("previewViewport"), previewViewportFrame: id("previewViewportFrame"), chatPreviewRoot: id("chatPreviewRoot"), chatMessages: id("chatMessages"),
  previewMeta: id("previewMeta"), contrastIndicator: id("contrastIndicator"),
  simulateBtn: id("simulateBtn"), cyclePresetBtn: id("cyclePresetBtn"),
  status: id("status"), unsavedIndicator: id("unsavedIndicator"), applyBtn: id("applyBtn"), saveBtn: id("saveBtn"), cancelBtn: id("cancelBtn"), resetBtn: id("resetBtn"),
  triggersOverlay: id("triggersOverlay"), closeTriggersBtn: id("closeTriggersBtn"), newTriggerBtn: id("newTriggerBtn"), triggersList: id("triggersList"),
  triggerEventType: id("triggerEventType"), triggerOperator: id("triggerOperator"), triggerValue: id("triggerValue"), triggerAction: id("triggerAction"),
  triggerPayload: id("triggerPayload"), triggerCooldown: id("triggerCooldown"), triggerEnabled: id("triggerEnabled"), duplicateTriggerBtn: id("duplicateTriggerBtn"),
  deleteTriggerBtn: id("deleteTriggerBtn"), saveTriggerBtn: id("saveTriggerBtn")
};

const customStyle = document.createElement("style");
customStyle.id = "chat-custom-css";
document.head.appendChild(customStyle);

init();

function init() {
  dom.scopeSelector.textContent = CSS_SCOPE;
  bindTabs();
  bindDataSource();
  bindTriggersWindow();
  bindStyle();
  bindLayout();
  bindCss();
  bindActions();
  renderPresetButtons();
  syncUi();
  renderSourceStatus();
  renderTriggerSummary();
  renderNow();
  saved = snap();
  updateDirty();
  setStatus("Ready. Configure source and style, then Apply/Save.");
}

function bindTabs() {
  dom.tabs.addEventListener("click", (e) => {
    if (!(e.target instanceof HTMLButtonElement)) return;
    const tab = e.target.dataset.tab;
    if (!tab) return;
    document.querySelectorAll(".tab").forEach((n) => n.classList.remove("is-active"));
    e.target.classList.add("is-active");
    dom.panels.forEach((p) => p.classList.toggle("is-active", p.getAttribute("data-panel") === tab));
  });
}

function bindDataSource() {
  dom.sourceSelect.addEventListener("change", () => { state.sourceId = dom.sourceSelect.value; state.sourceStatus = "no-data"; renderSourceStatus(); changed(); setStatus("Source changed. Click Test source."); });
  dom.lineCount.addEventListener("input", () => { state.lineCount = clampInt(dom.lineCount.value, 1, MAX_MSG, 4); dom.lineCountNumber.value = String(state.lineCount); changed(true); });
  dom.lineCountNumber.addEventListener("input", () => { state.lineCount = clampInt(dom.lineCountNumber.value, 1, MAX_MSG, 4); dom.lineCount.value = String(state.lineCount); changed(true); });
  dom.testSourceBtn.addEventListener("click", testSource);
}

function bindTriggersWindow() {
  dom.openTriggersBtn.addEventListener("click", () => {
    renderTriggersList();
    syncTriggerEditor();
    dom.triggersOverlay.classList.remove("hidden");
  });

  dom.closeTriggersBtn.addEventListener("click", () => {
    dom.triggersOverlay.classList.add("hidden");
  });

  dom.newTriggerBtn.addEventListener("click", () => {
    const next = createTrigger();
    state.triggers.push(next);
    state.selectedTriggerId = next.id;
    renderTriggersList();
    syncTriggerEditor();
    renderTriggerSummary();
    changed();
    setStatus("Created new trigger rule.");
  });

  dom.duplicateTriggerBtn.addEventListener("click", () => {
    const current = getSelectedTrigger();
    if (!current) return;
    const copy = { ...current, id: "rule-" + Date.now() };
    state.triggers.push(copy);
    state.selectedTriggerId = copy.id;
    renderTriggersList();
    syncTriggerEditor();
    renderTriggerSummary();
    changed();
    setStatus("Duplicated trigger rule.");
  });

  dom.deleteTriggerBtn.addEventListener("click", () => {
    if (state.triggers.length <= 1) {
      setStatus("At least one rule is required in this maquette.");
      return;
    }
    state.triggers = state.triggers.filter((r) => r.id !== state.selectedTriggerId);
    state.selectedTriggerId = state.triggers[0]?.id ?? null;
    renderTriggersList();
    syncTriggerEditor();
    renderTriggerSummary();
    changed();
    setStatus("Deleted trigger rule.");
  });

  dom.saveTriggerBtn.addEventListener("click", () => {
    const current = getSelectedTrigger();
    if (!current) return;
    current.eventType = dom.triggerEventType.value;
    current.operator = dom.triggerOperator.value;
    current.value = dom.triggerValue.value.trim();
    current.action = dom.triggerAction.value;
    current.payload = dom.triggerPayload.value.trim();
    current.cooldown = clampInt(dom.triggerCooldown.value, 0, 60, 0);
    current.enabled = dom.triggerEnabled.checked;
    renderTriggersList();
    renderTriggerSummary();
    changed();
    setStatus("Trigger rule saved.");
  });
}

function bindStyle() {
  bindCheck(dom.showUsername, "showUsername");
  bindCheck(dom.showTimestamp, "showTimestamp");
  bindCheck(dom.showBadges, "showBadges");
  bindCheck(dom.showAvatars, "showAvatars");
  bindCheck(dom.showRoleColor, "showRoleColor");
  bindValue(dom.backgroundMode, "backgroundMode");

  bindTokenColor(dom.tokenBg, "bg");
  bindTokenColor(dom.tokenBorder, "border");
  bindTokenColor(dom.tokenBubble, "bubble");
  bindTokenColor(dom.tokenText, "text");
  bindTokenColor(dom.tokenUsername, "username");
  bindTokenColor(dom.tokenTimestamp, "timestamp");
  bindTokenColor(dom.tokenBadgeBg, "badgeBg");
  bindTokenColor(dom.tokenBadgeText, "badgeText");

  bindRange(dom.containerOpacity, "containerOpacity", dom.containerOpacityValue, "%");
  bindRange(dom.bubbleOpacity, "bubbleOpacity", dom.bubbleOpacityValue, "%");
  bindRange(dom.borderIntensity, "borderIntensity", dom.borderIntensityValue, "%");
  bindRange(dom.shadowIntensity, "shadowIntensity", dom.shadowIntensityValue, "%");
  bindRange(dom.blurAmount, "blurAmount", dom.blurAmountValue, "px");
  bindRange(dom.tokenFontSize, "fontSize", null, "", true);
  bindRange(dom.tokenRadius, "radius", null, "", true);
  bindRange(dom.tokenPadding, "padding", null, "", true);
  bindRange(dom.tokenGap, "gap", null, "", true);
}

function bindLayout() {
  bindValue(dom.messageFlow, "flow");
  bindValue(dom.messageAlign, "align");
  bindValue(dom.widthMode, "widthMode");
  bindValue(dom.previewViewport, "previewViewport");
}

function bindCss() {
  bindCheck(dom.customCssEnabled, "customCssEnabled");
  dom.customCssInput.addEventListener("input", () => { state.customCss = dom.customCssInput.value; changed(true); });
  dom.applySnippetBtn.addEventListener("click", () => {
    const key = dom.cssSnippetSelect.value;
    state.customCss = SNIPPETS[key] || "";
    state.customCssEnabled = true;
    dom.customCssInput.value = state.customCss;
    dom.customCssEnabled.checked = true;
    changed();
    setStatus("Snippet applied: " + key);
  });
  dom.clearCssBtn.addEventListener("click", () => { state.customCss = ""; state.customCssEnabled = false; dom.customCssInput.value = ""; dom.customCssEnabled.checked = false; changed(); });
  dom.copyCssBtn.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(toCssVariables()); setStatus("Copied token CSS."); }
    catch { setStatus("Clipboard unavailable."); }
  });
}

function bindActions() {
  dom.simulateBtn.addEventListener("click", () => { addRandomMsg(); state.lastMessageAt = timeNow(); renderSourceStatus(); changed(true); setStatus("Simulated message."); });
  dom.cyclePresetBtn.addEventListener("click", () => { cyclePreset(); changed(); setStatus("Preset switched."); });
  dom.applyBtn.addEventListener("click", () => setStatus("Applied (maquette)."));
  dom.saveBtn.addEventListener("click", () => { saved = snap(); updateDirty(); setStatus("Saved (maquette)."); });
  dom.cancelBtn.addEventListener("click", () => {
    if (!saved) return;
    restore(saved);
    syncUi();
    renderSourceStatus();
    renderTriggersList();
    syncTriggerEditor();
    renderNow();
    updateDirty();
    setStatus("Canceled unsaved changes.");
  });
  dom.resetBtn.addEventListener("click", () => { resetStyleToPreset(); syncUi(); renderNow(); updateDirty(); setStatus("Style reset to preset."); });
}

function bindCheck(node, key) { node.addEventListener("change", () => { state[key] = node.checked; changed(); }); }
function bindValue(node, key) { node.addEventListener("change", () => { state[key] = node.value; changed(); }); }
function bindTokenColor(node, key) { node.addEventListener("input", () => { state.tokens[key] = node.value; changed(); }); }
function bindRange(node, key, out, suffix, isToken) {
  const fn = () => {
    const val = clampInt(node.value, 0, 1000, 0);
    if (isToken) state.tokens[key] = val; else state[key] = val;
    if (out) out.textContent = String(val) + suffix;
    changed(true);
  };
  node.addEventListener("input", fn);
  node.addEventListener("change", fn);
}

function testSource() {
  dom.testSourceBtn.disabled = true;
  setStatus("Testing source...");
  setTimeout(() => {
    const r = Math.random();
    if (r < 0.62) { state.sourceStatus = "connected"; state.lastMessageAt = timeNow(); addRandomMsg(); setStatus("Source connected."); }
    else if (r < 0.86) { state.sourceStatus = "no-data"; setStatus("Source reachable, no data."); }
    else { state.sourceStatus = "error"; setStatus("Source error."); }
    dom.testSourceBtn.disabled = false;
    renderSourceStatus();
    changed(true);
  }, 700);
}

function renderPresetButtons() {
  dom.presetBar.innerHTML = "";
  Object.entries(PRESETS).forEach(([k, p]) => {
    const b = document.createElement("button");
    b.className = "preset-btn" + (k === state.presetId ? " is-active" : "");
    b.textContent = p.label;
    b.addEventListener("click", () => { state.presetId = k; state.tokens = { ...p.t }; renderPresetButtons(); updateModifiedFlag(); changed(); });
    dom.presetBar.appendChild(b);
  });
}

function cyclePreset() {
  const keys = Object.keys(PRESETS);
  const i = keys.indexOf(state.presetId);
  state.presetId = keys[(i + 1) % keys.length];
  state.tokens = { ...PRESETS[state.presetId].t };
  renderPresetButtons();
}

function resetStyleToPreset() {
  state.tokens = { ...PRESETS[state.presetId].t };
  state.backgroundMode = "solid";
  state.containerOpacity = 100;
  state.bubbleOpacity = 100;
  state.borderIntensity = 70;
  state.shadowIntensity = 35;
  state.blurAmount = 0;
  state.customCssEnabled = false;
  state.customCss = "";
}

function syncUi() {
  dom.sourceSelect.value = state.sourceId;
  dom.lineCount.value = String(state.lineCount);
  dom.lineCountNumber.value = String(state.lineCount);
  dom.showUsername.checked = state.showUsername;
  dom.showTimestamp.checked = state.showTimestamp;
  dom.showBadges.checked = state.showBadges;
  dom.showAvatars.checked = state.showAvatars;
  dom.showRoleColor.checked = state.showRoleColor;
  dom.backgroundMode.value = state.backgroundMode;
  dom.tokenBg.value = state.tokens.bg;
  dom.tokenBorder.value = state.tokens.border;
  dom.containerOpacity.value = String(state.containerOpacity);
  dom.containerOpacityValue.textContent = state.containerOpacity + "%";
  dom.borderIntensity.value = String(state.borderIntensity);
  dom.borderIntensityValue.textContent = state.borderIntensity + "%";
  dom.shadowIntensity.value = String(state.shadowIntensity);
  dom.shadowIntensityValue.textContent = state.shadowIntensity + "%";
  dom.blurAmount.value = String(state.blurAmount);
  dom.blurAmountValue.textContent = state.blurAmount + "px";
  dom.tokenBubble.value = state.tokens.bubble;
  dom.bubbleOpacity.value = String(state.bubbleOpacity);
  dom.bubbleOpacityValue.textContent = state.bubbleOpacity + "%";
  dom.tokenText.value = state.tokens.text;
  dom.tokenUsername.value = state.tokens.username;
  dom.tokenTimestamp.value = state.tokens.timestamp;
  dom.tokenBadgeBg.value = state.tokens.badgeBg;
  dom.tokenBadgeText.value = state.tokens.badgeText;
  dom.tokenFontSize.value = String(state.tokens.fontSize);
  dom.tokenRadius.value = String(state.tokens.radius);
  dom.tokenPadding.value = String(state.tokens.padding);
  dom.tokenGap.value = String(state.tokens.gap);
  dom.messageFlow.value = state.flow;
  dom.messageAlign.value = state.align;
  dom.widthMode.value = state.widthMode;
  dom.previewViewport.value = state.previewViewport;
  dom.customCssEnabled.checked = state.customCssEnabled;
  dom.customCssInput.value = state.customCss;
}

function renderSourceStatus() {
  dom.sourceStatus.textContent = state.sourceStatus === "connected" ? "Connected" : state.sourceStatus === "no-data" ? "No data" : "Error";
  dom.sourceStatus.className = "status-pill " + state.sourceStatus;
  dom.lastMessageAt.textContent = state.lastMessageAt;
}

function renderTriggerSummary() {
  dom.triggerRuleCount.textContent = String(state.triggers.length);
}

function createTrigger() {
  return {
    id: "rule-" + Date.now(),
    eventType: "chat.message",
    operator: "contains",
    value: "!new",
    action: "display_caption",
    payload: "New rule created",
    cooldown: 5,
    enabled: true
  };
}

function getSelectedTrigger() {
  return state.triggers.find((rule) => rule.id === state.selectedTriggerId) || null;
}

function renderTriggersList() {
  dom.triggersList.innerHTML = "";
  state.triggers.forEach((rule) => {
    const item = document.createElement("div");
    item.className = "trigger-item" + (rule.id === state.selectedTriggerId ? " active" : "");
    const title = document.createElement("div");
    title.className = "trigger-item-title";
    title.textContent = rule.enabled ? "Enabled" : "Disabled";
    const sub = document.createElement("div");
    sub.className = "trigger-item-sub";
    sub.textContent = rule.eventType + " " + rule.operator + " \"" + rule.value + "\" -> " + rule.action;
    item.append(title, sub);
    item.addEventListener("click", () => {
      state.selectedTriggerId = rule.id;
      renderTriggersList();
      syncTriggerEditor();
    });
    dom.triggersList.appendChild(item);
  });
}

function syncTriggerEditor() {
  const current = getSelectedTrigger();
  if (!current) return;
  dom.triggerEventType.value = current.eventType;
  dom.triggerOperator.value = current.operator;
  dom.triggerValue.value = current.value;
  dom.triggerAction.value = current.action;
  dom.triggerPayload.value = current.payload;
  dom.triggerCooldown.value = String(current.cooldown);
  dom.triggerEnabled.checked = Boolean(current.enabled);
}

function changed(throttle) {
  updateModifiedFlag();
  scheduleRender(Boolean(throttle));
  updateDirty();
}

function scheduleRender(throttle) {
  if (renderFrame) cancelAnimationFrame(renderFrame);
  if (renderTimer) clearTimeout(renderTimer);
  if (!throttle) { renderFrame = requestAnimationFrame(renderNow); return; }
  const wait = Math.max(0, 80 - (Date.now() - lastRender));
  renderTimer = setTimeout(() => { renderFrame = requestAnimationFrame(renderNow); }, wait);
}

function renderNow() {
  lastRender = Date.now();
  renderFrame = null;
  renderTimer = null;
  const containerAlpha = state.backgroundMode === "transparent" ? state.containerOpacity / 100 : 1;
  const bubbleAlpha = state.bubbleOpacity / 100;
  dom.chatPreviewRoot.style.setProperty("--chat-container-bg", rgba(state.tokens.bg, containerAlpha));
  dom.chatPreviewRoot.style.setProperty("--chat-border-color", rgba(state.tokens.border, state.borderIntensity / 100));
  dom.chatPreviewRoot.style.setProperty("--chat-bubble-bg", rgba(state.tokens.bubble, bubbleAlpha));
  dom.chatPreviewRoot.style.setProperty("--chat-text", state.tokens.text);
  dom.chatPreviewRoot.style.setProperty("--chat-username", state.tokens.username);
  dom.chatPreviewRoot.style.setProperty("--chat-timestamp", state.tokens.timestamp);
  dom.chatPreviewRoot.style.setProperty("--chat-badge-bg", state.tokens.badgeBg);
  dom.chatPreviewRoot.style.setProperty("--chat-badge-text", state.tokens.badgeText);
  dom.chatPreviewRoot.style.setProperty("--chat-font-size", state.tokens.fontSize + "px");
  dom.chatPreviewRoot.style.setProperty("--chat-radius", state.tokens.radius + "px");
  dom.chatPreviewRoot.style.setProperty("--chat-padding", state.tokens.padding + "px");
  dom.chatPreviewRoot.style.setProperty("--chat-row-gap", state.tokens.gap + "px");
  dom.chatPreviewRoot.style.setProperty("--chat-align", state.align === "right" ? "flex-end" : state.align === "center" ? "center" : "flex-start");
  dom.chatPreviewRoot.style.setProperty("--chat-max-width", state.widthMode === "compact" ? "82%" : "100%");
  dom.chatPreviewRoot.style.setProperty("--chat-shadow", "rgba(0,0,0," + (state.shadowIntensity / 100).toFixed(2) + ")");
  dom.chatPreviewRoot.style.setProperty("--chat-blur", state.blurAmount + "px");
  dom.previewViewportFrame.classList.toggle("viewport-mobile", state.previewViewport === "mobile");
  dom.previewViewportFrame.classList.toggle("viewport-desktop", state.previewViewport !== "mobile");
  dom.containerOpacity.disabled = state.backgroundMode === "solid";

  dom.chatPreviewRoot.classList.toggle("show-avatars", state.showAvatars);
  dom.chatPreviewRoot.classList.toggle("hide-username", !state.showUsername);
  dom.chatPreviewRoot.classList.toggle("hide-timestamp", !state.showTimestamp);
  dom.chatPreviewRoot.classList.toggle("hide-badges", !state.showBadges);
  dom.chatPreviewRoot.classList.toggle("role-colors", state.showRoleColor);

  renderMessages();
  renderMeta();
  renderBlurSupport();
  applyCustomCss();
  updateContrast();
}

function renderMessages() {
  const arr = state.messages.slice(-MAX_MSG).slice(-clampInt(state.lineCount, 1, MAX_MSG, 4));
  const data = state.flow === "top" ? [...arr].reverse() : arr;
  dom.chatMessages.innerHTML = "";
  data.forEach((m) => {
    const msg = document.createElement("div");
    msg.className = "chat-message";
    msg.dataset.role = m.role || "viewer";
    const avatar = document.createElement("div"); avatar.className = "chat-avatar";
    const content = document.createElement("div"); content.className = "chat-message-content";
    const meta = document.createElement("div"); meta.className = "chat-meta";
    (m.badges || []).forEach((b) => { const s = document.createElement("span"); s.className = "chat-badge"; s.textContent = b; meta.appendChild(s); });
    const u = document.createElement("span"); u.className = "chat-username"; u.textContent = m.username; meta.appendChild(u);
    const t = document.createElement("span"); t.className = "chat-timestamp"; t.textContent = m.timestamp; meta.appendChild(t);
    const text = document.createElement("div"); text.className = "chat-text"; text.textContent = m.text;
    content.append(meta, text); msg.append(avatar, content); dom.chatMessages.appendChild(msg);
  });
}

function renderMeta() {
  dom.previewMeta.textContent = "Preset: " + PRESETS[state.presetId].label + " | Source: " + state.sourceId + " | View: " + state.previewViewport;
}

function renderBlurSupport() {
  const ok = CSS.supports("backdrop-filter", "blur(2px)") || CSS.supports("-webkit-backdrop-filter", "blur(2px)");
  if (!ok && state.blurAmount > 0) {
    dom.blurSupportStatus.textContent = "Blur support: unavailable, fallback = no blur.";
    dom.blurSupportStatus.className = "support-note warn";
  } else {
    dom.blurSupportStatus.textContent = ok ? "Blur support: available." : "Blur support: unavailable (0px).";
    dom.blurSupportStatus.className = ok ? "support-note ok" : "support-note";
  }
}

function applyCustomCss() {
  if (!state.customCssEnabled || !state.customCss.trim()) {
    customStyle.textContent = "";
    dom.cssValidation.textContent = "Custom CSS: not enabled.";
    dom.cssValidation.className = "note validation";
    return;
  }
  const v = validateCss(state.customCss);
  if (!v.ok) {
    customStyle.textContent = "";
    dom.cssValidation.textContent = "Custom CSS error: " + v.error;
    dom.cssValidation.className = "note validation error";
    return;
  }
  customStyle.textContent = scopeCss(state.customCss, CSS_SCOPE);
  dom.cssValidation.textContent = "Custom CSS: valid and scoped.";
  dom.cssValidation.className = "note validation ok";
}

function validateCss(txt) {
  if (/@import/i.test(txt)) return { ok: false, error: "@import is blocked." };
  if ((txt.match(/{/g) || []).length !== (txt.match(/}/g) || []).length) return { ok: false, error: "Unbalanced braces." };
  if (typeof CSSStyleSheet !== "undefined") {
    try { const s = new CSSStyleSheet(); s.replaceSync(scopeCss(txt, CSS_SCOPE)); } catch { return { ok: false, error: "Invalid syntax." }; }
  }
  return { ok: true };
}

function scopeCss(raw, scope) {
  if (!raw.includes("{")) return scope + " { " + raw + " }";
  return raw.replace(/(^|})\\s*([^{@}][^{]*)\\{/g, (_m, b, sel) => {
    const next = sel.split(",").map((s) => s.trim()).filter(Boolean).map((s) => (s.startsWith(scope) ? s : scope + " " + s)).join(", ");
    return b + " " + next + " {";
  });
}

function updateContrast() {
  const ratio = contrast(state.tokens.text, state.tokens.bubble);
  const ok = ratio >= 4.5;
  dom.contrastIndicator.textContent = ok ? "Contrast: OK" : "Contrast: Low";
  dom.contrastIndicator.className = "contrast-pill " + (ok ? "ok" : "low");
}

function updateModifiedFlag() {
  const base = PRESETS[state.presetId].t;
  const mod = Object.keys(base).some((k) => String(base[k]) !== String(state.tokens[k]));
  dom.modifiedFlag.textContent = mod ? "Modified" : "Base preset";
  dom.modifiedFlag.className = "modified-flag" + (mod ? " modified" : "");
}

function updateDirty() {
  const d = saved ? JSON.stringify(saved) !== JSON.stringify(snap()) : false;
  dom.unsavedIndicator.textContent = d ? "Unsaved changes" : "No unsaved changes";
  dom.unsavedIndicator.className = "unsaved-indicator " + (d ? "dirty" : "clean");
}

function snap() {
  return {
    sourceId: state.sourceId, lineCount: state.lineCount, sourceStatus: state.sourceStatus, lastMessageAt: state.lastMessageAt,
    showUsername: state.showUsername, showTimestamp: state.showTimestamp, showBadges: state.showBadges, showAvatars: state.showAvatars, showRoleColor: state.showRoleColor,
    flow: state.flow, align: state.align, widthMode: state.widthMode, previewViewport: state.previewViewport,
    presetId: state.presetId, backgroundMode: state.backgroundMode, containerOpacity: state.containerOpacity, bubbleOpacity: state.bubbleOpacity,
    borderIntensity: state.borderIntensity, shadowIntensity: state.shadowIntensity, blurAmount: state.blurAmount, customCssEnabled: state.customCssEnabled, customCss: state.customCss,
    tokens: { ...state.tokens },
    selectedTriggerId: state.selectedTriggerId,
    triggers: state.triggers.map((rule) => ({ ...rule }))
  };
}

function restore(s) {
  Object.assign(state, {
    sourceId: s.sourceId, lineCount: s.lineCount, sourceStatus: s.sourceStatus, lastMessageAt: s.lastMessageAt,
    showUsername: s.showUsername, showTimestamp: s.showTimestamp, showBadges: s.showBadges, showAvatars: s.showAvatars, showRoleColor: s.showRoleColor,
    flow: s.flow, align: s.align, widthMode: s.widthMode, previewViewport: s.previewViewport,
    presetId: s.presetId, backgroundMode: s.backgroundMode, containerOpacity: s.containerOpacity, bubbleOpacity: s.bubbleOpacity,
    borderIntensity: s.borderIntensity, shadowIntensity: s.shadowIntensity, blurAmount: s.blurAmount, customCssEnabled: s.customCssEnabled, customCss: s.customCss,
    tokens: { ...s.tokens },
    selectedTriggerId: s.selectedTriggerId,
    triggers: (s.triggers || []).map((rule) => ({ ...rule }))
  });
  renderPresetButtons();
  renderTriggerSummary();
}

function toCssVariables() {
  return [
    ".chat-preview-root {",
    "  --chat-container-bg: " + rgba(state.tokens.bg, state.containerOpacity / 100) + ";",
    "  --chat-border-color: " + rgba(state.tokens.border, state.borderIntensity / 100) + ";",
    "  --chat-bubble-bg: " + rgba(state.tokens.bubble, state.bubbleOpacity / 100) + ";",
    "  --chat-text: " + state.tokens.text + ";",
    "}"
  ].join("\\n");
}

function addRandomMsg() {
  const users = ["Nova", "Drew", "Chrono", "Warp", "Lurker", "ModCore"];
  const roles = ["viewer", "viewer", "vip", "viewer", "viewer", "mod"];
  const i = Math.floor(Math.random() * users.length);
  const role = roles[i];
  state.messages.push({
    username: users[i],
    text: RANDOM_TEXT[Math.floor(Math.random() * RANDOM_TEXT.length)],
    timestamp: timeNow(),
    badges: role === "mod" ? ["MOD"] : role === "vip" ? ["VIP"] : [],
    role
  });
  if (state.messages.length > 30) state.messages = state.messages.slice(-30);
}

function contrast(a, b) {
  const l = (hex) => {
    const rgb = hexToRgb(hex);
    const c = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
    return 0.2126 * c(rgb.r) + 0.7152 * c(rgb.g) + 0.0722 * c(rgb.b);
  };
  const l1 = l(a), l2 = l(b), hi = Math.max(l1, l2), lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

function hexToRgb(hex) {
  const v = String(hex || "").replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(v)) return { r: 0, g: 0, b: 0 };
  return { r: parseInt(v.slice(0, 2), 16), g: parseInt(v.slice(2, 4), 16), b: parseInt(v.slice(4, 6), 16) };
}

function rgba(hex, alpha) {
  const rgb = hexToRgb(hex);
  return "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + clamp(alpha, 0, 1).toFixed(2) + ")";
}

function clampInt(v, min, max, fb) {
  const n = Number.parseInt(String(v), 10);
  if (!Number.isFinite(n)) return fb;
  return Math.min(max, Math.max(min, n));
}

function clamp(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function timeNow() {
  const d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":");
}

function setStatus(msg) {
  dom.status.textContent = msg;
}
