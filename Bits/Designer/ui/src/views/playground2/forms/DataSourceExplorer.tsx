import React from "react";
import { node, element } from "../../../forms/core";
import { ControlKind } from "../../../forms/controlKinds";
import { UiText } from "../../uiText";

interface DataSource {
    id: string;
    name: string;
    kind?: string;
}

interface DataSourceCategory {
    id: string;
    name: string;
}

interface ApiFieldSpec {
    path: string;
    type: string;
    example?: string | null;
}

interface DataSourceExplorerProps {
    selectedItem: {
        id: string;
        type: string;
        name?: string;
        label?: string;
        sourceId?: string;
        endpointPath?: string;
        fieldPath?: string;
        format?: "text" | "uppercase" | "json";
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

export const DataSourceExplorer: React.FC<DataSourceExplorerProps> = ({
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
}) => {
    if (!selectedItem) return null;

    const canBind = selectedItem.type === "text" || selectedItem.type === "image" || selectedItem.type === "progress";
    if (!canBind) return null;

    const selectedSource = selectedItem.sourceId ? sources.find((s) => s.id === selectedItem.sourceId) : null;
    const updateItem = (updates: any) => onUpdateItem(selectedItem.id, updates);

    return node(
        ControlKind.window,
        {
            title: UiText.playground2.explorerTitle,
            dialog: true,
            draggable: true,
            onClose: "closeDataSourceExplorer",
            style: "position: absolute; left: 260px; top: 72px; width: min(980px, 92vw);",
        },
        element(
            "div",
            { className: "data-source-explorer" },
            element(
                "div",
                { className: "data-source-explorer-body" },
                element(
                    "div",
                    { className: "data-source-explorer-main" },
                    element(
                        "div",
                        { className: "canvas-properties-section" },
                        // Category selector
                        element(
                            "div",
                            { className: "canvas-properties-row" },
                            element("label", null, UiText.playground2.labels.category),
                            element(
                                "select",
                                {
                                    value: selectedCategoryId,
                                    onChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
                                        onSetSelectedCategoryId(event.target.value);
                                        onSetSelectedSubcategoryId("");
                                    },
                                },
                                element("option", { value: "" }, UiText.playground2.options.select),
                                ...topCategories.map((category) => element("option", { value: category.id }, category.name))
                            )
                        ),
                        // Subcategory selector
                        element(
                            "div",
                            { className: "canvas-properties-row" },
                            element("label", null, UiText.playground2.labels.subcategory),
                            element(
                                "select",
                                {
                                    value: selectedSubcategoryId,
                                    disabled: !selectedCategoryId || subcategories.length === 0,
                                    onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
                                        onSetSelectedSubcategoryId(event.target.value),
                                },
                                element("option", { value: "" }, UiText.playground2.options.select),
                                ...subcategories.map((category) => element("option", { value: category.id }, category.name))
                            )
                        ),
                        // Source selector
                        element(
                            "div",
                            { className: "canvas-properties-row" },
                            element("label", null, UiText.playground2.labels.source),
                            element(
                                "select",
                                {
                                    value: selectedItem.sourceId ?? "",
                                    onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
                                        updateItem({ sourceId: event.target.value || undefined, endpointPath: undefined, fieldPath: undefined }),
                                },
                                element("option", { value: "" }, UiText.playground2.options.select),
                                ...filteredSources.map((source) => element("option", { value: source.id }, source.name))
                            )
                        ),
                        // Endpoint selector (for non-system sources)
                        !isSystemSource(selectedSource)
                            ? element(
                                "div",
                                { className: "canvas-properties-row" },
                                element("label", null, UiText.playground2.labels.endpoint),
                                element(
                                    "select",
                                    {
                                        value: selectedItem.endpointPath ?? "",
                                        onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
                                            updateItem({ endpointPath: event.target.value || undefined, fieldPath: undefined }),
                                    },
                                    element("option", { value: "" }, UiText.playground2.options.select),
                                    ...selectedEndpoints.map((endpoint) =>
                                        element("option", { value: endpoint.path }, `${endpoint.method} ${endpoint.path}`)
                                    )
                                )
                            )
                            : null,
                        // Test button (for non-system sources)
                        !isSystemSource(selectedSource)
                            ? element(
                                "div",
                                { className: "canvas-properties-row" },
                                element("label", null, UiText.playground2.labels.fetch),
                                element(
                                    "div",
                                    { style: "display: flex; align-items: center; gap: 8px;" },
                                    element(
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
                                        ? element(
                                            "div",
                                            { className: "canvas-properties-readonly" },
                                            selectedTest.success ? `OK (${selectedTest.statusCode})` : `Error (${selectedTest.statusCode})`
                                        )
                                        : element("div", { className: "canvas-properties-readonly" }, UiText.playground2.empty.noTest)
                                )
                            )
                            : null,
                        // Array value warning
                        arrayValueMessage
                            ? element(
                                "div",
                                { className: "canvas-properties-row" },
                                element("label", null, "Info"),
                                element("div", { className: "canvas-properties-readonly" }, arrayValueMessage)
                            )
                            : null
                    ),
                    // Fields and Preview grid
                    element(
                        "div",
                        { className: "data-source-explorer-grid" },
                        // Fields panel
                        element(
                            "div",
                            { className: "data-source-explorer-panel" },
                            element("div", { className: "data-source-explorer-title" }, UiText.playground2.labels.field),
                            availableFields.length > 0
                                ? element(
                                    "div",
                                    { className: "data-source-explorer-fields" },
                                    ...availableFields.map((field) =>
                                        element(
                                            "div",
                                            {
                                                className: `data-source-explorer-field ${selectedItem.fieldPath === `response.${field.path}` ? "selected" : ""
                                                    }`,
                                                onClick: () => updateItem({ fieldPath: `response.${field.path}` }),
                                            },
                                            element("div", { className: "data-source-explorer-field-path" }, field.path),
                                            element("div", { className: "data-source-explorer-field-type" }, field.type)
                                        )
                                    )
                                )
                                : element("div", { className: "canvas-properties-empty" }, UiText.playground2.empty.noBinding)
                        ),
                        // Preview panel
                        element(
                            "div",
                            { className: "data-source-explorer-panel" },
                            element("div", { className: "data-source-explorer-title" }, UiText.playground2.labels.preview),
                            element(
                                "div",
                                { className: "data-source-explorer-preview" },
                                previewData !== undefined
                                    ? renderJsonTree("response", previewData, 0, "response")
                                    : element("div", { className: "canvas-properties-empty" }, UiText.playground2.empty.noPreview)
                            )
                        )
                    )
                ),
                // Footer with bind controls
                element(
                    "div",
                    { className: "data-source-explorer-footer" },
                    element(
                        "div",
                        { className: "canvas-properties-section" },
                        element(
                            "div",
                            { className: "canvas-properties-row" },
                            element("label", null, UiText.playground2.labels.bindTo),
                            element(
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
                        element(
                            "div",
                            { className: "canvas-properties-row" },
                            element("label", null, UiText.playground2.labels.path),
                            element("input", {
                                type: "text",
                                placeholder: UiText.playground2.placeholders.fieldPath,
                                value: selectedItem.fieldPath ?? "",
                                onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem({ fieldPath: event.target.value }),
                            })
                        ),
                        selectedItem.type === "text"
                            ? element(
                                "div",
                                { className: "canvas-properties-row" },
                                element("label", null, UiText.playground2.labels.format),
                                element(
                                    "select",
                                    {
                                        value: selectedItem.format ?? "text",
                                        onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
                                            updateItem({ format: event.target.value as "text" | "uppercase" | "json" }),
                                    },
                                    element("option", { value: "text" }, UiText.playground2.options.formatText),
                                    element("option", { value: "uppercase" }, UiText.playground2.options.formatUppercase),
                                    element("option", { value: "json" }, UiText.playground2.options.formatJson)
                                )
                            )
                            : null,
                        selectedFieldSpec?.example
                            ? element(
                                "div",
                                { className: "canvas-properties-row" },
                                element("label", null, UiText.playground2.labels.example),
                                element("div", { className: "canvas-properties-readonly" }, String(selectedFieldSpec.example))
                            )
                            : null
                    ),
                    element(
                        "div",
                        { style: "display: flex; justify-content: flex-end; gap: 8px; padding: 8px 12px;" },
                        element("button", { className: "canvas-properties-button", onClick: onClose }, UiText.playground2.buttons.close),
                        element("button", { className: "canvas-properties-button", onClick: onClose }, UiText.playground2.buttons.bind)
                    )
                )
            )
        )
    );
};
