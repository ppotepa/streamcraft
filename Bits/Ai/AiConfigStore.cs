using StreamCraft.Core.Data.DuckDb;
using StreamCraft.Core.Data.Sql;
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
    private readonly ISqlQueryStore _queries;
    private readonly object _sync = new();

    public AiConfigStore(IDuckDbConnectionFactory connectionFactory, ISqlQueryStore queries)
    {
        _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
        _queries = queries ?? throw new ArgumentNullException(nameof(queries));
    }

    public Task<AiProviderConfig> GetAsync(CancellationToken cancellationToken)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = _queries.Get("ai/config_read");
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
            command.CommandText = _queries.Get("ai/config_write");
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



