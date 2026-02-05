namespace StreamCraft.Core.DataSources;

public sealed record ApiResponseMetadata
{
    public bool Success { get; init; }
    public int? StatusCode { get; init; }
    public string? ContentType { get; init; }
    public string? RootKind { get; init; }
    public DateTime FetchedUtc { get; init; } = DateTime.UtcNow;
    public IReadOnlyList<ApiFieldSpec> Fields { get; init; } = Array.Empty<ApiFieldSpec>();
    public string? Error { get; init; }
}

public sealed record ApiFieldSpec(string Path, string Type, string? Example = null, bool IsContainer = false);




