using Core.Designer;

namespace StreamCraft.Bits.TextStyles;

internal sealed record TextStyleDefinition
{
    public string Id { get; init; } = string.Empty;
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

    private static readonly string[] Fonts =
    [
        "Segoe UI",
        "Arial",
        "Verdana",
        "Georgia",
        "Times New Roman",
        "Courier New"
    ];

    private static readonly string[] Weights =
    [
        "normal",
        "600",
        "bold"
    ];

    private static readonly string[] Colors =
    [
        "#1b1b1b",
        "#1f4e79",
        "#7a2f2f",
        "#2f6b3f",
        "#5a3f7a",
        "#925f1b"
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

    private static readonly (int x, int y, int blur, string color)[] Shadows =
    [
        (0, 0, 0, "rgba(0,0,0,0)"),
        (1, 1, 2, "rgba(0,0,0,0.25)"),
        (2, 2, 4, "rgba(0,0,0,0.35)")
    ];

    public static IReadOnlyList<TextStyleDefinition> BuildStyles()
    {
        var styles = new List<TextStyleDefinition>(TargetStyleCount);
        var index = 1;

        foreach (var font in Fonts)
        {
            foreach (var weight in Weights)
            {
                foreach (var color in Colors)
                {
                    foreach (var transform in Transforms)
                    {
                        if (styles.Count >= TargetStyleCount)
                        {
                            return styles;
                        }

                        var size = Sizes[(index - 1) % Sizes.Length];
                        var shadow = Shadows[(index - 1) % Shadows.Length];
                        var letterSpacing = index % 5 == 0 ? 1 : 0;
                        var name = $"Style {index:000} · {font}";

                        styles.Add(new TextStyleDefinition
                        {
                            Id = $"style-{index:000}",
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

    public static IReadOnlyList<DesignerUiExtensionDefinition> BuildExtensions()
    {
        var styles = BuildStyles();
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
            Form = BuildDialogForm(styles),
            Data = new { styles }
        };

        return new[] { triggerExtension, dialogExtension };
    }

    private static DesignerUiFormNode BuildTriggerForm()
    {
        return DesignerUiForm.Node(
            "button",
            new Dictionary<string, object?>
            {
                ["text"] = "Styles",
                ["className"] = "canvas-properties-button text-styles-trigger",
                ["onClick"] = "ui-extension:text-styles:open"
            });
    }

    private static DesignerUiFormNode BuildDialogForm(IReadOnlyList<TextStyleDefinition> styles)
    {
        var cards = styles
            .Select(BuildCard)
            .Cast<object?>()
            .ToArray();

        return DesignerUiForm.Node(
            "window",
            new Dictionary<string, object?>
            {
                ["title"] = "Text Styles",
                ["icon"] = "text",
                ["dialog"] = true,
                ["draggable"] = true,
                ["className"] = "text-styles-window window-resizable",
                ["bodyClassName"] = "text-styles-body",
                ["style"] = "position: absolute; left: 180px; top: 120px; width: min(720px, 90vw); height: min(640px, 82vh);",
                ["onClose"] = "ui-extension:text-styles:close"
            },
            DesignerUiForm.Element(
                "div",
                new Dictionary<string, object?> { ["className"] = "text-styles-header" },
                DesignerUiForm.Element(
                    "div",
                    new Dictionary<string, object?> { ["className"] = "text-styles-title" },
                    "Text Styles Catalogue"
                ),
                DesignerUiForm.Element(
                    "div",
                    new Dictionary<string, object?> { ["className"] = "text-styles-count" },
                    $"{styles.Count} styles"
                )
            ),
            DesignerUiForm.Element(
                "div",
                new Dictionary<string, object?> { ["className"] = "text-styles-list" },
                cards
            )
        );
    }

    private static DesignerUiFormNode BuildCard(TextStyleDefinition style)
    {
        var previewStyle = BuildPreviewStyle(style);

        var preview = DesignerUiForm.Element(
            "div",
            new Dictionary<string, object?>
            {
                ["className"] = "text-styles-preview",
                ["style"] = previewStyle
            },
            style.Preview
        );

        var meta = DesignerUiForm.Element(
            "div",
            new Dictionary<string, object?> { ["className"] = "text-styles-meta" },
            DesignerUiForm.Element(
                "div",
                new Dictionary<string, object?> { ["className"] = "text-styles-name" },
                style.Name
            ),
            DesignerUiForm.Element(
                "div",
                new Dictionary<string, object?> { ["className"] = "text-styles-tags" },
                $"{style.FontFamily} · {style.FontWeight} · {style.FontSize}px"
            )
        );

        var info = DesignerUiForm.Element(
            "div",
            new Dictionary<string, object?> { ["className"] = "text-styles-info" },
            preview,
            meta
        );

        var apply = DesignerUiForm.Node(
            "button",
            new Dictionary<string, object?>
            {
                ["text"] = "Apply",
                ["className"] = "text-styles-apply",
                ["onClick"] = $"ui-extension:text-styles:apply:{style.Id}"
            }
        );

        return DesignerUiForm.Element(
            "div",
            new Dictionary<string, object?> { ["className"] = "text-styles-card" },
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
}
