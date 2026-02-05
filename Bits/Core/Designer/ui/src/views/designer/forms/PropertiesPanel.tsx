import React from "react";
import { WF } from "@streamcraft/forms";
import { UiText } from "../../uiText";

interface CanvasItem {
    id: string;
    type: string;
    name?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    label?: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    src?: string;
    sourceId?: string;
    endpointPath?: string;
    fieldPath?: string;
    format?: "text" | "uppercase" | "json";
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    fontStyle?: "normal" | "italic";
    textColor?: string;
    textTransform?: "none" | "uppercase" | "lowercase";
    letterSpacing?: number;
    textShadowX?: number;
    textShadowY?: number;
    textShadowBlur?: number;
    textShadowColor?: string;
    value?: number;
    minimum?: number;
    maximum?: number;
    progressStyle?: "continuous" | "blocks";
    workerEnabled?: boolean;
    workerIntervalMs?: number;
}

interface PropertiesPanelProps {
    selectedItem: CanvasItem | null;
    hasBinding: boolean;
    onUpdateItem: (itemId: string, updates: Partial<CanvasItem>) => void;
    onOpenDataSourceExplorer: () => void;
    onOpenTextStyleEditor: () => void;
    onOpenTriggerEditor: () => void;
    onOpenWorkerSetup: () => void;
    getBindingSummary: (item: CanvasItem | null) => string;
}

export const PropertiesPanel = ({
    selectedItem,
    hasBinding,
    onUpdateItem,
    onOpenDataSourceExplorer,
    onOpenTextStyleEditor,
    onOpenTriggerEditor,
    onOpenWorkerSetup,
    getBindingSummary,
}: PropertiesPanelProps) => {
    if (!selectedItem) return null;

    const updateItem = (updates: Partial<CanvasItem>) => onUpdateItem(selectedItem.id, updates);

    return WF.Panel(
        {
            Text: UiText.playground2.propertiesTitle,
            close: false,
            minimize: false,
            maximize: false,
            draggable: true,
            className: "properties-container",
            style: "position: absolute; right: 16px; top: 52px; width: fit-content; max-width: 420px;",
        },
        WF.Element(
            "div",
            { className: "canvas-properties" },
            WF.TabControl(
                { Style: "width: 100%;", MultiRows: true },
                // Basic Tab
                WF.TabPage(
                    { Text: UiText.playground2.sections.basic },
                    WF.Element(
                        "div",
                        { className: "canvas-properties-section" },
                        ...createBasicProperties(selectedItem, updateItem)
                    )
                ),
                // Binding Tab
                WF.TabPage(
                    { Text: UiText.playground2.sections.binding },
                    WF.Element(
                        "div",
                        { className: "canvas-properties-section" },
                        ...createBindingProperties(selectedItem, hasBinding, getBindingSummary, onOpenDataSourceExplorer)
                    )
                ),
                // Text Tab (only for text items)
                selectedItem.type === "text"
                    ? WF.TabPage(
                        { Text: UiText.playground2.sections.text },
                        WF.Element(
                            "div",
                            { className: "canvas-properties-section" },
                            ...createTextProperties(selectedItem, updateItem, onOpenTextStyleEditor)
                        )
                    )
                    : null,
                // Worker Tab
                WF.TabPage(
                    { Text: UiText.playground2.sections.worker },
                    WF.Element(
                        "div",
                        { className: "canvas-properties-section" },
                        ...createWorkerProperties(selectedItem, hasBinding, updateItem, onOpenTriggerEditor, onOpenWorkerSetup)
                    )
                ),
                // Events Tab
                WF.TabPage(
                    { Text: UiText.playground2.sections.events },
                    WF.Element(
                        "div",
                        { className: "canvas-properties-section" },
                        WF.Element("div", { className: "canvas-properties-event" }, UiText.playground2.eventSample)
                    )
                )
            )
        )
    );
};

function createBasicProperties(item: CanvasItem, updateItem: (updates: Partial<CanvasItem>) => void) {
    return [
        // Type
        WF.Field(
            UiText.playground2.labels.type,
            WF.Element("div", { className: "canvas-properties-readonly" }, item.type)
        ),
        // Name
        WF.Field(
            "Name",
            WF.Element("input", {
                type: "text",
                value: item.name ?? "",
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem({ name: event.target.value }),
            })
        ),
        // Position X
        WF.Field(
            UiText.playground2.labels.x,
            WF.Element("input", {
                type: "number",
                value: item.x,
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem({ x: Number(event.target.value) || 0 }),
            })
        ),
        // Position Y
        WF.Field(
            UiText.playground2.labels.y,
            WF.Element("input", {
                type: "number",
                value: item.y,
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem({ y: Number(event.target.value) || 0 }),
            })
        ),
        // Width
        WF.Field(
            UiText.playground2.labels.w,
            WF.Element("input", {
                type: "number",
                value: item.width,
                onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                    updateItem({ width: Math.max(2, Number(event.target.value) || 0) }),
            })
        ),
        // Height
        WF.Field(
            UiText.playground2.labels.h,
            WF.Element("input", {
                type: "number",
                value: item.height,
                onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                    updateItem({ height: Math.max(2, Number(event.target.value) || 0) }),
            })
        ),
        // Type-specific properties
        ...createTypeSpecificProperties(item, updateItem),
    ];
}

function createTypeSpecificProperties(item: CanvasItem, updateItem: (updates: Partial<CanvasItem>) => void) {
    const properties = [];

    // Text properties
    if (item.type === "text") {
        properties.push(
            WF.Field(
                UiText.playground2.labels.text,
                WF.Element("input", {
                    type: "text",
                    value: item.label ?? "",
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem({ label: event.target.value }),
                })
            )
        );
    }

    // Image properties
    if (item.type === "image") {
        properties.push(
            WF.Field(
                UiText.playground2.labels.imageUrl,
                WF.Element("input", {
                    type: "text",
                    value: item.src ?? "",
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem({ src: event.target.value }),
                })
            )
        );
    }

    // Progress properties
    if (item.type === "progress") {
        properties.push(
            WF.Field(
                UiText.playground2.labels.value,
                WF.Element("input", {
                    type: "number",
                    value: item.value ?? 0,
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                        updateItem({ value: Number(event.target.value) || 0 }),
                })
            ),
            WF.Field(
                UiText.playground2.labels.min,
                WF.Element("input", {
                    type: "number",
                    value: item.minimum ?? 0,
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                        updateItem({ minimum: Number(event.target.value) || 0 }),
                })
            ),
            WF.Field(
                UiText.playground2.labels.max,
                WF.Element("input", {
                    type: "number",
                    value: item.maximum ?? 100,
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                        updateItem({ maximum: Number(event.target.value) || 100 }),
                })
            ),
            WF.Field(
                UiText.playground2.labels.progressStyle,
                WF.Element(
                    "select",
                    {
                        value: item.progressStyle ?? "blocks",
                        onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
                            updateItem({ progressStyle: event.target.value as "blocks" | "continuous" }),
                    },
                    ...UiText.playground2.options.progressStyles.map((option) =>
                        WF.Element("option", { value: option.value }, option.label)
                    )
                )
            )
        );
    }

    // Shape properties
    if (item.type === "rect" || item.type === "ellipse") {
        properties.push(
            WF.Field(
                UiText.playground2.labels.fill,
                WF.Element(
                    "div",
                    { style: "display: flex; align-items: center; gap: 8px;" },
                    WF.Element("input", {
                        type: "color",
                        value: item.fill && item.fill !== "transparent" ? item.fill : "#ffffff",
                        onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem({ fill: event.target.value }),
                    }),
                    WF.Element(
                        "button",
                        {
                            className: "canvas-properties-button",
                            onClick: () => updateItem({ fill: "transparent" }),
                        },
                        UiText.playground2.buttons.clear
                    )
                )
            )
        );
    }

    if (item.type === "rect" || item.type === "ellipse" || item.type === "line") {
        properties.push(
            WF.Field(
                UiText.playground2.labels.stroke,
                WF.Element("input", {
                    type: "color",
                    value: item.stroke ?? "#2f2f2f",
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem({ stroke: event.target.value }),
                })
            )
        );
    }

    if (item.type === "line") {
        properties.push(
            WF.Field(
                UiText.playground2.labels.thickness,
                WF.Element("input", {
                    type: "number",
                    value: item.strokeWidth ?? item.height,
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                        updateItem({
                            strokeWidth: Math.max(2, Number(event.target.value) || 2),
                            height: Math.max(2, Number(event.target.value) || 2),
                        }),
                })
            )
        );
    }

    return properties;
}

function createBindingProperties(
    item: CanvasItem,
    hasBinding: boolean,
    getBindingSummary: (item: CanvasItem | null) => string,
    onOpenDataSourceExplorer: () => void
) {
    const canBind = item.type === "text" || item.type === "image" || item.type === "progress";

    if (!canBind) {
        return [WF.Element("div", { className: "canvas-properties-empty" }, UiText.playground2.empty.noBinding)];
    }

    return [
        WF.Field(
            UiText.playground2.labels.bindingSummary,
            WF.Element("div", { className: "canvas-properties-readonly" }, getBindingSummary(item))
        ),
        WF.Field(
            UiText.playground2.labels.path,
            WF.Element("div", { className: "canvas-properties-readonly" }, item.fieldPath ?? UiText.playground2.options.select)
        ),
        WF.Field(
            UiText.playground2.labels.explorer,
            WF.Element(
                "button",
                {
                    className: "canvas-properties-button",
                    onClick: onOpenDataSourceExplorer,
                },
                UiText.playground2.buttons.openExplorer
            )
        ),
    ];
}

function createTextProperties(
    item: CanvasItem,
    updateItem: (updates: Partial<CanvasItem>) => void,
    onOpenTextStyleEditor: () => void
) {
    return [
        WF.Field(
            UiText.playground2.labels.font,
            WF.Element(
                "select",
                {
                    value: item.fontFamily ?? UiText.playground2.options.fonts[0],
                    onChange: (event: React.ChangeEvent<HTMLSelectElement>) => updateItem({ fontFamily: event.target.value }),
                },
                ...UiText.playground2.options.fonts.map((font) => WF.Element("option", { value: font }, font))
            )
        ),
        WF.Field(
            UiText.playground2.labels.size,
            WF.Element("input", {
                type: "number",
                min: 8,
                max: 72,
                value: item.fontSize ?? 16,
                onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                    updateItem({ fontSize: Math.max(8, Number(event.target.value) || 16) }),
            })
        ),
        WF.Field(
            UiText.playground2.labels.weight,
            WF.Element(
                "select",
                {
                    value: item.fontWeight ?? "normal",
                    onChange: (event: React.ChangeEvent<HTMLSelectElement>) => updateItem({ fontWeight: event.target.value }),
                },
                ...UiText.playground2.options.weights.map((weight) => WF.Element("option", { value: weight }, weight))
            )
        ),
        WF.Field(
            UiText.playground2.labels.style,
            WF.Element(
                "select",
                {
                    value: item.fontStyle ?? "normal",
                    onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
                        updateItem({ fontStyle: event.target.value as "normal" | "italic" }),
                },
                ...UiText.playground2.options.styles.map((style) => WF.Element("option", { value: style }, style))
            )
        ),
        WF.Field(
            UiText.playground2.labels.color,
            WF.Element("input", {
                type: "color",
                value: item.textColor ?? "#222222",
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem({ textColor: event.target.value }),
            })
        ),
        WF.Field(
            UiText.playground2.labels.transform,
            WF.Element(
                "select",
                {
                    value: item.textTransform ?? "none",
                    onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
                        updateItem({ textTransform: event.target.value as "none" | "uppercase" | "lowercase" }),
                },
                ...UiText.playground2.options.transforms.map((transform) => WF.Element("option", { value: transform }, transform))
            )
        ),
        WF.Field(
            UiText.playground2.labels.letterSpacing,
            WF.Element("input", {
                type: "number",
                min: -2,
                max: 12,
                step: 0.5,
                value: item.letterSpacing ?? 0,
                onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                    updateItem({ letterSpacing: Number(event.target.value) || 0 }),
            })
        ),
        WF.Field(
            UiText.playground2.labels.effects,
            WF.Element(
                "button",
                { className: "canvas-properties-button", onClick: onOpenTextStyleEditor },
                UiText.playground2.buttons.effects
            )
        ),
    ];
}

function createWorkerProperties(
    item: CanvasItem,
    hasBinding: boolean,
    updateItem: (updates: Partial<CanvasItem>) => void,
    onOpenTriggerEditor: () => void,
    onOpenWorkerSetup: () => void
) {
    if (!hasBinding) {
        return [WF.Element("div", { className: "canvas-properties-empty" }, UiText.playground2.empty.noWorker)];
    }

    return [
        WF.Field(
            UiText.playground2.labels.autoRefresh,
            WF.CheckBox({
                Checked: Boolean(item.workerEnabled),
                OnChange: "toggleWorkerEnabled",
            })
        ),
        WF.Field(
            UiText.playground2.labels.interval,
            WF.Element("input", {
                type: "number",
                min: 250,
                value: item.workerIntervalMs ?? 5000,
                onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                    updateItem({ workerIntervalMs: Math.max(250, Number(event.target.value) || 0) }),
                disabled: !item.workerEnabled,
            })
        ),
        WF.Row(
            { Style: "justify-content: flex-end;" },
            WF.Element(
                "button",
                { className: "canvas-properties-button", onClick: onOpenTriggerEditor },
                UiText.playground2.buttons.triggers
            ),
            WF.Element(
                "button",
                { className: "canvas-properties-button", onClick: onOpenWorkerSetup },
                UiText.playground2.buttons.moreOptions
            )
        ),
    ];
}


