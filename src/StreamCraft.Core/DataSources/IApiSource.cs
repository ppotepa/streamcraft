namespace StreamCraft.Core.DataSources;

public interface IApiSource
{
    string BaseUrl { get; }
    string? DocsUrl { get; }
    IReadOnlyList<ApiEndpointSpec> Endpoints { get; }
}

public sealed record ApiEndpointSpec(string Name, string Path, string Method, string? Description = null)
{
    public ApiResponseMetadata? Response { get; init; }
}




