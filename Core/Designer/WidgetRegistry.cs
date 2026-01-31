namespace Core.Designer;

public sealed class WidgetRegistry : IWidgetRegistry
{
    private readonly List<WidgetDefinition> _widgets = new();

    public WidgetRegistry()
    {
        RegisterRange(new[]
        {
            new WidgetDefinition("label", "Label", "Plain text label bound to a field.", "Text"),
            new WidgetDefinition("value-card", "Value Card", "Title + primary value + optional delta.", "Text"),
            new WidgetDefinition("list", "List", "Repeat a template for array items.", "Layout"),
            new WidgetDefinition("image", "Image", "Image from URL with fallback.", "Media"),
            new WidgetDefinition("progress", "Progress Bar", "Numeric value rendered as progress.", "Visual")
        });
    }

    public IReadOnlyList<WidgetDefinition> GetAll() => _widgets.AsReadOnly();

    public void Register(WidgetDefinition widget)
    {
        if (widget == null) return;
        if (_widgets.Any(w => string.Equals(w.Id, widget.Id, StringComparison.OrdinalIgnoreCase)))
        {
            return;
        }

        _widgets.Add(widget);
    }

    public void RegisterRange(IEnumerable<WidgetDefinition> widgets)
    {
        if (widgets == null) return;
        foreach (var widget in widgets)
        {
            Register(widget);
        }
    }
}
