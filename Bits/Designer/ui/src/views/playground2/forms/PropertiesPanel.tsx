import React from "react";
import { node, element } from "../../../forms/core";
import { ControlKind } from "../../../forms/controlKinds";
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

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
    selectedItem,
    hasBinding,
    onUpdateItem,
    onOpenDataSourceExplorer,
    onOpenTextStyleEditor,
    onOpenTriggerEditor,
    onOpenWorkerSetup,
    getBindingSummary,
}) => {
    if (!selectedItem) return null;

    const updateItem = (updates: Partial<CanvasItem>) => onUpdateItem(selectedItem.id, updates);

    return node(
        ControlKind.panel,
        {
            title: UiText.playground2.propertiesTitle,
            close: false,
            minimize: false,
            maximize: false,
            draggable: true,
            className: "properties-container",
            style: "position: absolute; right: 16px; top: 52px; width: fit-content; max-width: 420px;",
        },
        element(
            "div",
            { className: "canvas-properties" },
            node(
                ControlKind.tabControl,
                { style: "width: 100%;", multirows: true },
                // Basic Tab
                node(
                    ControlKind.tabPage,
                    { text: UiText.playground2.sections.basic },
                    element(
                        "div",
                        { className: "canvas-properties-section" },
                        createBasicProperties(selectedItem, updateItem)
                    )
                ),
                // Binding Tab
                node(
                    ControlKind.tabPage,
                    { text: UiText.playground2.sections.binding },
                    element(
                        "div",
                        { className: "canvas-properties-section" },
                        createBindingProperties(selectedItem, hasBinding, getBindingSummary, onOpenDataSourceExplorer)
                    )
                ),
                // Text Tab (only for text items)
                selectedItem.type === "text"
                    ? node(
                        ControlKind.tabPage,
                        { text: UiText.playground2.sections.text },
                        element(
                            "div",
                            { className: "canvas-properties-section" },
                            createTextProperties(selectedItem, updateItem, onOpenTextStyleEditor)
                        )
                    )
                    : null,
                // Worker Tab
                node(
                    ControlKind.tabPage,
                    { text: UiText.playground2.sections.worker },
                    element(
                        "div",
                        { className: "canvas-properties-section" },
                        createWorkerProperties(selectedItem, hasBinding, updateItem, onOpenTriggerEditor, onOpenWorkerSetup)
                    )
                ),
                // Events Tab
                node(
                    ControlKind.tabPage,
                    { text: UiText.playground2.sections.events },
                    element(
                        "div",
                        { className: "canvas-properties-section" },
                        element("div", { className: "canvas-properties-event" }, UiText.playground2.eventSample)
                    )
                )
            )
        )
    );
};

function createBasicProperties(item: CanvasItem, updateItem: (updates: Partial<CanvasItem>) => void) {
    return [
        // Type
        element(
            "div",
            { className: "canvas-properties-row" },
            element("label", null, UiText.playground2.labels.type),
            element("div", { className: "canvas-properties-readonly" }, item.type)
        ),
        // Name
        element(
            "div",
            { className: "canvas-properties-row" },
            element("label", null, UiText.playground2.labels.name ?? "Name"),
            element("input", {
                type: "text",
                value: item.name ?? "",
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem({ name: event.target.value }),
            })
        ),
        // Position X
        element(
            "div",
            { className: "canvas-properties-row" },
            element("label", null, UiText.playground2.labels.x),
            element("input", {
                type: "number",
                value: item.x,
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem({ x: Number(event.target.value) || 0 }),
            })
        ),
        // Position Y
        element(
            "div",
            { className: "canvas-properties-row" },
            element("label", null, UiText.playground2.labels.y),
            element("input", {
                type: "number",
                value: item.y,
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem({ y: Number(event.target.value) || 0 }),
            })
        ),
        // Width
        element(
            "div",
            { className: "canvas-properties-row" },
            element("label", null, UiText.playground2.labels.w),
            element("input", {
                type: "number",
                value: item.width,
                onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                    updateItem({ width: Math.max(2, Number(event.target.value) || 0) }),
            })
        ),
        // Height
        element(
            "div",
            { className: "canvas-properties-row" },
            element("label", null, UiText.playground2.labels.h),
            element("input", {
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
            element(
                "div",
                { className: "canvas-properties-row" },
                element("label", null, UiText.playground2.labels.text),
                element("input", {
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
            element(
                "div",
                { className: "canvas-properties-row" },
                element("label", null, UiText.playground2.labels.imageUrl),
                element("input", {
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
            element(
                "div",
                { className: "canvas-properties-row" },
                element("label", null, UiText.playground2.labels.value),
                element("input", {
                    type: "number",
                    value: item.value ?? 0,
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                        updateItem({ value: Number(event.target.value) || 0 }),
                })
            ),
            element(
                "div",
                { className: "canvas-properties-row" },
                element("label", null, UiText.playground2.labels.min),
                element("input", {
                    type: "number",
                    value: item.minimum ?? 0,
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                        updateItem({ minimum: Number(event.target.value) || 0 }),
                })
            ),
            element(
                "div",
                { className: "canvas-properties-row" },
                element("label", null, UiText.playground2.labels.max),
                element("input", {
                    type: "number",
                    value: item.maximum ?? 100,
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                        updateItem({ maximum: Number(event.target.value) || 100 }),
                })
            ),
            element(
                "div",
                { className: "canvas-properties-row" },
                element("label", null, UiText.playground2.labels.progressStyle),
                element(
                    "select",
                    {
                        value: item.progressStyle ?? "blocks",
                        onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
                            updateItem({ progressStyle: event.target.value as "blocks" | "continuous" }),
                    },
                    ...UiText.playground2.options.progressStyles.map((option) =>
                        element("option", { value: option.value }, option.label)
                    )
                )
            )
        );
    }

    // Shape properties
    if (item.type === "rect" || item.type === "ellipse") {
        properties.push(
            element(
                "div",
                { className: "canvas-properties-row" },
                element("label", null, UiText.playground2.labels.fill),
                element("input", {
                    type: "color",
                    value: item.fill && item.fill !== "transparent" ? item.fill : "#ffffff",
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem({ fill: event.target.value }),
                }),
                element(
                    "button",
                    {
                        className: "canvas-properties-button",
                        onClick: () => updateItem({ fill: "transparent" }),
                    },
                    UiText.playground2.buttons.clear
                )
            )
        );
    }

    if (item.type === "rect" || item.type === "ellipse" || item.type === "line") {
        properties.push(
            element(
                "div",
                { className: "canvas-properties-row" },
                element("label", null, UiText.playground2.labels.stroke),
                element("input", {
                    type: "color",
                    value: item.stroke ?? "#2f2f2f",
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem({ stroke: event.target.value }),
                })
            )
        );
    }

    if (item.type === "line") {
        properties.push(
            element(
                "div",
                { className: "canvas-properties-row" },
                element("label", null, UiText.playground2.labels.thickness),
                element("input", {
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
        return [element("div", { className: "canvas-properties-empty" }, UiText.playground2.empty.noBinding)];
    }

    return [
        element(
            "div",
            { className: "canvas-properties-row" },
            element("label", null, UiText.playground2.labels.bindingSummary),
            element("div", { className: "canvas-properties-readonly" }, getBindingSummary(item))
        ),
        element(
            "div",
            { className: "canvas-properties-row" },
            element("label", null, UiText.playground2.labels.path),
            element("div", { className: "canvas-properties-readonly" }, item.fieldPath ?? UiText.playground2.options.select)
        ),
        element(
            "div",
            { className: "canvas-properties-row" },
            element("label", null, UiText.playground2.labels.explorer),
            element(
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
        element(
            "div",
            { className: "canvas-properties-row" },
            element("label", null, UiText.playground2.labels.font),
            element(
                "select",
                {
                    value: item.fontFamily ?? UiText.playground2.options.fonts[0],
                    onChange: (event: React.ChangeEvent<HTMLSelectElement>) => updateItem({ fontFamily: event.target.value }),
                },
                ...UiText.playground2.options.fonts.map((font) => element("option", { value: font }, font))
            )
        ),
        element(
            "div",
            { className: "canvas-properties-row" },
            element("label", null, UiText.playground2.labels.size),
            element("input", {
                type: "number",
                min: 8,
                max: 72,
                value: item.fontSize ?? 16,
                onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                    updateItem({ fontSize: Math.max(8, Number(event.target.value) || 16) }),
            })
        ),
        element(
            "div",
            { className: "canvas-properties-row" },
            element("label", null, UiText.playground2.labels.weight),
            element(
                "select",
                {
                    value: item.fontWeight ?? "normal",
                    onChange: (event: React.ChangeEvent<HTMLSelectElement>) => updateItem({ fontWeight: event.target.value }),
                },
                ...UiText.playground2.options.weights.map((weight) => element("option", { value: weight }, weight))
            )
        ),
        element(
            "div",
            { className: "canvas-properties-row" },
            element("label", null, UiText.playground2.labels.style),
            element(
                "select",
                {
                    value: item.fontStyle ?? "normal",
                    onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
                        updateItem({ fontStyle: event.target.value as "normal" | "italic" }),
                },
                ...UiText.playground2.options.styles.map((style) => element("option", { value: style }, style))
            )
        ),
        element(
            "div",
            { className: "canvas-properties-row" },
            element("label", null, UiText.playground2.labels.color),
            element("input", {
                type: "color",
                value: item.textColor ?? "#222222",
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem({ textColor: event.target.value }),
            })
        ),
        element(
            "div",
            { className: "canvas-properties-row" },
            element("label", null, UiText.playground2.labels.transform),
            element(
                "select",
                {
                    value: item.textTransform ?? "none",
                    onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
                        updateItem({ textTransform: event.target.value as "none" | "uppercase" | "lowercase" }),
                },
                ...UiText.playground2.options.transforms.map((transform) => element("option", { value: transform }, transform))
            )
        ),
        element(
            "div",
            { className: "canvas-properties-row" },
            element("label", null, UiText.playground2.labels.letterSpacing),
            element("input", {
                type: "number",
                min: -2,
                max: 12,
                step: 0.5,
                value: item.letterSpacing ?? 0,
                onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                    updateItem({ letterSpacing: Number(event.target.value) || 0 }),
            })
        ),
        element(
            "div",
            { className: "canvas-properties-row" },
            element("label", null, UiText.playground2.labels.effects),
            element(
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
        return [element("div", { className: "canvas-properties-empty" }, UiText.playground2.empty.noWorker)];
    }

    return [
        element(
            "div",
            { className: "canvas-properties-row" },
            element("label", null, UiText.playground2.labels.autoRefresh),
            node(ControlKind.checkBox, {
                checked: Boolean(item.workerEnabled),
                onChange: "toggleWorkerEnabled",
            })
        ),
        element(
            "div",
            { className: "canvas-properties-row" },
            element("label", null, UiText.playground2.labels.interval),
            element("input", {
                type: "number",
                min: 250,
                value: item.workerIntervalMs ?? 5000,
                onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                    updateItem({ workerIntervalMs: Math.max(250, Number(event.target.value) || 0) }),
                disabled: !item.workerEnabled,
            })
        ),
        element(
            "div",
            { className: "canvas-properties-row", style: "justify-content: flex-end;" },
            element(
                "button",
                { className: "canvas-properties-button", onClick: onOpenTriggerEditor },
                UiText.playground2.buttons.triggers
            ),
            element(
                "button",
                { className: "canvas-properties-button", onClick: onOpenWorkerSetup },
                UiText.playground2.buttons.moreOptions
            )
        ),
    ];
}
