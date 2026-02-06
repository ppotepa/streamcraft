using StreamCraft.Core.Data.DuckDb;
using StreamCraft.Core.Data.Sql;
using DuckDB.NET.Data;
using System.Text.Json;

namespace StreamCraft.Bits.Ai;

public interface IAiConfigStore
{
    Task<AiProviderConfig> GetAsync(CancellationToken cancellationToken);
    Task SaveAsync(AiProviderConfig config, CancellationToken cancellationToken);
}

public sealed class AiConfigStore : IAiConfigStore
{
    private const int ConfigId = 1;
    private readonly IDuckDbConnectionFactory _connectionFactory;
    private readonly ISqlQueryStore _queries;
    private readonly object _sync = new();

    public AiConfigStore(IDuckDbConnectionFactory connectionFactory, ISqlQueryStore queries)
    {
        _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
        _queries = queries ?? throw new ArgumentNullException(nameof(queries));
        EnsureSchema();
    }

    public Task<AiProviderConfig> GetAsync(CancellationToken cancellationToken)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = _queries.Get("ai/config_read");
        command.Parameters.Add(new DuckDBParameter { Value = ConfigId });
        using var reader = ExecuteReaderWithSchemaEnsure(command);
        if (!reader.Read())
        {
            return Task.FromResult(new AiProviderConfig(AiProviderDefaults.DefaultProviderId, null, null, null));
        }

        var provider = reader.IsDBNull(0) ? AiProviderDefaults.DefaultProviderId : reader.GetString(0);
        var token = reader.IsDBNull(1) ? null : reader.GetString(1);
        var model = reader.IsDBNull(2) ? null : reader.GetString(2);
        var metadataJson = reader.IsDBNull(3) ? null : reader.GetString(3);

        if (string.IsNullOrWhiteSpace(provider))
        {
            provider = AiProviderDefaults.DefaultProviderId;
        }

        JsonElement? metadata = null;
        if (!string.IsNullOrWhiteSpace(metadataJson))
        {
            try
            {
                metadata = JsonSerializer.Deserialize<JsonElement>(metadataJson);
            }
            catch (JsonException)
            {
                // Ignore invalid JSON
            }
        }

        return Task.FromResult(new AiProviderConfig(provider, token, model, metadata));
    }

    public Task SaveAsync(AiProviderConfig config, CancellationToken cancellationToken)
    {
        var provider = string.IsNullOrWhiteSpace(config.ProviderId)
            ? AiProviderDefaults.DefaultProviderId
            : config.ProviderId.Trim();
        var now = DateTime.UtcNow;

        string? metadataJson = null;
        if (config.Metadata.HasValue)
        {
            metadataJson = JsonSerializer.Serialize(config.Metadata.Value);
        }

        lock (_sync)
        {
            using var connection = _connectionFactory.OpenConnection();
            using var command = connection.CreateCommand();
            command.CommandText = _queries.Get("ai/config_write");
            command.Parameters.Add(new DuckDBParameter { Value = ConfigId });
            command.Parameters.Add(new DuckDBParameter { Value = provider });
            command.Parameters.Add(new DuckDBParameter { Value = (object?)config.AccessToken ?? DBNull.Value });
            command.Parameters.Add(new DuckDBParameter { Value = (object?)config.TargetModel ?? DBNull.Value });
            command.Parameters.Add(new DuckDBParameter { Value = (object?)metadataJson ?? DBNull.Value });
            command.Parameters.Add(new DuckDBParameter { Value = now });
            command.Parameters.Add(new DuckDBParameter { Value = now });
            ExecuteNonQueryWithSchemaEnsure(command);
        }

        return Task.CompletedTask;
    }

    private void EnsureSchema()
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = _queries.Get("ai/config_schema");
        command.ExecuteNonQuery();
        EnsureMetadataColumn();
    }

    private void EnsureMetadataColumn()
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = _queries.Get("ai/config_add_metadata");
        try
        {
            command.ExecuteNonQuery();
        }
        catch (DuckDBException ex) when (IsColumnExistsError(ex))
        {
            // Column already exists; ignore.
        }
    }

    private DuckDBDataReader ExecuteReaderWithSchemaEnsure(DuckDBCommand command)
    {
        try
        {
            return command.ExecuteReader();
        }
        catch (DuckDBException ex) when (ShouldEnsureSchema(ex))
        {
            EnsureSchema();
            return command.ExecuteReader();
        }
    }

    private void ExecuteNonQueryWithSchemaEnsure(DuckDBCommand command)
    {
        try
        {
            command.ExecuteNonQuery();
        }
        catch (DuckDBException ex) when (ShouldEnsureSchema(ex))
        {
            EnsureSchema();
            command.ExecuteNonQuery();
        }
    }

    private static bool ShouldEnsureSchema(DuckDBException ex)
    {
        return IsMissingMetadataColumn(ex) || IsMissingTable(ex);
    }

    private static bool IsMissingMetadataColumn(DuckDBException ex)
    {
        var message = ex.Message ?? string.Empty;
        if (!message.Contains("metadata", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return message.Contains("does not exist", StringComparison.OrdinalIgnoreCase) ||
               message.Contains("does not have a column", StringComparison.OrdinalIgnoreCase) ||
               message.Contains("not found", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsColumnExistsError(DuckDBException ex)
    {
        var message = ex.Message ?? string.Empty;
        return message.Contains("metadata", StringComparison.OrdinalIgnoreCase) &&
               message.Contains("already exists", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsMissingTable(DuckDBException ex)
    {
        var message = ex.Message ?? string.Empty;
        return message.Contains("bit_ai_config", StringComparison.OrdinalIgnoreCase) &&
               message.Contains("does not exist", StringComparison.OrdinalIgnoreCase);
    }
}




