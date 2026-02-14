const DEFAULT_CANVAS_STATE = {
  overlayName: "Main Stream Overlay",
  selectedElementName: "DonationAlertCard",
  selectedElementType: "text+image",
  sampleText: "Latest Donation: PlayerOne $10",
  sampleSubtext: "This is a dummy preview based on canvas state."
};

const INTENSITY_COUNT = {
  low: 18,
  medium: 34,
  high: 54
};

class EffectPreviewWindow {
  constructor(options) {
    this.mount = options.mount;
    this.onStatus = typeof options.onStatus === "function" ? options.onStatus : null;
    this.canvasState = { ...DEFAULT_CANVAS_STATE };
    this.effect = null;
    this.effectOptions = {};
    this.timers = new Set();
    this.effectDisposables = [];

    this.#build();
    this.#renderBaseScene();
  }

  setCanvasState(canvasState) {
    this.canvasState = {
      ...this.canvasState,
      ...(canvasState || {})
    };
    this.#renderBaseScene();
  }

  setEffect(effect, effectOptions) {
    this.effect = effect || null;
    this.effectOptions = { ...(effectOptions || {}) };
    this.#renderBaseScene();
    this.play(false);
  }

  updateOptions(effectOptions) {
    this.effectOptions = { ...(effectOptions || {}) };
    this.#renderBaseScene();
    this.play(false);
  }

  play(manual) {
    if (!this.effect) return;
    this.#clearEffectLayer();

    switch (this.effect.id) {
      case "core.effect.confetti":
        this.#runConfetti();
        break;
      case "core.effect.caption":
        this.#runCaption();
        break;
      case "core.effect.sound":
        this.#runSound(manual);
        break;
      case "core.effect.flash":
        this.#runFlash();
        break;
      case "core.effect.badge":
        this.#runBadge();
        break;
      default:
        break;
    }
  }

  #build() {
    const root = document.createElement("div");
    root.className = "window preview-window";
    root.innerHTML = [
      '<div class="title-bar">',
      '  <div class="title-bar-text">Effect Preview Window</div>',
      '  <div class="title-bar-controls">',
      '    <button aria-label="Minimize"></button>',
      '    <button aria-label="Maximize"></button>',
      '    <button aria-label="Close"></button>',
      "  </div>",
      "</div>",
      '<div class="window-body">',
      '  <div class="preview-toolbar">',
      '    <span class="label">Always rendering from current canvas snapshot</span>',
      "  </div>",
      '  <div class="preview-canvas" id="previewCanvas">',
      '    <div class="preview-canvas-grid"></div>',
      "  </div>",
      "</div>"
    ].join("");

    this.mount.appendChild(root);
    this.root = root;
    this.previewCanvas = root.querySelector("#previewCanvas");
  }

  #renderBaseScene() {
    if (!this.previewCanvas) return;

    this.#clearEffectLayer();

    this.previewCanvas.innerHTML = [
      '<div class="preview-canvas-grid"></div>',
      '<div class="preview-overlay-label"></div>',
      '<div class="preview-element-card">',
      '  <p class="preview-element-title"></p>',
      '  <p class="preview-element-subtitle"></p>',
      "</div>",
      '<div class="preview-fx-layer"></div>'
    ].join("");

    this.overlayLabel = this.previewCanvas.querySelector(".preview-overlay-label");
    this.elementTitle = this.previewCanvas.querySelector(".preview-element-title");
    this.elementSubtitle = this.previewCanvas.querySelector(".preview-element-subtitle");
    this.effectLayer = this.previewCanvas.querySelector(".preview-fx-layer");

    this.overlayLabel.textContent = "Overlay: " + this.canvasState.overlayName;
    this.elementTitle.textContent = this.canvasState.selectedElementName + " (" + this.canvasState.selectedElementType + ")";
    this.elementSubtitle.textContent = this.canvasState.sampleText + " | " + this.canvasState.sampleSubtext;
  }

  #clearEffectLayer() {
    if (this.effectDisposables.length > 0) {
      this.effectDisposables.forEach((fn) => {
        try { fn(); } catch (_err) { /* noop */ }
      });
      this.effectDisposables = [];
    }

    if (this.timers.size > 0) {
      this.timers.forEach((timerId) => clearTimeout(timerId));
      this.timers.clear();
    }

    if (this.effectLayer) {
      this.effectLayer.innerHTML = "";
    }
  }

  #setStatus(message) {
    if (this.onStatus) {
      this.onStatus(message);
    }
  }

  #runConfetti() {
    const intensity = (this.effectOptions.intensity || "medium").toLowerCase();
    const pieces = INTENSITY_COUNT[intensity] || INTENSITY_COUNT.medium;
    const duration = this.#num(this.effectOptions.durationMs, 1800);
    const palette = ["#ffdb4d", "#5ad8ff", "#ff7ad9", "#7dff97", "#ff7a7a"];

    for (let i = 0; i < pieces; i += 1) {
      const node = document.createElement("div");
      node.className = "fx-confetti-piece";
      node.style.left = Math.round(Math.random() * 100) + "%";
      node.style.background = palette[Math.floor(Math.random() * palette.length)];
      node.style.animationDuration = (800 + Math.random() * duration) + "ms";
      node.style.animationDelay = Math.round(Math.random() * 180) + "ms";
      node.style.transform = "rotate(" + Math.round(Math.random() * 360) + "deg)";
      this.effectLayer.appendChild(node);
    }

    this.#setStatus("Preview: Confetti Burst");
  }

  #runCaption() {
    const text = String(this.effectOptions.text || "Donation received!");
    const position = String(this.effectOptions.position || "bottom").toLowerCase();
    const duration = this.#num(this.effectOptions.durationMs, 2000);

    const caption = document.createElement("div");
    caption.className = "fx-caption " + (position === "top" || position === "center" ? position : "bottom");
    caption.textContent = text;
    this.effectLayer.appendChild(caption);

    const timer = setTimeout(() => {
      caption.remove();
    }, duration);
    this.timers.add(timer);
    this.#setStatus("Preview: Show Caption");
  }

  #runSound(manual) {
    const toneHz = this.#num(this.effectOptions.toneHz, 880);
    const durationMs = this.#num(this.effectOptions.durationMs, 600);
    const volume = this.#num(this.effectOptions.volume, 0.25);

    const meter = document.createElement("div");
    meter.className = "fx-sound-meter";
    for (let i = 0; i < 7; i += 1) {
      const bar = document.createElement("div");
      bar.className = "fx-sound-bar";
      bar.style.animationDelay = (i * 0.08) + "s";
      meter.appendChild(bar);
    }
    this.effectLayer.appendChild(meter);

    if (manual) {
      this.#playTone(toneHz, durationMs, volume);
    }

    const timer = setTimeout(() => {
      meter.remove();
    }, durationMs);
    this.timers.add(timer);
    this.#setStatus(manual ? "Preview: Play Sound (audio + visual)" : "Preview: Play Sound (visual meter)");
  }

  #runFlash() {
    const color = String(this.effectOptions.color || "#ffffff");
    const durationMs = this.#num(this.effectOptions.durationMs, 650);

    const flash = document.createElement("div");
    flash.className = "fx-flash";
    flash.style.background = color;
    flash.style.animationDuration = durationMs + "ms";
    this.effectLayer.appendChild(flash);
    this.#setStatus("Preview: Screen Flash");
  }

  #runBadge() {
    const label = String(this.effectOptions.label || "NEW!");
    const color = String(this.effectOptions.color || "#ffd95a");
    const durationMs = this.#num(this.effectOptions.durationMs, 1200);

    const badge = document.createElement("div");
    badge.className = "fx-badge";
    badge.textContent = label;
    badge.style.background = color;
    this.effectLayer.appendChild(badge);

    const timer = setTimeout(() => {
      badge.remove();
    }, durationMs);
    this.timers.add(timer);
    this.#setStatus("Preview: Badge Pop");
  }

  #playTone(frequencyHz, durationMs, volume) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      const ctx = new AudioContextClass();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = "triangle";
      oscillator.frequency.value = frequencyHz;
      gainNode.gain.value = Math.max(0, Math.min(1, volume));

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start();

      const stopTimer = setTimeout(() => {
        oscillator.stop();
        ctx.close();
      }, durationMs);
      this.timers.add(stopTimer);
      this.effectDisposables.push(() => {
        try { oscillator.stop(); } catch (_err) { /* noop */ }
        try { ctx.close(); } catch (_err) { /* noop */ }
      });
    } catch (_err) {
      this.#setStatus("Preview: audio unavailable in this browser context.");
    }
  }

  #num(value, fallback) {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return num;
  }
}

window.EffectPreviewWindow = EffectPreviewWindow;
