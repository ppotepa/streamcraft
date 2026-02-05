import React from "react";
import { WF } from "../../../../../../libs/forms";

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

export const buildTextStylesDialog = (props: TextStylesDialogProps) => {
    const selected = props.selectedId
        ? props.styles.find(style => style.id === props.selectedId)
        : props.styles[0] ?? null;
    const selectedLabel = selected
        ? `${selected.categoryLabel ?? "Style"} / ${selected.name ?? selected.fontFamily ?? selected.id}`
        : "No style selected";
    const previewStyle = buildPreviewStyle(selected);

    const categoryNodes = props.categories.map((category) => {
        const isActive = category.id === props.activeCategoryId;
        return WF.Element(
            "div",
            {
                className: `text-styles-category${isActive ? " is-active" : ""}`,
                onClick: () => props.onSelectCategory(category.id)
            },
            WF.Element("div", { className: "text-styles-category-label" }, category.label),
            WF.Element("div", { className: "text-styles-category-count" }, `${category.count}`)
        );
    });

    const favoriteSet = new Set(props.favorites);
    const cards = props.styles.map((style) => {
        const isSelected = style.id === selected?.id;
        const isFavorite = favoriteSet.has(style.id);
        const cardPreview = props.previewText?.trim().length > 0 ? props.previewText : (style.preview ?? "The quick brown fox");
        const cardStyle = buildPreviewStyle(style);
        const chipLabel = style.categoryLabel ?? "Style";
        return WF.Element(
            "div",
            {
                className: `text-styles-card text-styles-card--${style.categoryId ?? "modern"}${isSelected ? " is-selected" : ""}`,
                onClick: () => props.onSelectStyle(style.id),
                onMouseEnter: () => props.onHoverStyle(style.id),
                onMouseLeave: () => props.onHoverStyle(null)
            },
            WF.Element(
                "div",
                { className: "text-styles-card-header" },
                WF.Element("div", { className: `text-styles-chip text-styles-chip--${style.categoryId ?? "modern"}` }, chipLabel),
                isFavorite ? WF.Element("span", { className: "text-styles-favorite" }, "★") : null
            ),
            WF.Element(
                "div",
                { className: "text-styles-info" },
                WF.Element("div", { className: "text-styles-card-preview", style: cardStyle }, cardPreview),
                WF.Element(
                    "div",
                    { className: "text-styles-meta" },
                    WF.Element("div", { className: "text-styles-name" }, style.name ?? style.fontFamily ?? "Untitled"),
                    WF.Element("div", { className: "text-styles-tags" }, buildFontDetails(style))
                )
            ),
            WF.Element(
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
        ? WF.Element(
            "div",
            { className: `status-bar text-styles-banner${props.statusTone === "error" ? " is-error" : props.statusTone === "success" ? " is-success" : ""}` },
            WF.Element("span", { className: "status-bar-field" }, props.statusMessage)
        )
        : null;

    return WF.Window(
        {
            Text: "Text Styles",
            Icon: "text",
            Dialog: true,
            Draggable: true,
            OnClose: "ui-extension:text-styles:close",
            ClassName: "text-styles-window window-resizable",
            BodyClassName: "text-styles-body",
            Style: "position: absolute; left: 120px; top: 80px; width: min(1200px, 92vw); height: min(760px, 86vh);"
        },
            WF.Element(
                "div",
                { className: "text-styles-shell" },
                WF.Element(
                    "div",
                    { className: "text-styles-topbar" },
                WF.Element(
                    "div",
                    { className: "text-styles-field field-row-stacked" },
                    WF.Element("label", { className: "text-styles-label" }, "Search"),
                    WF.Element("input", {
                        className: "textbox text-styles-input",
                        type: "text",
                        value: props.search,
                        placeholder: "neon, editorial, 80s…",
                        onChange: (event: React.ChangeEvent<HTMLInputElement>) => props.onSearchChange(event.target.value)
                    })
                ),
                WF.Element(
                    "div",
                    { className: "text-styles-field field-row-stacked" },
                    WF.Element("label", { className: "text-styles-label" }, "Preview text"),
                    WF.Element("input", {
                        className: "textbox text-styles-input",
                        type: "text",
                        value: props.previewText,
                        placeholder: "The quick brown fox jumps…",
                        onChange: (event: React.ChangeEvent<HTMLInputElement>) => props.onPreviewChange(event.target.value)
                    })
                ),
                WF.Element(
                    "div",
                    { className: "text-styles-field field-row-stacked" },
                    WF.Element("label", { className: "text-styles-label" }, "Font source"),
                        WF.Element(
                            "select",
                            {
                                className: "combobox text-styles-input",
                                value: props.fontSource,
                                onChange: (event: React.ChangeEvent<HTMLSelectElement>) => props.onFontSourceChange(event.target.value)
                            },
                            WF.Element("option", { value: "Google Fonts" }, "Google Fonts")
                        )
                    ),
                    WF.Element(
                        "button",
                        {
                            className: "text-styles-action text-styles-action-primary default",
                            onClick: props.onRefresh,
                            disabled: props.isRefreshing
                        },
                        props.isRefreshing ? "Refreshing…" : "Load"
                    ),
                    WF.Element(
                        "button",
                        {
                            className: "text-styles-action text-styles-action-ai",
                            onClick: props.onAiPrompt
                        },
                        "AI Prompt"
                    ),
                    WF.Element(
                        "label",
                        { className: "checkbox-label text-styles-sync" },
                        WF.Element("input", {
                            className: "checkbox",
                            type: "checkbox",
                            checked: props.isSyncPreview,
                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => props.onToggleSyncPreview(event.target.checked)
                        }),
                        WF.Element("span", { className: "checkbox-text" }, "Sync preview to selection")
                    )
                ),
                statusBanner,
                WF.Element(
                    "div",
                    { className: "text-styles-layout" },
                    WF.Element(
                        "div",
                        { className: "text-styles-sidebar" },
                    WF.Element("div", { className: "text-styles-section-title" }, "Categories"),
                    WF.Element("div", { className: "text-styles-category-list sunken-panel" }, ...categoryNodes),
                    WF.Element("div", { className: "text-styles-section-title" }, "Filters"),
                    WF.Element(
                        "div",
                        { className: "text-styles-filter" },
                        WF.Element("div", { className: "text-styles-filter-label" }, "Weight"),
                        WF.Element(
                            "select",
                            {
                                className: "combobox text-styles-input",
                                value: props.weightFilter,
                                onChange: (event: React.ChangeEvent<HTMLSelectElement>) => props.onWeightFilterChange(event.target.value)
                            },
                            WF.Element("option", { value: "All" }, "All"),
                            WF.Element("option", { value: "300" }, "300"),
                            WF.Element("option", { value: "400" }, "400"),
                            WF.Element("option", { value: "500" }, "500"),
                            WF.Element("option", { value: "600" }, "600"),
                            WF.Element("option", { value: "700" }, "700"),
                            WF.Element("option", { value: "bold" }, "Bold")
                        )
                    ),
                    WF.Element(
                        "div",
                        { className: "text-styles-filter" },
                        WF.Element("div", { className: "text-styles-filter-label" }, "Case"),
                        WF.Element(
                            "select",
                            {
                                className: "combobox text-styles-input",
                                value: props.caseFilter,
                                onChange: (event: React.ChangeEvent<HTMLSelectElement>) => props.onCaseFilterChange(event.target.value)
                            },
                            WF.Element("option", { value: "Mixed" }, "Mixed"),
                            WF.Element("option", { value: "Uppercase" }, "Uppercase"),
                            WF.Element("option", { value: "Lowercase" }, "Lowercase")
                        )
                    ),
                    WF.Element(
                        "div",
                        { className: "text-styles-filter" },
                        WF.Element("div", { className: "text-styles-filter-label" }, "Shadow"),
                        WF.Element(
                            "select",
                            {
                                className: "combobox text-styles-input",
                                value: props.shadowFilter,
                                onChange: (event: React.ChangeEvent<HTMLSelectElement>) => props.onShadowFilterChange(event.target.value)
                            },
                            WF.Element("option", { value: "Any" }, "Any"),
                            WF.Element("option", { value: "None" }, "None"),
                            WF.Element("option", { value: "Soft" }, "Soft"),
                            WF.Element("option", { value: "Glow" }, "Glow")
                        )
                    )
                ),
                    WF.Element(
                        "div",
                        { className: "text-styles-grid" },
                        WF.Element(
                            "div",
                            { className: "text-styles-grid-header" },
                            WF.Element("div", { className: "text-styles-grid-title" }, `${props.activeCategoryId === "all" ? "All Styles" : (props.categories.find(c => c.id === props.activeCategoryId)?.label ?? "Styles")} · ${props.totalCount}`),
                            WF.Element("div", { className: "text-styles-grid-meta" }, `Showing ${props.styles.length} of ${props.totalCount}`)
                        ),
                        WF.Element(
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
                        WF.Element(
                            "div",
                            { className: "text-styles-grid-footer" },
                            WF.Element("div", { className: "text-styles-grid-meta" }, buildFontDetails(selected)),
                            WF.Element(
                                "button",
                                { className: "text-styles-action text-styles-action-primary default", onClick: props.onApplySelected },
                                "Apply Selected"
                            ),
                            props.canLoadMore
                                ? WF.Element(
                                    "button",
                                    { className: "text-styles-action", onClick: props.onLoadMore },
                                    "Load more"
                                )
                                : null
                        )
                    ),
                    WF.Element(
                    "div",
                    { className: "text-styles-preview" },
                    WF.Element("div", { className: "text-styles-section-title" }, "Preview"),
                    WF.Element("div", { className: "text-styles-preview-meta" }, `Selected: ${selectedLabel}`),
                    WF.Element(
                        "div",
                        { className: "text-styles-preview-box sunken-panel", style: previewStyle },
                        props.previewText?.trim().length > 0 ? props.previewText : "The quick brown fox jumps over the lazy dog"
                    ),
                    WF.Element("div", { className: "text-styles-section-title" }, "Type your own"),
                    WF.Element("textarea", {
                        className: "textbox text-styles-input text-styles-textarea",
                        rows: 4,
                        value: props.customText,
                        placeholder: "Custom sample here…",
                        style: previewStyle,
                        onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => props.onCustomTextChange(event.target.value)
                    }),
                    WF.Element("div", { className: "text-styles-section-title" }, "Character map"),
                    WF.Element(
                        "div",
                        { className: "text-styles-charmap sunken-panel", style: previewStyle },
                        "A B C D E F G H I J K L",
                        WF.Element("br"),
                        "a b c d e f g h i j k l",
                        WF.Element("br"),
                        "0 1 2 3 4 5 6 7 8 9",
                        WF.Element("br"),
                        "! @ # $ % ^ & * ( )",
                        WF.Element("br"),
                        "á é í ó ú ñ ü ç ß ø å"
                    ),
                    WF.Element("div", { className: "text-styles-section-title" }, "Font details"),
                    WF.Element("div", { className: "text-styles-preview-meta" }, `Source: ${props.fontSource}`),
                    WF.Element("div", { className: "text-styles-preview-meta" }, buildFontDetails(selected)),
                    WF.Element(
                        "div",
                        { className: "text-styles-preview-actions" },
                        WF.Element(
                            "button",
                            { className: "text-styles-action text-styles-action-primary default", onClick: props.onApplySelected },
                            "Apply"
                        ),
                        WF.Element(
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

