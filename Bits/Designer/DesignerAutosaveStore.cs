using StreamCraft.Core.Data.DuckDb;
using StreamCraft.Core.Diagnostics;
using DuckDB.NET.Data;
using Serilog;

namespace StreamCraft.Bits.Designer;

public sealed class DesignerAutosaveStore
{
    private readonly IDuckDbConnectionFactory _connectionFactory;
    private readonly ILogger _logger;

    public DesignerAutosaveStore(IDuckDbConnectionFactory connectionFactory, ILogger logger)
    {
        _connectionFactory = connectionFactory ?? throw ExceptionFactory.ArgumentNull(nameof(connectionFactory));
        _logger = logger ?? throw ExceptionFactory.ArgumentNull(nameof(logger));
        EnsureSchema();
    }

    public async Task<string?> ReadAsync(string sessionId, CancellationToken cancellationToken)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT autosave_json
            FROM bit_designer_autosave
            WHERE session_id = ?;
            """;
        command.Parameters.Add(new DuckDBParameter { Value = Normalize(sessionId) });
        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result == null || result == DBNull.Value ? null : Convert.ToString(result);
    }

    public async Task WriteAsync(string sessionId, string json, string? projectName, CancellationToken cancellationToken)
    {
        if (json == null) throw ExceptionFactory.ArgumentNull(nameof(json));
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT OR REPLACE INTO bit_designer_autosave (session_id, autosave_json, project_name, updated_utc)
            VALUES (?, ?, ?, ?);
            """;
        command.Parameters.Add(new DuckDBParameter { Value = Normalize(sessionId) });
        command.Parameters.Add(new DuckDBParameter { Value = json });
        command.Parameters.Add(new DuckDBParameter { Value = projectName ?? string.Empty });
        command.Parameters.Add(new DuckDBParameter { Value = DateTime.UtcNow });
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private void EnsureSchema()
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = """
            CREATE TABLE IF NOT EXISTS bit_designer_autosave (
                session_id TEXT PRIMARY KEY,
                autosave_json JSON NOT NULL,
                project_name TEXT,
                updated_utc TIMESTAMP NOT NULL
            );
            """;
        command.ExecuteNonQuery();
    }

    private static string Normalize(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "default";
        }

        return value.Trim().ToLowerInvariant();
    }
}



