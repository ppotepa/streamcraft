import React from "react";
import { element, node } from "../../../forms/core";
import { ControlKind } from "../../../forms/controlKinds";

export type TextStyleCatalogEntry = {
    id: string;
    name?: string;
    preview?: string;
    categoryId?: string;
    categoryLabel?: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    fontStyle?: string;
    textColor?: string;
    textTransform?: string;
    letterSpacing?: number;
    textShadowX?: number;
    textShadowY?: number;
    textShadowBlur?: number;
    textShadowColor?: string;
};

export type TextStylesCategory = {
    id: string;
    label: string;
    count: number;
};

export interface TextStylesDialogProps {
    categories: TextStylesCategory[];
    activeCategoryId: string;
    styles: TextStyleCatalogEntry[];
    totalCount: number;
    selectedId: string | null;
    search: string;
    previewText: string;
    customText: string;
    fontSource: string;
    weightFilter: string;
    caseFilter: string;
    shadowFilter: string;
    favorites: string[];
    statusTone?: "info" | "error" | "success";
    canLoadMore: boolean;
    isSyncPreview: boolean;
    isRefreshing: boolean;
    statusMessage?: string;
    onSelectCategory: (id: string) => void;
    onSelectStyle: (id: string) => void;
    onApplyStyle: (id: string) => void;
    onApplySelected: () => void;
    onToggleFavorite: (id: string) => void;
    onHoverStyle: (id: string | null) => void;
    onLoadMore: () => void;
    onToggleSyncPreview: (value: boolean) => void;
    onSearchChange: (value: string) => void;
    onPreviewChange: (value: string) => void;
    onCustomTextChange: (value: string) => void;
    onFontSourceChange: (value: string) => void;
    onWeightFilterChange: (value: string) => void;
    onCaseFilterChange: (value: string) => void;
    onShadowFilterChange: (value: string) => void;
    onRefresh: () => void;
    onAiPrompt: () => void;
}

const buildPreviewStyle = (style?: TextStyleCatalogEntry | null) => {
    if (!style) return "";
    const shadow = style.textShadowBlur && style.textShadowBlur > 0
        ? `${style.textShadowX ?? 0}px ${style.textShadowY ?? 0}px ${style.textShadowBlur ?? 0}px ${style.textShadowColor ?? "rgba(0,0,0,0.35)"}`
        : "none";
    const fontFamily = style.fontFamily ? `'${style.fontFamily.replace(/'/g, "\\'")}'` : "inherit";
    return [
        `font-family: ${fontFamily};`,
        `font-size: ${style.fontSize ?? 16}px;`,
        `font-weight: ${style.fontWeight ?? "normal"};`,
        `font-style: ${style.fontStyle ?? "normal"};`,
        `color: ${style.textColor ?? "#111827"};`,
        `text-transform: ${style.textTransform ?? "none"};`,
        `letter-spacing: ${(style.letterSpacing ?? 0)}px;`,
        `text-shadow: ${shadow};`
    ].join(" ");
};

const buildFontDetails = (style?: TextStyleCatalogEntry | null) => {
    if (!style) return "No style selected";
    const family = style.fontFamily ?? "—";
    const weight = style.fontWeight ?? "normal";
    const transform = style.textTransform ?? "none";
    return `${family} · ${weight} · ${transform}`;
};

export const createTextStylesDialog = (props: TextStylesDialogProps) => {
    const selected = props.selectedId
        ? props.styles.find(style => style.id === props.selectedId)
        : props.styles[0] ?? null;
    const selectedLabel = selected
        ? `${selected.categoryLabel ?? "Style"} / ${selected.name ?? selected.fontFamily ?? selected.id}`
        : "No style selected";
    const previewStyle = buildPreviewStyle(selected);

    const categoryNodes = props.categories.map((category) => {
        const isActive = category.id === props.activeCategoryId;
        return element(
            "div",
            {
                className: `text-styles-category${isActive ? " is-active" : ""}`,
                onClick: () => props.onSelectCategory(category.id)
            },
            element("div", { className: "text-styles-category-label" }, category.label),
            element("div", { className: "text-styles-category-count" }, `${category.count}`)
        );
    });

    const favoriteSet = new Set(props.favorites);
    const cards = props.styles.map((style) => {
        const isSelected = style.id === selected?.id;
        const isFavorite = favoriteSet.has(style.id);
        const cardPreview = props.previewText?.trim().length > 0 ? props.previewText : (style.preview ?? "The quick brown fox");
        const cardStyle = buildPreviewStyle(style);
        const chipLabel = style.categoryLabel ?? "Style";
        return element(
            "div",
            {
                className: `text-styles-card text-styles-card--${style.categoryId ?? "modern"}${isSelected ? " is-selected" : ""}`,
                onClick: () => props.onSelectStyle(style.id),
                onMouseEnter: () => props.onHoverStyle(style.id),
                onMouseLeave: () => props.onHoverStyle(null)
            },
            element(
                "div",
                { className: "text-styles-card-header" },
                element("div", { className: `text-styles-chip text-styles-chip--${style.categoryId ?? "modern"}` }, chipLabel),
                isFavorite ? element("span", { className: "text-styles-favorite" }, "★") : null
            ),
            element(
                "div",
                { className: "text-styles-info" },
                element("div", { className: "text-styles-card-preview", style: cardStyle }, cardPreview),
                element(
                    "div",
                    { className: "text-styles-meta" },
                    element("div", { className: "text-styles-name" }, style.name ?? style.fontFamily ?? "Untitled"),
                    element("div", { className: "text-styles-tags" }, buildFontDetails(style))
                )
            ),
            element(
                "button",
                {
                    className: "text-styles-action text-styles-action-primary text-styles-apply",
                    onClick: (event: React.MouseEvent) => {
                        event.stopPropagation();
                        props.onApplyStyle(style.id);
                    }
                },
                "Apply"
            )
        );
    });

    const statusBanner = props.statusMessage
        ? element(
            "div",
            { className: `status-bar text-styles-banner${props.statusTone === "error" ? " is-error" : props.statusTone === "success" ? " is-success" : ""}` },
            element("span", { className: "status-bar-field" }, props.statusMessage)
        )
        : null;

    return node(
        ControlKind.window,
        {
            title: "Text Styles",
            icon: "text",
            dialog: true,
            draggable: true,
            onClose: "ui-extension:text-styles:close",
            className: "text-styles-window window-resizable",
            bodyClassName: "text-styles-body",
            style: "position: absolute; left: 120px; top: 80px; width: min(1200px, 92vw); height: min(760px, 86vh);"
        },
            element(
                "div",
                { className: "text-styles-shell" },
                element(
                    "div",
                    { className: "text-styles-topbar" },
                element(
                    "div",
                    { className: "text-styles-field field-row-stacked" },
                    element("label", { className: "text-styles-label" }, "Search"),
                    element("input", {
                        className: "textbox text-styles-input",
                        type: "text",
                        value: props.search,
                        placeholder: "neon, editorial, 80s…",
                        onChange: (event: React.ChangeEvent<HTMLInputElement>) => props.onSearchChange(event.target.value)
                    })
                ),
                element(
                    "div",
                    { className: "text-styles-field field-row-stacked" },
                    element("label", { className: "text-styles-label" }, "Preview text"),
                    element("input", {
                        className: "textbox text-styles-input",
                        type: "text",
                        value: props.previewText,
                        placeholder: "The quick brown fox jumps…",
                        onChange: (event: React.ChangeEvent<HTMLInputElement>) => props.onPreviewChange(event.target.value)
                    })
                ),
                element(
                    "div",
                    { className: "text-styles-field field-row-stacked" },
                    element("label", { className: "text-styles-label" }, "Font source"),
                        element(
                            "select",
                            {
                                className: "combobox text-styles-input",
                                value: props.fontSource,
                                onChange: (event: React.ChangeEvent<HTMLSelectElement>) => props.onFontSourceChange(event.target.value)
                            },
                            element("option", { value: "Google Fonts" }, "Google Fonts")
                        )
                    ),
                    element(
                        "button",
                        {
                            className: "text-styles-action text-styles-action-primary default",
                            onClick: props.onRefresh,
                            disabled: props.isRefreshing
                        },
                        props.isRefreshing ? "Refreshing…" : "Load"
                    ),
                    element(
                        "button",
                        {
                            className: "text-styles-action text-styles-action-ai",
                            onClick: props.onAiPrompt
                        },
                        "AI Prompt"
                    ),
                    element(
                        "label",
                        { className: "checkbox-label text-styles-sync" },
                        element("input", {
                            className: "checkbox",
                            type: "checkbox",
                            checked: props.isSyncPreview,
                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => props.onToggleSyncPreview(event.target.checked)
                        }),
                        element("span", { className: "checkbox-text" }, "Sync preview to selection")
                    )
                ),
                statusBanner,
                element(
                    "div",
                    { className: "text-styles-layout" },
                    element(
                        "div",
                        { className: "text-styles-sidebar" },
                    element("div", { className: "text-styles-section-title" }, "Categories"),
                    element("div", { className: "text-styles-category-list sunken-panel" }, ...categoryNodes),
                    element("div", { className: "text-styles-section-title" }, "Filters"),
                    element(
                        "div",
                        { className: "text-styles-filter" },
                        element("div", { className: "text-styles-filter-label" }, "Weight"),
                        element(
                            "select",
                            {
                                className: "combobox text-styles-input",
                                value: props.weightFilter,
                                onChange: (event: React.ChangeEvent<HTMLSelectElement>) => props.onWeightFilterChange(event.target.value)
                            },
                            element("option", { value: "All" }, "All"),
                            element("option", { value: "300" }, "300"),
                            element("option", { value: "400" }, "400"),
                            element("option", { value: "500" }, "500"),
                            element("option", { value: "600" }, "600"),
                            element("option", { value: "700" }, "700"),
                            element("option", { value: "bold" }, "Bold")
                        )
                    ),
                    element(
                        "div",
                        { className: "text-styles-filter" },
                        element("div", { className: "text-styles-filter-label" }, "Case"),
                        element(
                            "select",
                            {
                                className: "combobox text-styles-input",
                                value: props.caseFilter,
                                onChange: (event: React.ChangeEvent<HTMLSelectElement>) => props.onCaseFilterChange(event.target.value)
                            },
                            element("option", { value: "Mixed" }, "Mixed"),
                            element("option", { value: "Uppercase" }, "Uppercase"),
                            element("option", { value: "Lowercase" }, "Lowercase")
                        )
                    ),
                    element(
                        "div",
                        { className: "text-styles-filter" },
                        element("div", { className: "text-styles-filter-label" }, "Shadow"),
                        element(
                            "select",
                            {
                                className: "combobox text-styles-input",
                                value: props.shadowFilter,
                                onChange: (event: React.ChangeEvent<HTMLSelectElement>) => props.onShadowFilterChange(event.target.value)
                            },
                            element("option", { value: "Any" }, "Any"),
                            element("option", { value: "None" }, "None"),
                            element("option", { value: "Soft" }, "Soft"),
                            element("option", { value: "Glow" }, "Glow")
                        )
                    )
                ),
                    element(
                        "div",
                        { className: "text-styles-grid" },
                        element(
                            "div",
                            { className: "text-styles-grid-header" },
                            element("div", { className: "text-styles-grid-title" }, `${props.activeCategoryId === "all" ? "All Styles" : (props.categories.find(c => c.id === props.activeCategoryId)?.label ?? "Styles")} · ${props.totalCount}`),
                            element("div", { className: "text-styles-grid-meta" }, `Showing ${props.styles.length} of ${props.totalCount}`)
                        ),
                        element(
                            "div",
                            {
                                className: "text-styles-cards sunken-panel",
                                onScroll: (event: React.UIEvent<HTMLDivElement>) => {
                                    if (!props.canLoadMore) return;
                                    const target = event.currentTarget;
                                    if (target.scrollHeight - target.scrollTop - target.clientHeight < 80) {
                                        props.onLoadMore();
                                    }
                                }
                            },
                            ...cards
                        ),
                        element(
                            "div",
                            { className: "text-styles-grid-footer" },
                            element("div", { className: "text-styles-grid-meta" }, buildFontDetails(selected)),
                            element(
                                "button",
                                { className: "text-styles-action text-styles-action-primary default", onClick: props.onApplySelected },
                                "Apply Selected"
                            ),
                            props.canLoadMore
                                ? element(
                                    "button",
                                    { className: "text-styles-action", onClick: props.onLoadMore },
                                    "Load more"
                                )
                                : null
                        )
                    ),
                    element(
                    "div",
                    { className: "text-styles-preview" },
                    element("div", { className: "text-styles-section-title" }, "Preview"),
                    element("div", { className: "text-styles-preview-meta" }, `Selected: ${selectedLabel}`),
                    element(
                        "div",
                        { className: "text-styles-preview-box sunken-panel", style: previewStyle },
                        props.previewText?.trim().length > 0 ? props.previewText : "The quick brown fox jumps over the lazy dog"
                    ),
                    element("div", { className: "text-styles-section-title" }, "Type your own"),
                    element("textarea", {
                        className: "textbox text-styles-input text-styles-textarea",
                        rows: 4,
                        value: props.customText,
                        placeholder: "Custom sample here…",
                        style: previewStyle,
                        onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => props.onCustomTextChange(event.target.value)
                    }),
                    element("div", { className: "text-styles-section-title" }, "Character map"),
                    element(
                        "div",
                        { className: "text-styles-charmap sunken-panel", style: previewStyle },
                        "A B C D E F G H I J K L",
                        element("br"),
                        "a b c d e f g h i j k l",
                        element("br"),
                        "0 1 2 3 4 5 6 7 8 9",
                        element("br"),
                        "! @ # $ % ^ & * ( )",
                        element("br"),
                        "á é í ó ú ñ ü ç ß ø å"
                    ),
                    element("div", { className: "text-styles-section-title" }, "Font details"),
                    element("div", { className: "text-styles-preview-meta" }, `Source: ${props.fontSource}`),
                    element("div", { className: "text-styles-preview-meta" }, buildFontDetails(selected)),
                    element(
                        "div",
                        { className: "text-styles-preview-actions" },
                        element(
                            "button",
                            { className: "text-styles-action text-styles-action-primary default", onClick: props.onApplySelected },
                            "Apply"
                        ),
                        element(
                            "button",
                            {
                                className: "text-styles-action",
                                onClick: () => {
                                    if (selected?.id) {
                                        props.onToggleFavorite(selected.id);
                                    }
                                }
                            },
                            selected?.id && favoriteSet.has(selected.id) ? "Unfavorite" : "Favorite"
                        )
                    )
                )
            )
        )
    );
};
