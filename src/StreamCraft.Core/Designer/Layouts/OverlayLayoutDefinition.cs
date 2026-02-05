using System.Text.Json;

namespace StreamCraft.Core.Designer.Layouts;

public sealed class OverlayLayoutDefinition
{
    public const int SupportedSchemaVersion = 1;

    public int SchemaVersion { get; set; } = SupportedSchemaVersion;
    public string LayoutId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    public StageDefinition Stage { get; set; } = new();
    public ThemeDefinition Theme { get; set; } = new();
    public List<WidgetInstance> Widgets { get; set; } = new();
    public List<WorkflowDefinition> Workflows { get; set; } = new();
    public Dictionary<string, object?>? Metadata { get; set; }
}

public sealed class StageDefinition
{
    public int Width { get; set; } = 1920;
    public int Height { get; set; } = 1080;
    public int GridSize { get; set; } = 10;
    public bool SnapToGrid { get; set; } = true;
    public bool SnapToObjects { get; set; } = true;
    public int? SafeMargin { get; set; }
}

public sealed class ThemeDefinition
{
    public Dictionary<string, string> Colors { get; set; } = new();
    public Dictionary<string, string> Fonts { get; set; } = new();
    public Dictionary<string, double> Sizes { get; set; } = new();
}

public sealed class WidgetInstance
{
    public string WidgetId { get; set; } = string.Empty;
    public string TypeId { get; set; } = string.Empty;
    public Frame Frame { get; set; } = new();
    public Dictionary<string, JsonElement> Props { get; set; } = new();
    public Dictionary<string, JsonElement> Style { get; set; } = new();
    public List<BindingSpec> Bindings { get; set; } = new();
}

public sealed class Frame
{
    public double X { get; set; }
    public double Y { get; set; }
    public double Width { get; set; }
    public double Height { get; set; }
    public int Z { get; set; }
}

public sealed class BindingSpec
{
    public string BindingId { get; set; } = string.Empty;
    public string TargetPath { get; set; } = string.Empty;
    public string SourceId { get; set; } = string.Empty;
    public string EndpointId { get; set; } = string.Empty;
    public string DataPath { get; set; } = string.Empty;
    public string? Format { get; set; }
    public string? TypeHint { get; set; }
    public JsonElement? Fallback { get; set; }
    public int? DebounceMs { get; set; }
}

public sealed class WorkflowDefinition
{
    public string WorkflowId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool Enabled { get; set; } = true;
    public object? Trigger { get; set; }
    public List<object> Conditions { get; set; } = new();
    public List<object> Actions { get; set; } = new();
}



