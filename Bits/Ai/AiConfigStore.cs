using Core.Data.DuckDb;
using DuckDB.NET.Data;

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
    private readonly object _sync = new();

    public AiConfigStore(IDuckDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
    }

    public Task<AiProviderConfig> GetAsync(CancellationToken cancellationToken)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT provider, access_token, target_model FROM bit_ai_config WHERE id = ?";
        command.Parameters.Add(new DuckDBParameter { Value = ConfigId });
        using var reader = command.ExecuteReader();
        if (!reader.Read())
        {
            return Task.FromResult(new AiProviderConfig(AiProviderDefaults.DefaultProviderId, null, null));
        }

        var provider = reader.IsDBNull(0) ? AiProviderDefaults.DefaultProviderId : reader.GetString(0);
        var token = reader.IsDBNull(1) ? null : reader.GetString(1);
        var model = reader.IsDBNull(2) ? null : reader.GetString(2);
        if (string.IsNullOrWhiteSpace(provider))
        {
            provider = AiProviderDefaults.DefaultProviderId;
        }

        return Task.FromResult(new AiProviderConfig(provider, token, model));
    }

    public Task SaveAsync(AiProviderConfig config, CancellationToken cancellationToken)
    {
        var provider = string.IsNullOrWhiteSpace(config.ProviderId)
            ? AiProviderDefaults.DefaultProviderId
            : config.ProviderId.Trim();
        var now = DateTime.UtcNow;

        lock (_sync)
        {
            using var connection = _connectionFactory.OpenConnection();
            using var command = connection.CreateCommand();
            command.CommandText = @"
INSERT INTO bit_ai_config (id, provider, access_token, target_model, created_utc, updated_utc)
VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
    provider = excluded.provider,
    access_token = excluded.access_token,
    target_model = excluded.target_model,
    updated_utc = excluded.updated_utc;";
            command.Parameters.Add(new DuckDBParameter { Value = ConfigId });
            command.Parameters.Add(new DuckDBParameter { Value = provider });
            command.Parameters.Add(new DuckDBParameter { Value = (object?)config.AccessToken ?? DBNull.Value });
            command.Parameters.Add(new DuckDBParameter { Value = (object?)config.TargetModel ?? DBNull.Value });
            command.Parameters.Add(new DuckDBParameter { Value = now });
            command.Parameters.Add(new DuckDBParameter { Value = now });
            command.ExecuteNonQuery();
        }

        return Task.CompletedTask;
    }
}
