import { WF } from "@streamcraft/forms";
import type { FormChild } from "@streamcraft/forms/core";
import type { EffectTemplateDescriptor } from "../../types/triggers.types";

const OVERLAY_TOP_LEVEL_KEYS = new Set([
    "route",
    "command",
    "description",
    "includemetadata",
    "includepayload",
    "messagetypecategory",
    "messagetypename",
    "metadataoverrides",
    "data"
]);

const hasValue = (value: unknown): boolean => {
    if (value === null || typeof value === "undefined") return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
    return true;
};

const parseValue = (valueType: string, raw: string): unknown => {
    const kind = valueType.trim().toLowerCase();
    const trimmed = raw.trim();
    if (kind === "number" || kind === "int" || kind === "float" || kind === "double") {
        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : raw;
    }
    if (kind === "boolean" || kind === "bool") {
        if (trimmed.toLowerCase() === "true") return true;
        if (trimmed.toLowerCase() === "false") return false;
        return raw;
    }
    if (kind === "json") {
        try {
            return JSON.parse(trimmed);
        } catch {
            return raw;
        }
    }
    return raw;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const readNumber = (value: unknown, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const readString = (value: unknown, fallback: string) => {
    if (typeof value !== "string") return fallback;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
};

const createRandom = (seedValue: number) => {
    let seed = (seedValue >>> 0) || 1;
    return () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 0x100000000;
    };
};

const buildEffectLayer = (
    effectKindHint: string | null | undefined,
    options: Record<string, unknown>,
    previewTick: number
) => {
    const source = isRecord(options) ? options : {};
    const data = isRecord(source.data) ? source.data : {};
    const effectKind = readString(effectKindHint || source.command, "none").toLowerCase();

    if (effectKind === "confetti") {
        const intensity = readString(data.intensity, "medium").toLowerCase();
        const durationMs = readNumber(data.durationMs, 2200);
        const count = intensity === "low" ? 18 : intensity === "high" ? 54 : 34;
        const palette = ["#ffdb4d", "#5ad8ff", "#ff7ad9", "#7dff97", "#ff7a7a"];
        const random = createRandom(previewTick + count + durationMs);
        return Array.from({ length: count }).map((_, index) => WF.Element("div", {
            key: `ctx-confetti-${previewTick}-${index}`,
            className: "fx-confetti-piece",
            style: [
                `left: ${Math.round(random() * 100)}%;`,
                `background: ${palette[Math.floor(random() * palette.length)]};`,
                `animation-duration: ${Math.round(800 + random() * durationMs)}ms;`,
                `animation-delay: ${Math.round(random() * 200)}ms;`,
                `transform: rotate(${Math.round(random() * 360)}deg);`
            ].join(" ")
        }));
    }

    if (effectKind === "caption") {
        const text = readString(data.text, "Donation received!");
        const position = readString(data.position, "bottom").toLowerCase();
        const safePosition = position === "top" || position === "center" ? position : "bottom";
        return [
            WF.Element("div", {
                className: `fx-caption ${safePosition}`,
                key: `ctx-caption-${previewTick}`
            }, text)
        ];
    }

    if (effectKind === "sound") {
        return [
            WF.Element("div", { className: "fx-sound-meter", key: `ctx-sound-${previewTick}` },
                ...Array.from({ length: 7 }).map((_, index) => WF.Element("div", {
                    key: `ctx-sound-bar-${previewTick}-${index}`,
                    className: "fx-sound-bar",
                    style: `animation-delay: ${(index * 0.08).toFixed(2)}s;`
                }))
            )
        ];
    }

    if (effectKind === "flash") {
        const color = readString(data.color, "#ffffff");
        const durationMs = readNumber(data.durationMs, 650);
        return [
            WF.Element("div", {
                className: "fx-flash",
                key: `ctx-flash-${previewTick}`,
                style: `background: ${color}; animation-duration: ${durationMs}ms;`
            })
        ];
    }

    if (effectKind === "badge") {
        const label = readString(data.label, "NEW!");
        const color = readString(data.color, "#ffd95a");
        return [
            WF.Element("div", {
                className: "fx-badge",
                key: `ctx-badge-${previewTick}`,
                style: `background: ${color};`
            }, label)
        ];
    }

    return [
        WF.Element("div", { className: "effect-preview-empty", key: `ctx-none-${previewTick}` }, "No animation preview for this effect.")
    ];
};

export const renderEffectLayerNodes = (
    effectKindHint: string | null | undefined,
    options: Record<string, unknown>,
    previewTick: number
) => buildEffectLayer(effectKindHint, options, previewTick);

const normalizeOverlayConfiguration = (
    config: Record<string, unknown>,
    template: EffectTemplateDescriptor
): Record<string, unknown> => {
    if (template.effectFactoryTypeName !== "core.overlay") {
        return config;
    }

    const next = { ...config };
    if (!hasValue(next.route)) {
        next.route = "overlay";
    }

    const dataFromOptions: Record<string, unknown> = {};
    for (const option of template.options) {
        const key = option.key;
        if (OVERLAY_TOP_LEVEL_KEYS.has(key.toLowerCase())) {
            continue;
        }
        if (hasValue(next[key])) {
            dataFromOptions[key] = next[key];
        }
        delete next[key];
    }

    const existingData = next.data;
    const baseData = existingData && typeof existingData === "object" && !Array.isArray(existingData)
        ? { ...(existingData as Record<string, unknown>) }
        : {};
    const mergedData = { ...baseData, ...dataFromOptions };
    if (Object.keys(mergedData).length > 0) {
        next.data = mergedData;
    } else {
        delete next.data;
    }

    return next;
};

export const buildEffectPreviewConfiguration = (
    template: EffectTemplateDescriptor | null,
    payloadOverride?: { key?: string; value?: string | undefined } | null
): Record<string, unknown> => {
    if (!template) return {};

    const config: Record<string, unknown> = {};
    for (const option of template.options) {
        if (typeof option.defaultValue !== "undefined") {
            config[option.key] = option.defaultValue;
        }
    }

    if (payloadOverride?.key && typeof payloadOverride.value === "string" && payloadOverride.value.trim().length > 0) {
        const option = template.options.find((entry) => entry.key === payloadOverride.key);
        const optionType = option?.valueType ?? "string";
        config[payloadOverride.key] = parseValue(optionType, payloadOverride.value);
    }

    return normalizeOverlayConfiguration(config, template);
};

type TriggerEffectPreviewProps = {
    header: string;
    title?: string | null;
    subtitle?: string | null;
    status?: string | null;
    effectKind?: string | null;
    previewTick?: number;
    overlayNodes?: FormChild[];
    showRawJson?: boolean;
    onReplay?: (() => void) | null;
    configuration: Record<string, unknown>;
    emptyNote?: string;
};

export const renderTriggerEffectPreview = ({
    header,
    title,
    subtitle,
    status,
    effectKind,
    previewTick = 0,
    overlayNodes = [],
    showRawJson = false,
    onReplay = null,
    configuration,
    emptyNote = "No effect selected."
}: TriggerEffectPreviewProps) =>
    WF.Element("div", { className: "context-window-section trigger-context-preview-layout" },
        WF.Element("div", { className: "trigger-context-preview-toolbar" },
            WF.Element("div", { className: "context-window-section-title" }, header),
            onReplay
                ? WF.Element("button", { className: "button", onClick: onReplay }, "Replay")
                : null
        ),
        title
            ? WF.Element("div", { className: "context-window-title" }, title)
            : WF.Element("div", { className: "context-window-note" }, emptyNote),
        subtitle ? WF.Element("div", { className: "context-window-note" }, subtitle) : null,
        WF.Element("div", { className: "effect-preview-canvas trigger-context-preview-canvas" },
            WF.Element("div", { className: "effect-preview-grid" }),
            WF.Element("div", { className: "effect-preview-items" }, ...overlayNodes),
            WF.Element("div", { className: "effect-preview-fx" }, ...renderEffectLayerNodes(effectKind, configuration, previewTick))
        ),
        showRawJson
            ? WF.Element("pre", { className: "trigger-context-preview-json" }, JSON.stringify(configuration, null, 2))
            : null,
        status ? WF.Element("div", { className: "context-window-note" }, status) : null
    );
