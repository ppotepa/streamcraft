namespace Engine.Services;

internal sealed class PluginManifest
{
    public string? Id { get; set; }
    public string? EntryAssembly { get; set; }
    public bool? Internal { get; set; }
}
