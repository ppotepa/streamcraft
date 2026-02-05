namespace StreamCraft.Core.Ui.Extensions;

public sealed record DesignerUiExtensionDefinition
{
    public string Id { get; init; } = string.Empty;
    public string? Group { get; init; }
    public string? Title { get; init; }
    public IReadOnlyList<string> Targets { get; init; } = Array.Empty<string>();
    public int Order { get; init; }
    public object? Form { get; init; }
    public object? Data { get; init; }
}




