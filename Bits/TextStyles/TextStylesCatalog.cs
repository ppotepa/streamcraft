using StreamCraft.Core.Media.Fonts;
using StreamCraft.Core.Ui.Extensions;

namespace StreamCraft.Bits.TextStyles;

internal sealed record TextStyleDefinition
{
    public string Id { get; init; } = string.Empty;
    public string CategoryId { get; init; } = "modern";
    public string CategoryLabel { get; init; } = "Modern UI";
    public string Name { get; init; } = string.Empty;
    public string Preview { get; init; } = "The quick brown fox";
    public string FontFamily { get; init; } = "Segoe UI";
    public int FontSize { get; init; } = 16;
    public string FontWeight { get; init; } = "normal";
    public string FontStyle { get; init; } = "normal";
    public string TextColor { get; init; } = "#1b1b1b";
    public string TextTransform { get; init; } = "none";
    public double LetterSpacing { get; init; }
    public int TextShadowX { get; init; }
    public int TextShadowY { get; init; }
    public int TextShadowBlur { get; init; }
    public string TextShadowColor { get; init; } = "rgba(0,0,0,0.35)";
}

internal static class TextStylesCatalog
{
    private const int TargetStyleCount = 100;

    private sealed record TextStyleCategory(string Id, string Label, string[] Fonts);

    private static readonly TextStyleCategory[] DefaultCategories =
    [
        new("modern", "Modern UI", new[] { "Inter", "Manrope", "Source Sans 3", "Segoe UI" }),
        new("retro", "Retro", new[] { "VT323", "Press Start 2P", "Courier New" }),
        new("editorial", "Editorial", new[] { "Playfair Display", "Merriweather", "Georgia" }),
        new("neon", "Neon / Glitch", new[] { "Orbitron", "Rubik", "Verdana" }),
        new("designer", "Designer", new[] { "Montserrat", "Bebas Neue", "Arial Black" }),
        new("overlay", "Stream / Overlay", new[] { "Oswald", "Roboto Condensed", "Arial" }),
        new("mono", "Mono / Code", new[] { "JetBrains Mono", "Roboto Mono", "Courier New" })
    ];

    private static readonly string[] Weights =
    [
        "normal",
        "600",
        "bold"
    ];

    private static readonly string[] Transforms =
    [
        "none",
        "uppercase",
        "lowercase"
    ];

    private static readonly int[] Sizes =
    [
        14,
        16,
        18,
        20,
        22
    ];

    private static readonly Dictionary<string, string[]> CategoryPalettes = new()
    {
        ["modern"] = ["#0f172a", "#1f4e79", "#334155"],
        ["retro"] = ["#7a2f2f", "#925f1b", "#b45309"],
        ["editorial"] = ["#1f2937", "#374151", "#111827"],
        ["neon"] = ["#7dd3fc", "#f472b6", "#a78bfa"],
        ["designer"] = ["#0f172a", "#0f766e", "#1d4ed8"],
        ["overlay"] = ["#0f172a", "#166534", "#1f2937"],
        ["mono"] = ["#1f2937", "#334155", "#0f172a"]
    };

    private static readonly Dictionary<string, (int x, int y, int blur, string color)[]> CategoryShadows = new()
    {
        ["modern"] = [(0, 0, 0, "rgba(0,0,0,0)"), (0, 1, 2, "rgba(15,23,42,0.18)")],
        ["retro"] = [(1, 1, 0, "rgba(0,0,0,0.35)"), (2, 2, 2, "rgba(0,0,0,0.35)")],
        ["editorial"] = [(0, 0, 0, "rgba(0,0,0,0)"), (0, 2, 3, "rgba(15,23,42,0.2)")],
        ["neon"] = [(0, 0, 6, "rgba(59,130,246,0.6)"), (0, 0, 10, "rgba(236,72,153,0.45)")],
        ["designer"] = [(0, 0, 0, "rgba(0,0,0,0)"), (1, 2, 2, "rgba(15,23,42,0.25)")],
        ["overlay"] = [(0, 0, 2, "rgba(15,23,42,0.35)"), (1, 1, 3, "rgba(15,23,42,0.35)")],
        ["mono"] = [(0, 0, 0, "rgba(0,0,0,0)"), (0, 1, 1, "rgba(15,23,42,0.25)")]
    };

    public static IReadOnlyList<TextStyleDefinition> BuildStyles(IReadOnlyList<CachedFontFamily>? cachedFonts = null)
    {
        var categories = BuildCategories(cachedFonts);
        var styles = new List<TextStyleDefinition>(TargetStyleCount);
        var index = 1;

        foreach (var category in categories)
        {
            foreach (var font in category.Fonts)
            {
                foreach (var weight in Weights)
                {
                    var palette = ResolvePalette(category.Id);
                    var shadows = ResolveShadows(category.Id);

                    foreach (var transform in Transforms)
                    {
                        if (styles.Count >= TargetStyleCount)
                        {
                            return styles;
                        }

                        var color = palette[(index - 1) % palette.Length];
                        var size = Sizes[(index - 1) % Sizes.Length];
                        var shadow = shadows[(index - 1) % shadows.Length];
                        var letterSpacing = index % 5 == 0 ? 1 : 0;
                        var name = $"{category.Label} · {font}";

                        styles.Add(new TextStyleDefinition
                        {
                            Id = $"style-{index:000}",
                            CategoryId = category.Id,
                            CategoryLabel = category.Label,
                            Name = name,
                            Preview = "The quick brown fox",
                            FontFamily = font,
                            FontSize = size,
                            FontWeight = weight,
                            FontStyle = index % 7 == 0 ? "italic" : "normal",
                            TextColor = color,
                            TextTransform = transform,
                            LetterSpacing = letterSpacing,
                            TextShadowX = shadow.x,
                            TextShadowY = shadow.y,
                            TextShadowBlur = shadow.blur,
                            TextShadowColor = shadow.color
                        });

                        index++;
                    }
                }
            }
        }

        return styles;
    }

    public static IReadOnlyList<DesignerUiExtensionDefinition> BuildExtensions(IReadOnlyList<CachedFontFamily>? cachedFonts = null)
    {
        var categories = BuildCategories(cachedFonts);
        var styles = BuildStyles(cachedFonts);
        var triggerExtension = new DesignerUiExtensionDefinition
        {
            Id = "text-styles.trigger",
            Group = "text-styles",
            Title = "Text Styles Trigger",
            Targets = new[] { "text.properties.effects" },
            Order = 50,
            Form = BuildTriggerForm()
        };

        var dialogExtension = new DesignerUiExtensionDefinition
        {
            Id = "text-styles.dialog",
            Group = "text-styles",
            Title = "Text Styles Catalog",
            Targets = new[] { "designer.dialogs" },
            Order = 10,
            Form = BuildDialogForm(styles, categories),
            Data = new Dictionary<string, object?> { ["styles"] = styles }
        };

        return new[] { triggerExtension, dialogExtension };
    }

    private static UiFormNode BuildTriggerForm()
    {
        return UiForm.Node(
            "button",
            new Dictionary<string, object?>
            {
                ["text"] = "Styles",
                ["className"] = "canvas-properties-button text-styles-trigger",
                ["onClick"] = "ui-extension:text-styles:open"
            });
    }

    private static UiFormNode BuildDialogForm(IReadOnlyList<TextStyleDefinition> styles, IReadOnlyList<TextStyleCategory> categories)
    {
        var activeCategory = categories[0];
        var categoryStyles = styles.Where(style => style.CategoryId == activeCategory.Id).ToArray();
        var visibleStyles = categoryStyles.Take(12).ToArray();
        var cards = visibleStyles
            .Select(BuildCard)
            .Cast<object?>()
            .ToArray();

        var categoryNodes = categories
            .Select((category, index) =>
            {
                var count = styles.Count(style => style.CategoryId == category.Id);
                var className = $"text-styles-category{(index == 0 ? " is-active" : "")}";
                return UiForm.Element(
                    "div",
                    new Dictionary<string, object?> { ["className"] = className },
                    UiForm.Element("div", new Dictionary<string, object?> { ["className"] = "text-styles-category-label" }, category.Label),
                    UiForm.Element("div", new Dictionary<string, object?> { ["className"] = "text-styles-category-count" }, count.ToString())
                );
            })
            .Cast<object?>()
            .ToArray();

        var selectedStyle = visibleStyles.FirstOrDefault();
        var selectedLabel = selectedStyle != null
            ? $"{selectedStyle.CategoryLabel} / {selectedStyle.Name}"
            : "No style selected";
        var selectedPreviewStyle = selectedStyle != null ? BuildPreviewStyle(selectedStyle) : null;

        return UiForm.Node(
            "window",
            new Dictionary<string, object?>
            {
                ["title"] = "Text Styles",
                ["icon"] = "text",
                ["dialog"] = true,
                ["draggable"] = true,
                ["className"] = "text-styles-window window-resizable",
                ["bodyClassName"] = "text-styles-body",
                ["style"] = "position: absolute; left: 120px; top: 80px; width: min(1200px, 92vw); height: min(760px, 86vh);",
                ["onClose"] = "ui-extension:text-styles:close"
            },
            UiForm.Element(
                "div",
                new Dictionary<string, object?> { ["className"] = "text-styles-shell" },
                UiForm.Element(
                    "div",
                    new Dictionary<string, object?> { ["className"] = "text-styles-topbar" },
                    UiForm.Element(
                        "div",
                        new Dictionary<string, object?> { ["className"] = "text-styles-field" },
                        UiForm.Element("label", new Dictionary<string, object?> { ["className"] = "text-styles-label" }, "Search"),
                        UiForm.Node("textBox", new Dictionary<string, object?>
                        {
                            ["className"] = "text-styles-input",
                            ["placeholder"] = "neon, editorial, 80s…"
                        })
                    ),
                    UiForm.Element(
                        "div",
                        new Dictionary<string, object?> { ["className"] = "text-styles-field" },
                        UiForm.Element("label", new Dictionary<string, object?> { ["className"] = "text-styles-label" }, "Preview text"),
                        UiForm.Node("textBox", new Dictionary<string, object?>
                        {
                            ["className"] = "text-styles-input",
                            ["placeholder"] = "The quick brown fox jumps…"
                        })
                    ),
                    UiForm.Element(
                        "div",
                        new Dictionary<string, object?> { ["className"] = "text-styles-field" },
                        UiForm.Element("label", new Dictionary<string, object?> { ["className"] = "text-styles-label" }, "Font source"),
                        UiForm.Node("comboBox", new Dictionary<string, object?>
                        {
                            ["className"] = "text-styles-input",
                            ["items"] = "Google Fonts"
                        })
                    ),
                    UiForm.Node("button", new Dictionary<string, object?>
                    {
                        ["text"] = "Load",
                        ["className"] = "text-styles-action text-styles-action-primary"
                    }),
                    UiForm.Node("button", new Dictionary<string, object?>
                    {
                        ["text"] = "AI Prompt",
                        ["className"] = "text-styles-action text-styles-action-ai"
                    })
                ),
                UiForm.Element(
                    "div",
                    new Dictionary<string, object?> { ["className"] = "text-styles-layout" },
                    UiForm.Element(
                        "div",
                        new Dictionary<string, object?> { ["className"] = "text-styles-sidebar" },
                        UiForm.Element("div", new Dictionary<string, object?> { ["className"] = "text-styles-section-title" }, "Categories"),
                        UiForm.Element("div", new Dictionary<string, object?> { ["className"] = "text-styles-category-list" }, categoryNodes),
                        UiForm.Element("div", new Dictionary<string, object?> { ["className"] = "text-styles-section-title" }, "Filters"),
                        UiForm.Element(
                            "div",
                            new Dictionary<string, object?> { ["className"] = "text-styles-filter" },
                            UiForm.Element("div", new Dictionary<string, object?> { ["className"] = "text-styles-filter-label" }, "Weight"),
                            UiForm.Node("comboBox", new Dictionary<string, object?>
                            {
                                ["items"] = "All,300,400,500,600,700",
                                ["className"] = "text-styles-input"
                            })
                        ),
                        UiForm.Element(
                            "div",
                            new Dictionary<string, object?> { ["className"] = "text-styles-filter" },
                            UiForm.Element("div", new Dictionary<string, object?> { ["className"] = "text-styles-filter-label" }, "Case"),
                            UiForm.Node("comboBox", new Dictionary<string, object?>
                            {
                                ["items"] = "Mixed,Uppercase,Lowercase",
                                ["className"] = "text-styles-input"
                            })
                        ),
                        UiForm.Element(
                            "div",
                            new Dictionary<string, object?> { ["className"] = "text-styles-filter" },
                            UiForm.Element("div", new Dictionary<string, object?> { ["className"] = "text-styles-filter-label" }, "Shadow"),
                            UiForm.Node("comboBox", new Dictionary<string, object?>
                            {
                                ["items"] = "Any,None,Soft,Glow",
                                ["className"] = "text-styles-input"
                            })
                        )
                    ),
                    UiForm.Element(
                        "div",
                        new Dictionary<string, object?> { ["className"] = "text-styles-grid" },
                        UiForm.Element(
                            "div",
                            new Dictionary<string, object?> { ["className"] = "text-styles-grid-header" },
                            UiForm.Element("div", new Dictionary<string, object?> { ["className"] = "text-styles-grid-title" }, $"{activeCategory.Label} · {categoryStyles.Length} styles"),
                            UiForm.Element("div", new Dictionary<string, object?> { ["className"] = "text-styles-grid-meta" }, $"Showing {visibleStyles.Length} of {categoryStyles.Length}")
                        ),
                        UiForm.Element("div", new Dictionary<string, object?> { ["className"] = "text-styles-cards" }, cards),
                        UiForm.Element(
                            "div",
                            new Dictionary<string, object?> { ["className"] = "text-styles-grid-footer" },
                            UiForm.Element("div", new Dictionary<string, object?> { ["className"] = "text-styles-grid-meta" }, "Page 1 of 3"),
                            UiForm.Node("button", new Dictionary<string, object?> { ["text"] = "Prev", ["className"] = "text-styles-action" }),
                            UiForm.Node("button", new Dictionary<string, object?> { ["text"] = "Next", ["className"] = "text-styles-action" })
                        )
                    ),
                    UiForm.Element(
                        "div",
                        new Dictionary<string, object?> { ["className"] = "text-styles-preview" },
                        UiForm.Element("div", new Dictionary<string, object?> { ["className"] = "text-styles-section-title" }, "Preview"),
                        UiForm.Element("div", new Dictionary<string, object?> { ["className"] = "text-styles-preview-meta" }, $"Selected: {selectedLabel}"),
                        UiForm.Element(
                            "div",
                            new Dictionary<string, object?>
                            {
                                ["className"] = "text-styles-preview-box",
                                ["style"] = selectedPreviewStyle
                            },
                            "The quick brown fox jumps over the lazy dog"
                        ),
                        UiForm.Element("div", new Dictionary<string, object?> { ["className"] = "text-styles-section-title" }, "Type your own"),
                        UiForm.Node("textBox", new Dictionary<string, object?>
                        {
                            ["className"] = "text-styles-input text-styles-textarea",
                            ["placeholder"] = "Custom sample here…",
                            ["multiline"] = true,
                            ["rows"] = 3,
                            ["style"] = selectedPreviewStyle
                        }),
                        UiForm.Element("div", new Dictionary<string, object?> { ["className"] = "text-styles-section-title" }, "Character map"),
                        UiForm.Element("div", new Dictionary<string, object?> { ["className"] = "text-styles-charmap" },
                            "A B C D E F G H I J K L",
                            UiForm.Element("br"),
                            "a b c d e f g h i j k l",
                            UiForm.Element("br"),
                            "0 1 2 3 4 5 6 7 8 9",
                            UiForm.Element("br"),
                            "! @ # $ % ^ & * ( )",
                            UiForm.Element("br"),
                            "á é í ó ú ñ ü ç ß ø å"
                        ),
                        UiForm.Element("div", new Dictionary<string, object?> { ["className"] = "text-styles-section-title" }, "Font details"),
                        UiForm.Element("div", new Dictionary<string, object?> { ["className"] = "text-styles-preview-meta" }, "Source: Google Fonts"),
                        UiForm.Element("div", new Dictionary<string, object?> { ["className"] = "text-styles-preview-meta" }, "Weights: 300 400 500 600 700"),
                        UiForm.Element("div", new Dictionary<string, object?> { ["className"] = "text-styles-preview-actions" },
                            UiForm.Node("button", new Dictionary<string, object?> { ["text"] = "Apply", ["className"] = "text-styles-action text-styles-action-primary" }),
                            UiForm.Node("button", new Dictionary<string, object?> { ["text"] = "Favorite", ["className"] = "text-styles-action" })
                        )
                    )
                )
            )
        );
    }

    private static UiFormNode BuildCard(TextStyleDefinition style)
    {
        var previewStyle = BuildPreviewStyle(style);

        var preview = UiForm.Element(
            "div",
            new Dictionary<string, object?>
            {
                ["className"] = "text-styles-card-preview",
                ["style"] = previewStyle
            },
            style.Preview
        );

        var meta = UiForm.Element(
            "div",
            new Dictionary<string, object?> { ["className"] = "text-styles-meta" },
            UiForm.Element(
                "div",
                new Dictionary<string, object?> { ["className"] = "text-styles-name" },
                style.Name
            ),
            UiForm.Element(
                "div",
                new Dictionary<string, object?> { ["className"] = "text-styles-tags" },
                $"{style.FontFamily} · {style.FontWeight} · {style.FontSize}px"
            )
        );

        var info = UiForm.Element(
            "div",
            new Dictionary<string, object?> { ["className"] = "text-styles-info" },
            preview,
            meta
        );

        var apply = UiForm.Node(
            "button",
            new Dictionary<string, object?>
            {
                ["text"] = "Apply",
                ["className"] = "text-styles-action text-styles-action-primary text-styles-apply",
                ["onClick"] = $"ui-extension:text-styles:apply:{style.Id}"
            }
        );

        return UiForm.Element(
            "div",
            new Dictionary<string, object?>
            {
                ["className"] = $"text-styles-card text-styles-card--{style.CategoryId}"
            },
            UiForm.Element(
                "div",
                new Dictionary<string, object?> { ["className"] = "text-styles-card-header" },
                UiForm.Element(
                    "div",
                    new Dictionary<string, object?> { ["className"] = $"text-styles-chip text-styles-chip--{style.CategoryId}" },
                    style.CategoryLabel
                )
            ),
            info,
            apply
        );
    }

    private static string BuildPreviewStyle(TextStyleDefinition style)
    {
        var shadow = style.TextShadowBlur > 0
            ? $"{style.TextShadowX}px {style.TextShadowY}px {style.TextShadowBlur}px {style.TextShadowColor}"
            : "none";

        return string.Join(" ", new[]
        {
            $"font-family: '{style.FontFamily}';",
            $"font-size: {style.FontSize}px;",
            $"font-weight: {style.FontWeight};",
            $"font-style: {style.FontStyle};",
            $"color: {style.TextColor};",
            $"text-transform: {style.TextTransform};",
            $"letter-spacing: {style.LetterSpacing}px;",
            $"text-shadow: {shadow};"
        });
    }

    private static string[] ResolvePalette(string categoryId)
    {
        return CategoryPalettes.TryGetValue(categoryId, out var palette) ? palette : ["#0f172a"];
    }

    private static (int x, int y, int blur, string color)[] ResolveShadows(string categoryId)
    {
        return CategoryShadows.TryGetValue(categoryId, out var shadows) ? shadows : [(0, 0, 0, "rgba(0,0,0,0)")];
    }

    private static IReadOnlyList<TextStyleCategory> BuildCategories(IReadOnlyList<CachedFontFamily>? cachedFonts)
    {
        if (cachedFonts == null || cachedFonts.Count == 0)
        {
            return DefaultCategories;
        }

        var familiesByCategory = cachedFonts
            .Where(family => !string.IsNullOrWhiteSpace(family.Family))
            .GroupBy(family => family.Category ?? string.Empty, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                group => group.Key.Trim().ToLowerInvariant(),
                group => group
                    .OrderBy(f => f.PopularityRank > 0 ? f.PopularityRank : int.MaxValue)
                    .Select(f => f.Family)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToArray(),
                StringComparer.OrdinalIgnoreCase);

        string[] ResolveFonts(string categoryKey, string[] fallback, int limit = 6)
        {
            if (familiesByCategory.TryGetValue(categoryKey, out var candidates) && candidates.Length > 0)
            {
                return MergeFonts(candidates, fallback, limit);
            }
            return fallback;
        }

        return new[]
        {
            new TextStyleCategory("modern", "Modern UI", ResolveFonts("sans-serif", DefaultCategories[0].Fonts)),
            new TextStyleCategory("retro", "Retro", ResolveFonts("display", DefaultCategories[1].Fonts)),
            new TextStyleCategory("editorial", "Editorial", ResolveFonts("serif", DefaultCategories[2].Fonts)),
            new TextStyleCategory("neon", "Neon / Glitch", ResolveFonts("display", DefaultCategories[3].Fonts)),
            new TextStyleCategory("designer", "Designer", ResolveFonts("sans-serif", DefaultCategories[4].Fonts)),
            new TextStyleCategory("overlay", "Stream / Overlay", ResolveFonts("sans-serif", DefaultCategories[5].Fonts)),
            new TextStyleCategory("mono", "Mono / Code", ResolveFonts("monospace", DefaultCategories[6].Fonts))
        };
    }

    private static string[] MergeFonts(string[] primary, string[] fallback, int limit)
    {
        var results = new List<string>(limit);
        foreach (var font in primary)
        {
            if (results.Count >= limit) break;
            if (string.IsNullOrWhiteSpace(font)) continue;
            if (results.Contains(font, StringComparer.OrdinalIgnoreCase)) continue;
            results.Add(font);
        }

        foreach (var font in fallback)
        {
            if (results.Count >= limit) break;
            if (string.IsNullOrWhiteSpace(font)) continue;
            if (results.Contains(font, StringComparer.OrdinalIgnoreCase)) continue;
            results.Add(font);
        }

        return results.ToArray();
    }
}




