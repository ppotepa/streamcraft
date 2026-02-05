using StreamCraft.Core.Data.DuckDb;
using StreamCraft.Core.Data.Sql;
using StreamCraft.Core.Diagnostics;
using DuckDB.NET.Data;
using Serilog;

namespace StreamCraft.Core.Bits;

public sealed class DuckDbBitConfigStore : IBitConfigStore
{
    private readonly IDuckDbConnectionFactory _connectionFactory;
    private readonly ISqlQueryStore _queries;
    private readonly ILogger _logger;
    private readonly object _sync = new();

    public DuckDbBitConfigStore(IDuckDbConnectionFactory connectionFactory, ISqlQueryStore queries, ILogger logger)
    {
        _connectionFactory = connectionFactory ?? throw ExceptionFactory.ArgumentNull(nameof(connectionFactory));
        _queries = queries ?? throw ExceptionFactory.ArgumentNull(nameof(queries));
        _logger = logger ?? throw ExceptionFactory.ArgumentNull(nameof(logger));
    }

    public bool Exists(string bitId)
    {
        var normalized = NormalizeBitId(bitId);
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = _queries.Get("bits/config_exists");
        command.Parameters.Add(new DuckDBParameter { Value = normalized });
        var result = command.ExecuteScalar();
        if (result == null || result == DBNull.Value) return false;
        return Convert.ToBoolean(result);
    }

    public string? Read(string bitId)
    {
        var normalized = NormalizeBitId(bitId);
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = _queries.Get("bits/config_read");
        command.Parameters.Add(new DuckDBParameter { Value = normalized });
        var result = command.ExecuteScalar();
        return result == null || result == DBNull.Value ? null : Convert.ToString(result);
    }

    public void Write(string bitId, string json)
    {
        if (json == null) throw ExceptionFactory.ArgumentNull(nameof(json));
        var normalized = NormalizeBitId(bitId);
        var utcNow = DateTime.UtcNow;

        lock (_sync)
        {
            using var connection = _connectionFactory.OpenConnection();
            using var command = connection.CreateCommand();
            command.CommandText = _queries.Get("bits/config_write");
            command.Parameters.Add(new DuckDBParameter { Value = normalized });
            command.Parameters.Add(new DuckDBParameter { Value = json });
            command.Parameters.Add(new DuckDBParameter { Value = utcNow });
            command.Parameters.Add(new DuckDBParameter { Value = utcNow });
            command.ExecuteNonQuery();
        }
    }

    private static string NormalizeBitId(string bitId)
    {
        if (string.IsNullOrWhiteSpace(bitId)) return string.Empty;
        return bitId.Trim().ToLowerInvariant();
    }
}



