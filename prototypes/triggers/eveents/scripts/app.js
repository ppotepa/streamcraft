const CHAT_TRIGGER_TEMPLATES = [
  trigger("chat_message_received", "Chat Message Received", "chat", "chat.message", "always", "", "Every incoming chat message.", "comicPogPop", null),
  trigger("chat_message_contains", "Chat Message Contains", "chat", "chat.message", "contains", "pog", "Message contains keyword.", "comicPogPop", "Keyword"),
  trigger("chat_command_used", "Chat Command Used", "chat", "chat.message", "startsWith", "!", "Message starts with command prefix.", "captionBanner", "Command"),
  trigger("first_message_from_user", "First Message From User", "chat", "chat.firstMessage", "always", "", "First message by chatter.", "bigUsernameCallout", null),
  trigger("tts_chat_message", "TTS Chat Message", "chat", "chat.message", "startsWith", "!tts", "Message starts with TTS prefix.", "ttsSpeakMessage", "TTS Prefix"),
  trigger("moderator_action", "Moderator Action", "moderation", "moderation.action", "equals", "timeout", "Timeout/ban/delete moderation event.", "chatBubbleSpotlight", "Action"),
  trigger("subscriber_message_received", "Subscriber Message Received", "community", "chat.message.subscriber", "always", "", "Subscriber chat message.", "confettiBurst", null),
  trigger("vip_message_received", "VIP Message Received", "community", "chat.message.vip", "always", "", "VIP chat message.", "glowPulseBorder", null),
  trigger("chat_message_has_mention", "Chat Message Has Mention", "chat", "chat.message", "contains", "@", "Chat message mentions someone.", "captionBanner", "Mention token"),
  trigger("chat_message_has_link", "chat message has link", "chat", "chat.message", "contains", "http", "Chat message contains link.", "screenFlash", "Link token"),
  trigger("chat_message_caps", "Chat Message Is CAPS", "chat", "chat.message", "caps", "", "Message is mostly uppercase.", "shakeScreen", null),
  trigger("chat_message_emote", "Chat Message Has Emote", "chat", "chat.message", "contains", ":pog:", "Message contains emote code.", "emojiExplosion", "Emote code"),
  trigger("chat_question", "Chat Question Received", "chat", "chat.message", "contains", "?", "Message contains question mark.", "typewriterCaption", "Question token"),
  trigger("chat_positive", "Positive Chat Message", "chat", "chat.message", "containsAny", "gg, nice, awesome", "Positive sentiment keyword.", "heartsRain", "Keywords (comma separated)"),
  trigger("chat_negative", "Negative Chat Message", "chat", "chat.message", "containsAny", "bad, hate, trash", "Negative sentiment keyword.", "screenFlash", "Keywords (comma separated)")
];

const CHAT_EFFECT_TEMPLATES = [
  effect("comicPogPop", "Comic POG Pop", "comics", "POG sticker pops and fades.", "POG!"),
  effect("comicWowBurst", "Comic WOW Burst", "comics", "Comic WOW card bursts.", "WOW!"),
  effect("confettiBurst", "Confetti Burst", "celebration", "Confetti spray effect.", "Confetti!"),
  effect("heartsRain", "Hearts Rain", "celebration", "Hearts falling animation.", "Love!"),
  effect("emojiExplosion", "Emoji Explosion", "celebration", "Emoji burst effect.", "🔥🔥🔥"),
  effect("captionBanner", "Caption Banner", "text", "Banner caption overlay.", "New event!"),
  effect("typewriterCaption", "Typewriter Caption", "text", "Typewriter style caption.", "Typing..."),
  effect("bigUsernameCallout", "Big Username Callout", "text", "Large username callout.", "@Viewer"),
  effect("chatBubbleSpotlight", "Chat Bubble Spotlight", "chatVisual", "Highlights one chat bubble.", "Highlighted chat"),
  effect("screenFlash", "Screen Flash", "visual", "Quick flash overlay.", "Flash"),
  effect("shakeScreen", "Shake Screen", "visual", "Brief camera shake.", "Shake"),
  effect("glowPulseBorder", "Glow Pulse Border", "visual", "Border glow pulse.", "Glow"),
  effect("playSfxDing", "Play SFX Ding", "audio", "Ding sound cue.", "ding.wav"),
  effect("playSfxAirhorn", "Play SFX Airhorn", "audio", "Airhorn sound cue.", "airhorn.wav"),
  effect("ttsSpeakMessage", "TTS Speak Message", "audio", "Reads message via TTS.", "Text-to-speech")
];

const state = {
  triggerCategory: "all",
  effectCategory: "all",
  selectedTriggerId: CHAT_TRIGGER_TEMPLATES[0].id,
  selectedEffectId: CHAT_EFFECT_TEMPLATES[0].id,
  activeRules: [],
  lastTriggerAt: new Map()
};

const dom = {
  triggerCategoryFilter: byId("triggerCategoryFilter"),
  effectCategoryFilter: byId("effectCategoryFilter"),
  triggerTemplateList: byId("triggerTemplateList"),
  effectTemplateList: byId("effectTemplateList"),
  triggerValueLabel: byId("triggerValueLabel"),
  triggerValue: byId("triggerValue"),
  effectPayloadLabel: byId("effectPayloadLabel"),
  effectPayload: byId("effectPayload"),
  cooldown: byId("cooldown"),
  ruleSentence: byId("ruleSentence"),
  testRuleBtn: byId("testRuleBtn"),
  addRuleBtn: byId("addRuleBtn"),
  simulateRandomBtn: byId("simulateRandomBtn"),
  effectPreview: byId("effectPreview"),
  activeRules: byId("activeRules"),
  eventLog: byId("eventLog")
};

init();

function init() {
  bindEvents();
  syncEditorsFromSelection();
  renderTriggerList();
  renderEffectList();
  renderRules();
  updateRuleSentence();
  logEvent("Chat explorer ready. Select trigger and effect, then add rule.");
}

function bindEvents() {
  dom.triggerCategoryFilter.addEventListener("change", () => {
    state.triggerCategory = dom.triggerCategoryFilter.value;
    renderTriggerList();
  });

  dom.effectCategoryFilter.addEventListener("change", () => {
    state.effectCategory = dom.effectCategoryFilter.value;
    renderEffectList();
  });

  dom.triggerValue.addEventListener("input", updateRuleSentence);
  dom.effectPayload.addEventListener("input", updateRuleSentence);
  dom.cooldown.addEventListener("input", updateRuleSentence);

  dom.testRuleBtn.addEventListener("click", () => {
    const draft = readDraftRule();
    const event = createMatchingEvent(draft);
    logEvent("Test event: " + describeEvent(event));
    if (matchesRule(draft, event)) {
      renderEffect(draft.effectId, draft.effectPayload || "Preview");
      logEvent("Rule matched: " + draft.triggerName + " -> " + draft.effectName);
    } else {
      renderEffect(null, "Rule did not match test event.");
      logEvent("Rule did not match.");
    }
  });

  dom.addRuleBtn.addEventListener("click", () => {
    const draft = readDraftRule();
    draft.id = "rule-" + Date.now();
    state.activeRules.push(draft);
    renderRules();
    logEvent("Added rule: " + draft.triggerName + " -> " + draft.effectName);
  });

  dom.simulateRandomBtn.addEventListener("click", () => {
    const event = randomChatEvent();
    logEvent("Random event: " + describeEvent(event));
    evaluateActiveRules(event);
  });
}

function renderTriggerList() {
  const triggers = CHAT_TRIGGER_TEMPLATES.filter((item) => state.triggerCategory === "all" || item.category === state.triggerCategory);
  dom.triggerTemplateList.innerHTML = "";

  if (triggers.length === 0) {
    dom.triggerTemplateList.appendChild(textNode("No triggers in this category."));
    return;
  }

  for (const item of triggers) {
    const card = document.createElement("div");
    card.className = "template-item" + (item.id === state.selectedTriggerId ? " is-selected" : "");

    const title = document.createElement("div");
    title.className = "template-title";
    title.textContent = item.name;

    const pill = document.createElement("span");
    pill.className = "template-pill";
    pill.textContent = item.category;

    const meta = document.createElement("div");
    meta.className = "template-meta";
    meta.textContent = item.summary;

    const actions = document.createElement("div");
    actions.className = "template-actions";

    const selectBtn = document.createElement("button");
    selectBtn.textContent = "Select";
    selectBtn.addEventListener("click", () => {
      state.selectedTriggerId = item.id;
      syncEditorsFromSelection();
      renderTriggerList();
      updateRuleSentence();
    });

    const autoBtn = document.createElement("button");
    autoBtn.textContent = "Select + Suggested Effect";
    autoBtn.addEventListener("click", () => {
      state.selectedTriggerId = item.id;
      state.selectedEffectId = item.suggestedEffectId;
      syncEditorsFromSelection();
      renderTriggerList();
      renderEffectList();
      updateRuleSentence();
    });

    actions.appendChild(selectBtn);
    actions.appendChild(autoBtn);

    card.appendChild(title);
    card.appendChild(pill);
    card.appendChild(meta);
    card.appendChild(actions);
    dom.triggerTemplateList.appendChild(card);
  }
}

function renderEffectList() {
  const effects = CHAT_EFFECT_TEMPLATES.filter((item) => state.effectCategory === "all" || item.category === state.effectCategory);
  dom.effectTemplateList.innerHTML = "";

  if (effects.length === 0) {
    dom.effectTemplateList.appendChild(textNode("No effects in this category."));
    return;
  }

  for (const item of effects) {
    const card = document.createElement("div");
    card.className = "template-item" + (item.id === state.selectedEffectId ? " is-selected" : "");

    const title = document.createElement("div");
    title.className = "template-title";
    title.textContent = item.name;

    const pill = document.createElement("span");
    pill.className = "template-pill";
    pill.textContent = item.category;

    const meta = document.createElement("div");
    meta.className = "template-meta";
    meta.textContent = item.summary;

    const actions = document.createElement("div");
    actions.className = "template-actions";

    const selectBtn = document.createElement("button");
    selectBtn.textContent = "Select";
    selectBtn.addEventListener("click", () => {
      state.selectedEffectId = item.id;
      syncEditorsFromSelection();
      renderEffectList();
      updateRuleSentence();
      renderEffect(item.id, "Template selected: " + item.name);
    });

    actions.appendChild(selectBtn);
    card.appendChild(title);
    card.appendChild(pill);
    card.appendChild(meta);
    card.appendChild(actions);
    dom.effectTemplateList.appendChild(card);
  }
}

function syncEditorsFromSelection() {
  const trigger = selectedTrigger();
  const effect = selectedEffect();

  const hasTriggerValue = trigger.valueLabel !== null;
  dom.triggerValueLabel.textContent = trigger.valueLabel || "Trigger value";
  dom.triggerValue.value = hasTriggerValue ? trigger.defaultValue : "";
  dom.triggerValue.disabled = !hasTriggerValue;

  dom.effectPayloadLabel.textContent = "Effect text";
  dom.effectPayload.value = effect.defaultPayload;
}

function readDraftRule() {
  const trigger = selectedTrigger();
  const effect = selectedEffect();
  return {
    id: "",
    triggerId: trigger.id,
    triggerName: trigger.name,
    eventType: trigger.eventType,
    op: trigger.op,
    triggerValue: dom.triggerValue.value.trim(),
    effectId: effect.id,
    effectName: effect.name,
    effectPayload: dom.effectPayload.value.trim(),
    cooldownSec: clampInt(dom.cooldown.value, 0, 120, 0)
  };
}

function updateRuleSentence() {
  const rule = readDraftRule();
  const ifPart = formatIfPart(rule);
  const payloadPart = rule.effectPayload ? " with \"" + rule.effectPayload + "\"" : "";
  dom.ruleSentence.textContent = "When " + rule.triggerName + ifPart + ", then show " + rule.effectName + payloadPart + ". Cooldown " + rule.cooldownSec + "s.";
}

function renderRules() {
  dom.activeRules.innerHTML = "";
  if (state.activeRules.length === 0) {
    dom.activeRules.appendChild(textNode("No active chat rules."));
    return;
  }

  for (const rule of state.activeRules) {
    const li = document.createElement("li");
    const sentence = "When " + rule.triggerName + formatIfPart(rule) + " -> " + rule.effectName;
    li.textContent = sentence;
    dom.activeRules.appendChild(li);
  }
}

function evaluateActiveRules(event) {
  let matched = false;
  for (const rule of state.activeRules) {
    if (rule.eventType !== event.type) continue;
    if (!matchesRule(rule, event)) continue;

    if (isCooldown(rule)) {
      logEvent("Cooldown: " + rule.triggerName);
      continue;
    }

    state.lastTriggerAt.set(rule.id, Date.now());
    renderEffect(rule.effectId, rule.effectPayload || rule.effectName);
    logEvent("Triggered: " + rule.triggerName + " -> " + rule.effectName);
    matched = true;
  }

  if (!matched) {
    renderEffect(null, "No active rule matched this event.");
  }
}

function matchesRule(rule, event) {
  const val = String(rule.triggerValue || "").toLowerCase();
  const text = String(event.text || "").toLowerCase();

  switch (rule.op) {
    case "always":
      return true;
    case "contains":
      return text.includes(val);
    case "startsWith":
      return text.startsWith(val);
    case "equals":
      return (String(event.action || "").toLowerCase() === val) || (text === val);
    case "containsAny":
      return val.split(",").map((s) => s.trim()).filter(Boolean).some((token) => text.includes(token));
    case "caps":
      return isMostlyCaps(text);
    default:
      return false;
  }
}

function createMatchingEvent(rule) {
  switch (rule.eventType) {
    case "chat.message":
      if (rule.op === "startsWith") return { type: "chat.message", text: (rule.triggerValue || "!cmd") + " now" };
      if (rule.op === "contains") return { type: "chat.message", text: "this contains " + (rule.triggerValue || "token") };
      if (rule.op === "containsAny") return { type: "chat.message", text: firstToken(rule.triggerValue) + " sample" };
      if (rule.op === "caps") return { type: "chat.message", text: "THIS IS BIG" };
      return { type: "chat.message", text: "hello chat" };
    case "chat.firstMessage":
      return { type: "chat.firstMessage", text: "hello first time" };
    case "moderation.action":
      return { type: "moderation.action", action: rule.triggerValue || "timeout" };
    case "chat.message.subscriber":
      return { type: "chat.message.subscriber", text: "sub hello" };
    case "chat.message.vip":
      return { type: "chat.message.vip", text: "vip here" };
    default:
      return { type: rule.eventType };
  }
}

function randomChatEvent() {
  const samples = [
    { type: "chat.message", text: "pog this round" },
    { type: "chat.message", text: "!help me" },
    { type: "chat.message", text: "!tts welcome all" },
    { type: "chat.message", text: "THIS IS WILD" },
    { type: "chat.message", text: "awesome play gg" },
    { type: "chat.message", text: "http://example.com clip" },
    { type: "chat.firstMessage", text: "hello everyone" },
    { type: "moderation.action", action: "timeout" },
    { type: "chat.message.subscriber", text: "lets go subs" },
    { type: "chat.message.vip", text: "vip check in" }
  ];
  return samples[Math.floor(Math.random() * samples.length)];
}

function renderEffect(effectId, message) {
  dom.effectPreview.innerHTML = "";

  if (!effectId) {
    const empty = document.createElement("div");
    empty.className = "preview-placeholder";
    empty.textContent = message;
    dom.effectPreview.appendChild(empty);
    return;
  }

  const effect = getById(CHAT_EFFECT_TEMPLATES, effectId);
  const box = document.createElement("div");
  box.className = "preview-effect effect-" + effect.id;

  const title = document.createElement("strong");
  title.textContent = "Effect: " + effect.name;

  const desc = document.createElement("div");
  desc.textContent = message || effect.defaultPayload;

  box.appendChild(title);
  box.appendChild(document.createElement("br"));
  box.appendChild(desc);
  dom.effectPreview.appendChild(box);
}

function isCooldown(rule) {
  const last = state.lastTriggerAt.get(rule.id);
  if (!last) return false;
  return (Date.now() - last) / 1000 < rule.cooldownSec;
}

function logEvent(message) {
  const li = document.createElement("li");
  li.textContent = "[" + new Date().toLocaleTimeString() + "] " + message;
  dom.eventLog.prepend(li);
  while (dom.eventLog.childElementCount > 24) {
    dom.eventLog.removeChild(dom.eventLog.lastElementChild);
  }
}

function selectedTrigger() {
  return getById(CHAT_TRIGGER_TEMPLATES, state.selectedTriggerId);
}

function selectedEffect() {
  return getById(CHAT_EFFECT_TEMPLATES, state.selectedEffectId);
}

function getById(list, id) {
  return list.find((entry) => entry.id === id) || list[0];
}

function formatIfPart(rule) {
  if (rule.op === "always") return "";
  if (!rule.triggerValue) return "";
  return " where value " + rule.op + " \"" + rule.triggerValue + "\"";
}

function isMostlyCaps(text) {
  const letters = text.replace(/[^a-z]/gi, "");
  if (letters.length < 4) return false;
  const upper = letters.replace(/[^A-Z]/g, "");
  return upper.length / letters.length >= 0.7;
}

function firstToken(csv) {
  return String(csv || "").split(",").map((s) => s.trim()).find(Boolean) || "token";
}

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function textNode(text) {
  const p = document.createElement("p");
  p.className = "template-meta";
  p.textContent = text;
  return p;
}

function trigger(id, name, category, eventType, op, defaultValue, summary, suggestedEffectId, valueLabel) {
  return { id, name, category, eventType, op, defaultValue, summary, suggestedEffectId, valueLabel };
}

function effect(id, name, category, summary, defaultPayload) {
  return { id, name, category, summary, defaultPayload };
}

function byId(id) {
  return document.getElementById(id);
}

