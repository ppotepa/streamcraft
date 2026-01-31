namespace Core.Designer;

public interface IApiSource : IApiDataSource
{
    string BaseUrl { get; }
    string? DocsUrl { get; }
    IReadOnlyList<ApiEndpointSpec> Endpoints { get; }
}

public sealed record ApiEndpointSpec(string Name, string Path, string Method, string? Description = null);
