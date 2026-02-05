using StreamCraft.Core.DataSources;

namespace StreamCraft.Bits.Designer;

public sealed class DataSourceDto
{
    public string? Id { get; set; }
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Kind { get; set; }
    public string? KindLabel { get; set; }
    public string? CategoryId { get; set; }
    public string? CategoryLabel { get; set; }
    public string? BaseUrl { get; set; }
    public string? DocsUrl { get; set; }
    public EndpointDto[]? Endpoints { get; set; }
}

public sealed class EndpointDto
{
    public string? Name { get; set; }
    public string? Path { get; set; }
    public string? Method { get; set; }
    public string? Description { get; set; }
    public ApiResponseMetadata? Response { get; set; }
}

public sealed class ExtensionDataPayload
{
    public string? IdOrGroup { get; set; }
    public Dictionary<string, object?>? Data { get; set; }
    public bool Merge { get; set; } = true;
}
