using Core.Data.Postgres;
using Core.Designer;
using Core.Diagnostics;
using Microsoft.Extensions.Options;
using Npgsql;
using NpgsqlTypes;
using Serilog;
using System.Text.Json;
using System.Linq;

namespace StreamCraft.Bits.PublicApiSources;

public sealed class PublicApiMetadataStore
{
    private static readonly TimeSpan RetryDelay = TimeSpan.FromSeconds(30);
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    private readonly string _connectionString;
    private readonly ILogger _logger;
    private readonly object _availabilitySync = new();
    private DateTime _retryAfterUtc = DateTime.MinValue;

    public PublicApiMetadataStore(IOptions<PostgresDatabaseOptions> options, ILogger logger)
    {
        if (options == null) throw ExceptionFactory.ArgumentNull(nameof(options));
        if (logger == null) throw ExceptionFactory.ArgumentNull(nameof(logger));
        _connectionString = options.Value.ConnectionString ?? string.Empty;
        _logger = logger;
    }

    public async Task<IReadOnlyDictionary<MetadataKey, ApiResponseMetadata>> ReadAllAsync(CancellationToken cancellationToken)
    {
        if (!IsAvailable())
        {
            return new Dictionary<MetadataKey, ApiResponseMetadata>();
        }

        try
        {
            await using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = connection.CreateCommand();
            command.CommandText = """
                SELECT source_id, endpoint_path, method, metadata
                FROM bit_publicapisources_api_metadata;
                """;

            var results = new Dictionary<MetadataKey, ApiResponseMetadata>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
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
        catch (Exception ex) when (ex is NpgsqlException or InvalidOperationException)
        {
            SuppressRetry(ex);
            return new Dictionary<MetadataKey, ApiResponseMetadata>();
        }
    }

    public IReadOnlyList<IApiSource> ApplyCachedMetadata(
        IReadOnlyList<IApiSource> sources,
        IReadOnlyDictionary<MetadataKey, ApiResponseMetadata> cached)
    {
        if (sources.Count == 0 || cached.Count == 0)
        {
            return sources;
        }

        var results = new List<IApiSource>(sources.Count);
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
                BaseUrl = publicSource.BaseUrl,
                DocsUrl = publicSource.DocsUrl,
                Endpoints = endpoints
            });
        }

        return results;
    }

    public async Task WriteAsync(IReadOnlyList<IApiSource> sources, CancellationToken cancellationToken)
    {
        if (!IsAvailable())
        {
            return;
        }

        try
        {
            await using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
            foreach (var source in sources)
            {
                foreach (var endpoint in source.Endpoints)
                {
                    if (endpoint.Response == null)
                    {
                        continue;
                    }

                    var json = JsonSerializer.Serialize(endpoint.Response, JsonOptions);
                    var fetchedUtc = endpoint.Response.FetchedUtc;
                    var success = endpoint.Response.Success;

                    await using var command = connection.CreateCommand();
                    command.Transaction = transaction;
                    command.CommandText = """
                        INSERT INTO bit_publicapisources_api_metadata
                            (source_id, endpoint_path, method, metadata, fetched_utc, success)
                        VALUES (@source, @path, @method, @metadata, @utc, @success)
                        ON CONFLICT (source_id, endpoint_path, method)
                        DO UPDATE SET
                            metadata = EXCLUDED.metadata,
                            fetched_utc = EXCLUDED.fetched_utc,
                            success = EXCLUDED.success;
                        """;
                    command.Parameters.AddWithValue("@source", source.Id ?? string.Empty);
                    command.Parameters.AddWithValue("@path", endpoint.Path ?? string.Empty);
                    command.Parameters.AddWithValue("@method", endpoint.Method ?? string.Empty);
                    command.Parameters.Add("@metadata", NpgsqlDbType.Jsonb).Value = json;
                    command.Parameters.AddWithValue("@utc", fetchedUtc);
                    command.Parameters.AddWithValue("@success", success);
                    await command.ExecuteNonQueryAsync(cancellationToken);
                }
            }

            await transaction.CommitAsync(cancellationToken);
        }
        catch (Exception ex) when (ex is NpgsqlException or InvalidOperationException)
        {
            SuppressRetry(ex);
        }
    }

    private bool IsAvailable()
    {
        if (string.IsNullOrWhiteSpace(_connectionString))
        {
            return false;
        }

        lock (_availabilitySync)
        {
            return DateTime.UtcNow >= _retryAfterUtc;
        }
    }

    private void SuppressRetry(Exception ex)
    {
        lock (_availabilitySync)
        {
            _retryAfterUtc = DateTime.UtcNow.Add(RetryDelay);
        }

        _logger.Warning("Postgres is unreachable. Suppressing metadata writes for {DelaySeconds} seconds.", (int)RetryDelay.TotalSeconds);
        _logger.Debug(ex, "Postgres connection failed while persisting API metadata.");
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
