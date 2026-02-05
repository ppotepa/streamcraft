using StreamCraft.Core.Data.DuckDb;
using StreamCraft.Core.Data.Sql;
using StreamCraft.Core.DataSources;
using StreamCraft.Core.Diagnostics;
using DuckDB.NET.Data;
using Serilog;
using System.Text.Json;
using System.Linq;

namespace StreamCraft.Bits.PublicApiSources;

public sealed class PublicApiMetadataStore
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    private readonly IDuckDbConnectionFactory _connectionFactory;
    private readonly ISqlQueryStore _queries;
    private readonly ILogger _logger;

    public PublicApiMetadataStore(IDuckDbConnectionFactory connectionFactory, ISqlQueryStore queries, ILogger logger)
    {
        _connectionFactory = connectionFactory ?? throw ExceptionFactory.ArgumentNull(nameof(connectionFactory));
        _queries = queries ?? throw ExceptionFactory.ArgumentNull(nameof(queries));
        _logger = logger ?? throw ExceptionFactory.ArgumentNull(nameof(logger));
        EnsureSchema();
    }

    public async Task<IReadOnlyDictionary<MetadataKey, ApiResponseMetadata>> ReadAllAsync(CancellationToken cancellationToken)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = _queries.Get("public_api_sources/metadata_read_all");

        var results = new Dictionary<MetadataKey, ApiResponseMetadata>();
        using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var sourceId = reader.GetString(0);
            var endpointPath = reader.GetString(1);
            var method = reader.GetString(2);
            var json = reader.GetString(3);
            var metadata = JsonSerializer.Deserialize<ApiResponseMetadata>(json, JsonOptions);
            if (metadata == null)
            {
                continue;
            }

            results[MetadataKey.From(sourceId, endpointPath, method)] = metadata;
        }

        return results;
    }

    public IReadOnlyList<IPublicApiDataSource> ApplyCachedMetadata(
        IReadOnlyList<IPublicApiDataSource> sources,
        IReadOnlyDictionary<MetadataKey, ApiResponseMetadata> cached)
    {
        if (sources.Count == 0 || cached.Count == 0)
        {
            return sources;
        }

        var results = new List<IPublicApiDataSource>(sources.Count);
        foreach (var source in sources)
        {
            if (source is not PublicApiSource publicSource)
            {
                results.Add(source);
                continue;
            }

            var endpoints = publicSource.Endpoints.Select(endpoint =>
            {
                var key = MetadataKey.From(publicSource.Id, endpoint.Path, endpoint.Method);
                if (cached.TryGetValue(key, out var metadata))
                {
                    return endpoint with { Response = metadata };
                }

                return endpoint;
            }).ToArray();

            results.Add(new PublicApiSource
            {
                Id = publicSource.Id,
                Name = publicSource.Name,
                Description = publicSource.Description,
                Kind = publicSource.Kind,
                CategoryId = publicSource.CategoryId,
                BaseUrl = publicSource.BaseUrl,
                DocsUrl = publicSource.DocsUrl,
                Endpoints = endpoints
            });
        }

        return results;
    }

    public async Task WriteAsync(IReadOnlyList<IPublicApiDataSource> sources, CancellationToken cancellationToken)
    {
        using var connection = _connectionFactory.OpenConnection();
        foreach (var source in sources)
        {
            var categoryId = source.CategoryId;
            foreach (var endpoint in source.Endpoints)
            {
                if (endpoint.Response == null)
                {
                    continue;
                }

                var json = JsonSerializer.Serialize(endpoint.Response, JsonOptions);
                var fetchedUtc = endpoint.Response.FetchedUtc;
                var success = endpoint.Response.Success;

                using var command = connection.CreateCommand();
                command.CommandText = _queries.Get("public_api_sources/metadata_write");
                command.Parameters.Add(new DuckDBParameter { Value = source.Id ?? string.Empty });
                command.Parameters.Add(new DuckDBParameter { Value = endpoint.Path ?? string.Empty });
                command.Parameters.Add(new DuckDBParameter { Value = endpoint.Method ?? string.Empty });
                command.Parameters.Add(new DuckDBParameter { Value = json });
                command.Parameters.Add(new DuckDBParameter { Value = fetchedUtc });
                command.Parameters.Add(new DuckDBParameter { Value = success });
                command.Parameters.Add(new DuckDBParameter { Value = (object?)categoryId ?? DBNull.Value });
                await command.ExecuteNonQueryAsync(cancellationToken);
            }
        }
    }

    private void EnsureSchema()
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = _queries.Get("public_api_sources/metadata_schema");
        command.ExecuteNonQuery();
    }
}

public readonly record struct MetadataKey(string SourceId, string EndpointPath, string Method)
{
    public static MetadataKey From(string sourceId, string endpointPath, string method)
    {
        return new MetadataKey(
            Normalize(sourceId),
            Normalize(endpointPath),
            Normalize(method));
    }

    private static string Normalize(string value)
    {
        return string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim().ToLowerInvariant();
    }
}




