using Core.Designer;
using Serilog;
using System.Net.Http.Headers;
using System.Linq;
using System.Text.Json;

namespace StreamCraft.Bits.PublicApiSources;

public sealed class PublicApiMetadataBuilder
{
    private const int MaxFields = 200;
    private const int MaxExampleLength = 160;
    private const int MaxConcurrency = 6;
    private static readonly TimeSpan RequestTimeout = TimeSpan.FromSeconds(6);

    private readonly HttpClient _httpClient;
    private readonly ILogger _logger;
    private readonly PublicApiResponseModelRegistry _models;
    private readonly SemaphoreSlim _gate = new(MaxConcurrency, MaxConcurrency);

    public PublicApiMetadataBuilder(ILogger logger, PublicApiResponseModelRegistry models)
    {
        _logger = logger;
        _models = models;
        _httpClient = new HttpClient
        {
            Timeout = RequestTimeout
        };
        _httpClient.DefaultRequestHeaders.UserAgent.ParseAdd("StreamCraft/1.0");
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("text/plain"));
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("*/*", 0.1));
    }

    public async Task<IReadOnlyList<IApiSource>> EnrichAsync(IReadOnlyList<IApiSource> sources, CancellationToken cancellationToken)
    {
        if (sources.Count == 0)
        {
            return sources;
        }

        var enriched = new List<IApiSource>(sources.Count);
        foreach (var source in sources)
        {
            if (source is not PublicApiSource publicSource)
            {
                enriched.Add(source);
                continue;
            }

            var endpoints = publicSource.Endpoints ?? Array.Empty<ApiEndpointSpec>();
            if (endpoints.Count == 0)
            {
                enriched.Add(publicSource);
                continue;
            }

            var tasks = endpoints.Select(endpoint => EnrichEndpointAsync(publicSource, endpoint, cancellationToken)).ToArray();
            var updatedEndpoints = await Task.WhenAll(tasks);
            enriched.Add(Clone(publicSource, updatedEndpoints));
        }

        return enriched;
    }

    private async Task<ApiEndpointSpec> EnrichEndpointAsync(PublicApiSource source, ApiEndpointSpec endpoint, CancellationToken cancellationToken)
    {
        if (endpoint.Response?.Success == true)
        {
            return endpoint;
        }

        if (_models.TryGet(source.Id, endpoint.Path, endpoint.Method, out var modelMetadata))
        {
            return endpoint with { Response = modelMetadata };
        }

        if (PublicApiStaticMetadata.TryGet(source.Id, endpoint.Path, endpoint.Method, out var predefined))
        {
            return endpoint with { Response = predefined };
        }

        await _gate.WaitAsync(cancellationToken);
        try
        {
            var metadata = await BuildMetadataAsync(source, endpoint, cancellationToken);
            return endpoint with { Response = metadata };
        }
        catch (Exception ex) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.Warning(ex, "Public API metadata failed for {SourceId} {Endpoint}", source.Id, endpoint.Path);
            return endpoint with
            {
                Response = new ApiResponseMetadata
                {
                    Success = false,
                    Error = ex.Message,
                    FetchedUtc = DateTime.UtcNow
                }
            };
        }
        finally
        {
            _gate.Release();
        }
    }

    private async Task<ApiResponseMetadata> BuildMetadataAsync(PublicApiSource source, ApiEndpointSpec endpoint, CancellationToken cancellationToken)
    {
        if (!string.Equals(endpoint.Method, "GET", StringComparison.OrdinalIgnoreCase))
        {
            return new ApiResponseMetadata
            {
                Success = false,
                Error = $"Unsupported method {endpoint.Method}",
                FetchedUtc = DateTime.UtcNow
            };
        }

        var requestUri = BuildUri(source.BaseUrl, endpoint.Path);
        if (requestUri == null)
        {
            return new ApiResponseMetadata
            {
                Success = false,
                Error = "Invalid base URL or endpoint path.",
                FetchedUtc = DateTime.UtcNow
            };
        }

        using var request = new HttpRequestMessage(HttpMethod.Get, requestUri);
        using var response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseContentRead, cancellationToken);

        var statusCode = (int)response.StatusCode;
        var contentType = response.Content.Headers.ContentType?.MediaType;
        var payload = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            return new ApiResponseMetadata
            {
                Success = false,
                StatusCode = statusCode,
                ContentType = contentType,
                Error = $"HTTP {statusCode}",
                FetchedUtc = DateTime.UtcNow
            };
        }

        if (string.IsNullOrWhiteSpace(payload))
        {
            return new ApiResponseMetadata
            {
                Success = true,
                StatusCode = statusCode,
                ContentType = contentType,
                RootKind = "empty",
                Fields = Array.Empty<ApiFieldSpec>(),
                FetchedUtc = DateTime.UtcNow
            };
        }

        if (!LooksLikeJson(payload, contentType))
        {
            return new ApiResponseMetadata
            {
                Success = true,
                StatusCode = statusCode,
                ContentType = contentType,
                RootKind = "text",
                Fields =
                [
                    new ApiFieldSpec("value", "string", TrimExample(payload))
                ],
                FetchedUtc = DateTime.UtcNow
            };
        }

        try
        {
            using var document = JsonDocument.Parse(payload);
            var root = document.RootElement;
            var fields = new List<ApiFieldSpec>();
            CollectFields(root, string.Empty, fields);

            return new ApiResponseMetadata
            {
                Success = true,
                StatusCode = statusCode,
                ContentType = contentType,
                RootKind = root.ValueKind.ToString().ToLowerInvariant(),
                Fields = fields,
                FetchedUtc = DateTime.UtcNow
            };
        }
        catch (JsonException ex)
        {
            return new ApiResponseMetadata
            {
                Success = false,
                StatusCode = statusCode,
                ContentType = contentType,
                Error = $"JSON parse failed: {ex.Message}",
                FetchedUtc = DateTime.UtcNow
            };
        }
    }

    private static Uri? BuildUri(string baseUrl, string path)
    {
        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            return null;
        }

        if (Uri.TryCreate(path, UriKind.Absolute, out var absolute))
        {
            return absolute;
        }

        if (!Uri.TryCreate(baseUrl.TrimEnd('/') + "/", UriKind.Absolute, out var baseUri))
        {
            return null;
        }

        var relative = path.StartsWith("/", StringComparison.Ordinal) ? path[1..] : path;
        return new Uri(baseUri, relative);
    }

    private static bool LooksLikeJson(string payload, string? contentType)
    {
        if (!string.IsNullOrWhiteSpace(contentType) &&
            contentType.Contains("json", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        var trimmed = payload.TrimStart();
        return trimmed.StartsWith("{", StringComparison.Ordinal) || trimmed.StartsWith("[", StringComparison.Ordinal);
    }

    private static void CollectFields(JsonElement element, string path, List<ApiFieldSpec> fields)
    {
        if (fields.Count >= MaxFields)
        {
            return;
        }

        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                if (!string.IsNullOrEmpty(path))
                {
                    fields.Add(new ApiFieldSpec(path, "object", IsContainer: true));
                }
                foreach (var property in element.EnumerateObject())
                {
                    var childPath = string.IsNullOrEmpty(path) ? property.Name : $"{path}.{property.Name}";
                    CollectFields(property.Value, childPath, fields);
                    if (fields.Count >= MaxFields)
                    {
                        return;
                    }
                }
                break;
            case JsonValueKind.Array:
                if (!string.IsNullOrEmpty(path))
                {
                    fields.Add(new ApiFieldSpec(path, "array", IsContainer: true));
                }
                if (element.GetArrayLength() > 0)
                {
                    var childPath = string.IsNullOrEmpty(path) ? "[0]" : $"{path}[0]";
                    CollectFields(element[0], childPath, fields);
                }
                break;
            case JsonValueKind.String:
                fields.Add(new ApiFieldSpec(LeafPath(path), "string", TrimExample(element.GetString())));
                break;
            case JsonValueKind.Number:
                fields.Add(new ApiFieldSpec(LeafPath(path), "number", TrimExample(element.GetRawText())));
                break;
            case JsonValueKind.True:
            case JsonValueKind.False:
                fields.Add(new ApiFieldSpec(LeafPath(path), "boolean", element.GetBoolean().ToString().ToLowerInvariant()));
                break;
            case JsonValueKind.Null:
            case JsonValueKind.Undefined:
                fields.Add(new ApiFieldSpec(LeafPath(path), "null"));
                break;
        }
    }

    private static string LeafPath(string path) => string.IsNullOrEmpty(path) ? "value" : path;

    private static string? TrimExample(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return value;
        }

        var cleaned = value.Replace("\r", " ").Replace("\n", " ").Trim();
        if (cleaned.Length <= MaxExampleLength)
        {
            return cleaned;
        }

        return cleaned[..MaxExampleLength] + "...";
    }

    private static PublicApiSource Clone(PublicApiSource source, IReadOnlyList<ApiEndpointSpec> endpoints)
    {
        return new PublicApiSource
        {
            Id = source.Id,
            Name = source.Name,
            Description = source.Description,
            Kind = source.Kind,
            BaseUrl = source.BaseUrl,
            DocsUrl = source.DocsUrl,
            Endpoints = endpoints
        };
    }
}
