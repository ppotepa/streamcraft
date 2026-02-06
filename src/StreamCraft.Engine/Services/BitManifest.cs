namespace StreamCraft.Engine.Services;

internal sealed class BitManifest
{
    public string? Id { get; set; }
    public string? EntryAssembly { get; set; }
    public bool? Internal { get; set; }
    public string? BitType { get; set; }
    public List<string>? BitTypes { get; set; }
    public string? Entrypoint { get; set; }
    public List<string>? Entrypoints { get; set; }
    public BitUiManifest? Ui { get; set; }
}

internal sealed class BitUiManifest
{
    public bool? Enabled { get; set; }
    public string? Dist { get; set; }
}
