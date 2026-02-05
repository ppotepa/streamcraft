import React from "react";
import { WF } from "@streamcraft/forms";
import { UiText } from "../../uiText";

export interface DataSource {
    id: string;
    name: string;
    kind?: string;
}

export interface DataSourceCategory {
    id: string;
    name: string;
}

export interface ApiFieldSpec {
    path: string;
    type: string;
    example?: string | null;
}

export interface DataSourceExplorerProps {
    selectedItem: {
        id: string;
        type: string;
        name?: string;
        label?: string;
        sourceId?: string;
        endpointPath?: string;
        fieldPath?: string;
        format?: "text" | "uppercase" | "json";
        scheduleIntervalMs?: number;
    } | null;
    sources: DataSource[];
    topCategories: DataSourceCategory[];
    subcategories: DataSourceCategory[];
    filteredSources: DataSource[];
    selectedCategoryId: string;
    selectedSubcategoryId: string;
    selectedEndpoints: any[];
    availableFields: ApiFieldSpec[];
    selectedTest: any;
    arrayValueMessage: string | null;
    selectedFieldSpec: ApiFieldSpec | undefined;
    previewData: unknown;
    isSystemSource: (source: DataSource | null) => boolean;
    renderJsonTree: (label: string, value: unknown, depth: number, path: string) => any;
    onUpdateItem: (itemId: string, updates: any) => void;
    onSetSelectedCategoryId: (id: string) => void;
    onSetSelectedSubcategoryId: (id: string) => void;
    onRunTest: (sourceId: string, endpointPath: string) => void;
    onClose: () => void;
}

export const buildDataSourceExplorer = ({
    selectedItem,
    sources,
    topCategories,
    subcategories,
    filteredSources,
    selectedCategoryId,
    selectedSubcategoryId,
    selectedEndpoints,
    availableFields,
    selectedTest,
    arrayValueMessage,
    selectedFieldSpec,
    previewData,
    isSystemSource,
    renderJsonTree,
    onUpdateItem,
    onSetSelectedCategoryId,
    onSetSelectedSubcategoryId,
    onRunTest,
    onClose,
}: DataSourceExplorerProps) => {
    if (!selectedItem) return null;

    const canBind = selectedItem.type === "text" || selectedItem.type === "image" || selectedItem.type === "progress";
    if (!canBind) return null;

    const selectedSource = selectedItem.sourceId ? sources.find((s) => s.id === selectedItem.sourceId) : null;
    const updateItem = (updates: any) => onUpdateItem(selectedItem.id, updates);

    return WF.Window(
        {
            Text: UiText.playground2.explorerTitle,
            Dialog: true,
            Draggable: true,
            OnClose: "closeDataSourceExplorer",
            Style: "position: absolute; left: 260px; top: 72px; width: min(980px, 92vw);",
        },
        WF.Element(
            "div",
            { className: "data-source-explorer" },
            WF.Element(
                "div",
                { className: "data-source-explorer-body" },
                WF.Element(
                    "div",
                    { className: "data-source-explorer-main" },
                    WF.Element(
                        "div",
                        { className: "canvas-properties-section" },
                        // Category selector
                        WF.Field(
                            UiText.playground2.labels.category,
                            WF.Element(
                                "select",
                                {
                                    value: selectedCategoryId,
                                    onChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
                                        onSetSelectedCategoryId(event.target.value);
                                        onSetSelectedSubcategoryId("");
                                    },
                                },
                                WF.Element("option", { value: "" }, UiText.playground2.options.select),
                                ...topCategories.map((category) => WF.Element("option", { value: category.id }, category.name))
                            )
                        ),
                        // Subcategory selector
                        WF.Field(
                            UiText.playground2.labels.subcategory,
                            WF.Element(
                                "select",
                                {
                                    value: selectedSubcategoryId,
                                    disabled: !selectedCategoryId || subcategories.length === 0,
                                    onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
                                        onSetSelectedSubcategoryId(event.target.value),
                                },
                                WF.Element("option", { value: "" }, UiText.playground2.options.select),
                                ...subcategories.map((category) => WF.Element("option", { value: category.id }, category.name))
                            )
                        ),
                        // Source selector
                        WF.Field(
                            UiText.playground2.labels.source,
                            WF.Element(
                                "select",
                                {
                                    value: selectedItem.sourceId ?? "",
                                    onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
                                        updateItem({ sourceId: event.target.value || undefined, endpointPath: undefined, fieldPath: undefined }),
                                },
                                WF.Element("option", { value: "" }, UiText.playground2.options.select),
                                ...filteredSources.map((source) => WF.Element("option", { value: source.id }, source.name))
                            )
                        ),
                        // Endpoint selector (for non-system sources)
                        !isSystemSource(selectedSource ?? null)
                            ? WF.Field(
                                UiText.playground2.labels.endpoint,
                                WF.Element(
                                    "select",
                                    {
                                        value: selectedItem.endpointPath ?? "",
                                        onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
                                            updateItem({ endpointPath: event.target.value || undefined, fieldPath: undefined }),
                                    },
                                    WF.Element("option", { value: "" }, UiText.playground2.options.select),
                                    ...selectedEndpoints.map((endpoint) =>
                                        WF.Element("option", { value: endpoint.path }, `${endpoint.method} ${endpoint.path}`)
                                    )
                                )
                            )
                            : null,
                        // Test button (for non-system sources)
                        !isSystemSource(selectedSource ?? null)
                            ? WF.Field(
                                UiText.playground2.labels.fetch,
                                WF.Element(
                                    "div",
                                    { style: "display: flex; align-items: center; gap: 8px;" },
                                    WF.Element(
                                        "button",
                                        {
                                            className: "canvas-properties-button",
                                            disabled: !selectedItem.sourceId || !selectedItem.endpointPath,
                                            onClick: () => {
                                                if (selectedItem.sourceId && selectedItem.endpointPath) {
                                                    onRunTest(selectedItem.sourceId, selectedItem.endpointPath);
                                                }
                                            },
                                        },
                                        UiText.playground2.buttons.test
                                    ),
                                    selectedTest
                                        ? WF.Element(
                                            "div",
                                            { className: "canvas-properties-readonly" },
                                            selectedTest.success ? `OK (${selectedTest.statusCode})` : `Error (${selectedTest.statusCode})`
                                        )
                                        : WF.Element("div", { className: "canvas-properties-readonly" }, UiText.playground2.empty.noTest)
                                )
                            )
                            : null,
                        // Array value warning
                        arrayValueMessage
                            ? WF.Field(
                                "Info",
                                WF.Element("div", { className: "canvas-properties-readonly" }, arrayValueMessage)
                            )
                            : null
                    ),
                    // Fields and Preview grid
                    WF.Element(
                        "div",
                        { className: "data-source-explorer-grid" },
                        // Fields panel
                        WF.Element(
                            "div",
                            { className: "data-source-explorer-panel" },
                            WF.Element("div", { className: "data-source-explorer-title" }, UiText.playground2.labels.field),
                            availableFields.length > 0
                                ? WF.Element(
                                    "div",
                                    { className: "data-source-explorer-fields" },
                                    ...availableFields.map((field) =>
                                        WF.Element(
                                            "div",
                                            {
                                                className: `data-source-explorer-field ${selectedItem.fieldPath === `response.${field.path}` ? "selected" : ""
                                                    }`,
                                                onClick: () => updateItem({ fieldPath: `response.${field.path}` }),
                                            },
                                            WF.Element("div", { className: "data-source-explorer-field-path" }, field.path),
                                            WF.Element("div", { className: "data-source-explorer-field-type" }, field.type)
                                        )
                                    )
                                )
                                : WF.Element("div", { className: "canvas-properties-empty" }, UiText.playground2.empty.noBinding)
                        ),
                        // Preview panel
                        WF.Element(
                            "div",
                            { className: "data-source-explorer-panel" },
                            WF.Element("div", { className: "data-source-explorer-title" }, UiText.playground2.labels.preview),
                            WF.Element(
                                "div",
                                { className: "data-source-explorer-preview" },
                                previewData !== undefined
                                    ? renderJsonTree("response", previewData, 0, "response")
                                    : WF.Element("div", { className: "canvas-properties-empty" }, UiText.playground2.empty.noPreview)
                            )
                        )
                    )
                ),
                // Footer with bind controls
                WF.Element(
                    "div",
                    { className: "data-source-explorer-footer" },
                    WF.Element(
                        "div",
                        { className: "canvas-properties-section" },
                        WF.Field(
                            UiText.playground2.labels.bindTo,
                            WF.Element(
                                "div",
                                { className: "canvas-properties-readonly" },
                                `${selectedItem.name ?? selectedItem.label ?? selectedItem.type} · ${selectedItem.type === "image"
                                    ? UiText.playground2.labels.imageUrl
                                    : selectedItem.type === "progress"
                                        ? UiText.playground2.labels.value
                                        : UiText.playground2.labels.text
                                }`
                            )
                        ),
                        WF.Field(
                            UiText.playground2.labels.path,
                            WF.Element("input", {
                                type: "text",
                                placeholder: UiText.playground2.placeholders.fieldPath,
                                value: selectedItem.fieldPath ?? "",
                                onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                                    const nextInterval = selectedItem.scheduleIntervalMs;
                                    updateItem({
                                        fieldPath: event.target.value,
                                        scheduleIntervalMs: nextInterval === undefined ? 5000 : nextInterval
                                    });
                                },
                            })
                        ),
                        selectedItem.type === "text"
                            ? WF.Field(
                                UiText.playground2.labels.format,
                                WF.Element(
                                    "select",
                                    {
                                        value: selectedItem.format ?? "text",
                                        onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
                                            updateItem({ format: event.target.value as "text" | "uppercase" | "json" }),
                                    },
                                    WF.Element("option", { value: "text" }, UiText.playground2.options.formatText),
                                    WF.Element("option", { value: "uppercase" }, UiText.playground2.options.formatUppercase),
                                    WF.Element("option", { value: "json" }, UiText.playground2.options.formatJson)
                                )
                            )
                            : null,
                        selectedFieldSpec?.example
                            ? WF.Field(
                                UiText.playground2.labels.example,
                                WF.Element("div", { className: "canvas-properties-readonly" }, String(selectedFieldSpec.example))
                            )
                            : null
                    ),
                    WF.Element(
                        "div",
                        { style: "display: flex; justify-content: flex-end; gap: 8px; padding: 8px 12px;" },
                        WF.Element("button", { className: "canvas-properties-button", onClick: onClose }, UiText.playground2.buttons.close),
                        WF.Element("button", { className: "canvas-properties-button", onClick: onClose }, UiText.playground2.buttons.bind)
                    )
                )
            )
        )
    );
};



