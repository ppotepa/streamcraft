import { WF, element, type FormNode } from "@streamcraft/forms";
import { formContainerRef } from "@streamcraft/forms/core";
import { type CanvasItem } from "../domain/types";

interface ContextBarProps {
    selectedItem: CanvasItem | null;
    onUpdateItem: (id: string, updates: Partial<CanvasItem>) => void;
    onShowTextStyleEditor: () => void;
    onShowContextWindow: () => void;
    onShowDataSourceExplorer: () => void;
    canUndo: boolean;
    canRedo: boolean;
    textEffectsExtensions: FormNode[];
    canBind: boolean;
    hasBinding: boolean;
    scheduleIntervalMs: number;
    UiText: any;
}

export const buildContextBarNode = (props: ContextBarProps) => {
    const {
        selectedItem,
        onUpdateItem,
        onShowTextStyleEditor,
        onShowContextWindow,
        onShowDataSourceExplorer,
        canUndo,
        canRedo,
        textEffectsExtensions,
        canBind,
        hasBinding,
        scheduleIntervalMs,
        UiText
    } = props;

    const formatInterval = (value: number) => {
        if (!value || value <= 0) return "Off";
        if (value < 1000) return `${value}ms`;
        if (value < 60000) {
            const seconds = value / 1000;
            return `${Number.isInteger(seconds) ? seconds.toFixed(0) : seconds.toFixed(1)}s`;
        }
        const minutes = Math.round((value / 60000) * 10) / 10;
        return `${minutes}m`;
    };

    const contextSeparator = () => WF.Element("div", { className: "context-bar-separator" });
    const contextField = (label: string, control: any) => WF.Element(
        "div",
        { className: "context-bar-field" },
        WF.Element("span", { className: "context-bar-label" }, label),
        control
    );
    const normalizeColorValue = (value: string | undefined, fallback: string) =>
        value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;

    const contextBarCenter: FormNode[] = [];

    if (selectedItem) {
        const textContextTarget = selectedItem.type === "text" ? selectedItem : null;
        const textFontFamily = textContextTarget?.fontFamily ?? UiText.desktop.options.fonts[0] ?? "Segoe UI";
        const textFontSize = textContextTarget?.fontSize ?? 16;
        const textFontWeight = textContextTarget?.fontWeight ?? "normal";
        const textFontStyle = textContextTarget?.fontStyle ?? "normal";
        const textTransform = textContextTarget?.textTransform ?? "none";
        const textColor = textContextTarget?.textColor ?? "#222222";
        const textLetterSpacing = textContextTarget?.letterSpacing ?? 0;
        const isBold = textFontWeight === "bold" || (Number.parseInt(String(textFontWeight), 10) || 0) >= 600;
        const isItalic = textFontStyle === "italic";

        contextBarCenter.push(
            contextField("Name", element("input", {
                className: "textbox context-bar-input",
                type: "text",
                style: "width: 140px;",
                value: selectedItem.name ?? "",
                onChange: (event: any) => onUpdateItem(selectedItem.id, { name: event.target.value })
            })),
            contextField("X", element("input", {
                className: "textbox context-bar-input",
                type: "number",
                style: "width: 64px;",
                value: selectedItem.x,
                onChange: (event: any) => onUpdateItem(selectedItem.id, { x: Number(event.target.value) || 0 })
            })),
            contextField("Y", element("input", {
                className: "textbox context-bar-input",
                type: "number",
                style: "width: 64px;",
                value: selectedItem.y,
                onChange: (event: any) => onUpdateItem(selectedItem.id, { y: Number(event.target.value) || 0 })
            })),
            contextField("W", element("input", {
                className: "textbox context-bar-input",
                type: "number",
                style: "width: 64px;",
                value: selectedItem.width,
                onChange: (event: any) => onUpdateItem(selectedItem.id, { width: Math.max(2, Number(event.target.value) || 0) })
            })),
            contextField("H", element("input", {
                className: "textbox context-bar-input",
                type: "number",
                style: "width: 64px;",
                value: selectedItem.height,
                onChange: (event: any) => {
                    const nextHeight = Math.max(2, Number(event.target.value) || 0);
                    if (selectedItem.type === "line") {
                        onUpdateItem(selectedItem.id, { height: nextHeight, strokeWidth: nextHeight });
                    } else {
                        onUpdateItem(selectedItem.id, { height: nextHeight });
                    }
                }
            }))
        );

        if (selectedItem.type === "text") {
            contextBarCenter.push(
                contextSeparator(),
                contextField("Text", element("input", {
                    className: "textbox context-bar-input",
                    type: "text",
                    style: "width: 180px;",
                    value: selectedItem.label ?? "",
                    onChange: (event: any) => onUpdateItem(selectedItem.id, { label: event.target.value })
                })),
                contextField("Font", element(
                    "select",
                    {
                        className: "textbox context-bar-input",
                        style: "width: 150px;",
                        value: textFontFamily,
                        onChange: (event: any) => {
                            if (!textContextTarget) return;
                            onUpdateItem(textContextTarget.id, { fontFamily: event.target.value });
                        }
                    },
                    ...(UiText.desktop.options.fonts || []).map((font: string) => element("option", { key: font, value: font }, font))
                )),
                contextField("Size", element("input", {
                    className: "textbox context-bar-input",
                    type: "number",
                    min: 6,
                    max: 200,
                    style: "width: 64px;",
                    value: textFontSize,
                    onChange: (event: any) => {
                        if (!textContextTarget) return;
                        onUpdateItem(textContextTarget.id, { fontSize: Number(event.target.value) || 1 });
                    }
                })),
                element(
                    "button",
                    {
                        className: `button context-bar-button ${isBold ? "is-active" : ""}`,
                        type: "button",
                        onClick: () => {
                            if (!textContextTarget) return;
                            onUpdateItem(textContextTarget.id, { fontWeight: isBold ? "normal" : "700" });
                        }
                    },
                    "B"
                ),
                element(
                    "button",
                    {
                        className: `button context-bar-button ${isItalic ? "is-active" : ""}`,
                        type: "button",
                        onClick: () => {
                            if (!textContextTarget) return;
                            onUpdateItem(textContextTarget.id, { fontStyle: isItalic ? "normal" : "italic" });
                        }
                    },
                    "I"
                ),
                contextField("Case", element(
                    "select",
                    {
                        className: "textbox context-bar-input",
                        style: "width: 110px;",
                        value: textTransform,
                        onChange: (event: any) => {
                            if (!textContextTarget) return;
                            onUpdateItem(textContextTarget.id, { textTransform: event.target.value as "none" | "uppercase" | "lowercase" });
                        }
                    },
                    ...(UiText.desktop.options.transforms || []).map((transform: string) =>
                        element("option", { key: transform, value: transform }, transform)
                    )
                )),
                contextField("Color", element("input", {
                    className: "context-bar-input",
                    type: "color",
                    value: textColor,
                    onChange: (event: any) => {
                        if (!textContextTarget) return;
                        onUpdateItem(textContextTarget.id, { textColor: event.target.value });
                    }
                })),
                contextField("Spacing", element("input", {
                    className: "textbox context-bar-input",
                    type: "number",
                    min: -2,
                    max: 12,
                    step: 0.5,
                    style: "width: 64px;",
                    value: textLetterSpacing,
                    onChange: (event: any) => {
                        if (!textContextTarget) return;
                        onUpdateItem(textContextTarget.id, { letterSpacing: Number(event.target.value) || 0 });
                    }
                })),
                element(
                    "button",
                    {
                        className: "button context-bar-button",
                        type: "button",
                        onClick: () => onShowTextStyleEditor()
                    },
                    UiText.desktop.buttons.effects
                ),
                ...textEffectsExtensions
            );
        }

        if (selectedItem.type === "chat") {
            contextBarCenter.push(
                contextSeparator(),
                WF.Element("span", { className: "context-bar-label" }, "Chat"),
                WF.Element(
                    "span",
                    { className: "context-bar-label" },
                    selectedItem.workerEnabled ? "Worker: ON" : "Worker: OFF"
                )
            );
        }

        if (selectedItem.type === "image") {
            contextBarCenter.push(
                contextSeparator(),
                contextField("Image", element("input", {
                    className: "textbox context-bar-input",
                    type: "text",
                    style: "width: 220px;",
                    value: selectedItem.src ?? "",
                    onChange: (event: any) => onUpdateItem(selectedItem.id, { src: event.target.value })
                }))
            );
        }

        if (selectedItem.type === "progress") {
            contextBarCenter.push(
                contextSeparator(),
                contextField("Value", element("input", {
                    className: "textbox context-bar-input",
                    type: "number",
                    style: "width: 64px;",
                    value: selectedItem.value ?? 0,
                    onChange: (event: any) => onUpdateItem(selectedItem.id, { value: Number(event.target.value) || 0 })
                })),
                contextField("Min", element("input", {
                    className: "textbox context-bar-input",
                    type: "number",
                    style: "width: 64px;",
                    value: selectedItem.minimum ?? 0,
                    onChange: (event: any) => onUpdateItem(selectedItem.id, { minimum: Number(event.target.value) || 0 })
                })),
                contextField("Max", element("input", {
                    className: "textbox context-bar-input",
                    type: "number",
                    style: "width: 64px;",
                    value: selectedItem.maximum ?? 100,
                    onChange: (event: any) => onUpdateItem(selectedItem.id, { maximum: Number(event.target.value) || 100 })
                })),
                contextField("Style", element(
                    "select",
                    {
                        className: "textbox context-bar-input",
                        style: "width: 110px;",
                        value: selectedItem.progressStyle ?? "blocks",
                        onChange: (event: any) => onUpdateItem(selectedItem.id, { progressStyle: event.target.value as "blocks" | "continuous" })
                    },
                    ...(UiText.desktop.options.progressStyles || []).map((option: any) =>
                        element("option", { value: option.value }, option.label)
                    )
                ))
            );
        }

        if (selectedItem.type === "rect" || selectedItem.type === "ellipse" || selectedItem.type === "line") {
            contextBarCenter.push(contextSeparator());
            if (selectedItem.type !== "line") {
                contextBarCenter.push(contextField("Fill", WF.Element("input", {
                    className: "context-bar-input",
                    type: "color",
                    value: normalizeColorValue(selectedItem.fill && selectedItem.fill !== "transparent" ? selectedItem.fill : undefined, "#ffffff"),
                    onChange: (event: any) => onUpdateItem(selectedItem.id, { fill: event.target.value })
                })));
            }
            contextBarCenter.push(contextField("Stroke", WF.Element("input", {
                className: "context-bar-input",
                type: "color",
                value: normalizeColorValue(selectedItem.stroke, "#2f2f2f"),
                onChange: (event: any) => onUpdateItem(selectedItem.id, { stroke: event.target.value })
            })));
            if (selectedItem.type === "line") {
                contextBarCenter.push(contextField("Thickness", WF.Element("input", {
                    className: "textbox context-bar-input",
                    type: "number",
                    style: "width: 64px;",
                    value: selectedItem.strokeWidth ?? selectedItem.height,
                    onChange: (event: any) => onUpdateItem(selectedItem.id, {
                        strokeWidth: Math.max(2, Number(event.target.value) || 2),
                        height: Math.max(2, Number(event.target.value) || 2)
                    })
                })));
            }
        }

        if (canBind) {
            contextBarCenter.push(
                contextSeparator(),
                WF.Element(
                    "div",
                    { className: "context-bar-field" },
                    WF.Element("span", { className: "context-bar-label" }, "Binding"),
                    WF.Element("button", { className: "button context-bar-button", onClick: () => onShowDataSourceExplorer() }, hasBinding ? "Change" : "Bind"),
                    hasBinding
                        ? WF.Element("button", {
                            className: "button context-bar-button",
                            onClick: () =>
                                onUpdateItem(selectedItem.id, {
                                    sourceId: undefined,
                                    endpointPath: undefined,
                                    fieldPath: undefined,
                                    scheduleIntervalMs: 0,
                                    runtimeIntervalMode: "global",
                                    runtimeCustomIntervalMs: undefined,
                                    workerEnabled: false
                                })
                        }, UiText.desktop.buttons.clear)
                        : null
                    ,
                    hasBinding
                        ? WF.Button({
                            Icon: "clock",
                            IconOnly: true,
                            ClassName: "context-bar-button",
                            OnClick: "openScheduleSetup"
                        })
                        : null,
                    hasBinding
                        ? WF.Element("span", { className: "context-bar-label" }, formatInterval(scheduleIntervalMs))
                        : null
                )
            );
        }

        // Effects entry point (contextual to the selected item)
        contextBarCenter.push(
            contextSeparator(),
            WF.Element("button", { className: "button context-bar-button", onClick: onShowContextWindow }, "Context"),
            contextSeparator(),
            WF.Button({ Icon: "star", Text: "Effects", OnClick: "openEffectsCatalog", ClassName: "context-bar-button" })
        );
    } else {
        contextBarCenter.push(WF.Element("span", { className: "context-bar-empty" }, "Select an item to see options."));
    }

    return WF.ContextBar({
        Left: [
            WF.Button({ Icon: "new", Text: "New", OnClick: "newOverlay", ClassName: "context-bar-button" }),
            WF.Button({ Icon: "save", Text: "Save", OnClick: "saveOverlay", ClassName: "context-bar-button" }),
            WF.Element("div", { className: "context-bar-separator" }),
            WF.Button({ Icon: "undo", Text: "Undo", OnClick: "undoAction", ClassName: "context-bar-button", Enabled: canUndo }),
            WF.Button({ Icon: "redo", Text: "Redo", OnClick: "redoAction", ClassName: "context-bar-button", Enabled: canRedo })
        ],
        Center: contextBarCenter,
        Right: [
            WF.Button({ Icon: "refresh", Text: "Reset timers", OnClick: "resetScheduleTimers", ClassName: "context-bar-button" })
        ]
    });
};
