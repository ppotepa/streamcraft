import { WF } from "@streamcraft/forms";
import { type FormChild } from "@streamcraft/forms/core";

export interface EffectPreviewDialogProps {
    overlayNodes: FormChild[];
    overlayName: string;
    targetLabel: string;
    effectName: string;
    effectKind: string;
    options: Record<string, unknown> | null;
    previewTick: number;
}

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

const buildEffectLayer = (props: EffectPreviewDialogProps) => {
    const source = isRecord(props.options) ? props.options : {};
    const data = isRecord(source.data) ? source.data : {};
    const effectKind = readString(props.effectKind || source.command, "none").toLowerCase();

    if (effectKind === "confetti") {
        const intensity = readString(data.intensity, "medium").toLowerCase();
        const durationMs = readNumber(data.durationMs, 2200);
        const count = intensity === "low" ? 18 : intensity === "high" ? 54 : 34;
        const palette = ["#ffdb4d", "#5ad8ff", "#ff7ad9", "#7dff97", "#ff7a7a"];
        const random = createRandom(props.previewTick + count + durationMs);
        return Array.from({ length: count }).map((_, index) => WF.Element("div", {
            key: `confetti-${props.previewTick}-${index}`,
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
                key: `caption-${props.previewTick}`
            }, text)
        ];
    }

    if (effectKind === "sound") {
        return [
            WF.Element("div", { className: "fx-sound-meter", key: `sound-${props.previewTick}` },
                ...Array.from({ length: 7 }).map((_, index) => WF.Element("div", {
                    key: `sound-bar-${props.previewTick}-${index}`,
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
                key: `flash-${props.previewTick}`,
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
                key: `badge-${props.previewTick}`,
                style: `background: ${color};`
            }, label)
        ];
    }

    return [
        WF.Element("div", { className: "effect-preview-empty", key: `none-${props.previewTick}` }, "No preview available for this effect type.")
    ];
};

export const buildEffectPreviewDialog = (props: EffectPreviewDialogProps) => {
    const effectLayerNodes = buildEffectLayer(props);

    return WF.Window(
        {
            Text: "Effect Preview",
            Dialog: true,
            Draggable: true,
            OnClose: "closeEffectsCatalog",
            ClassName: "window-resizable effect-preview-window",
            Style: "position: absolute; left: 760px; top: 120px; width: min(640px, 92vw); height: min(470px, 74vh);"
        },
        WF.Element("div", { className: "effect-preview-shell" },
            WF.Element("div", { className: "effect-preview-toolbar" },
                WF.Element("span", { className: "effect-preview-meta" }, `Overlay: ${props.overlayName || "Current overlay"}`),
                WF.Element("span", { className: "effect-preview-meta" }, `Target: ${props.targetLabel || "Selected element"}`),
                WF.Element("span", { className: "effect-preview-meta" }, `Effect: ${props.effectName || "None"}`)
            ),
            WF.Element("div", { className: "effect-preview-canvas" },
                WF.Element("div", { className: "effect-preview-grid" }),
                WF.Element("div", { className: "effect-preview-items" }, ...props.overlayNodes),
                WF.Element("div", { className: "effect-preview-fx" }, ...effectLayerNodes)
            )
        )
    );
};
