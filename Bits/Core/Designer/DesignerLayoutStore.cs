using StreamCraft.Core.Data.DuckDb;
using StreamCraft.Core.Data.Sql;
using StreamCraft.Core.Diagnostics;
using DuckDB.NET.Data;
using Serilog;

namespace StreamCraft.Bits.Designer;

public sealed class DesignerLayoutStore
{
    public sealed record LayoutSummary(string LayoutId, DateTime UpdatedUtc);

    private readonly IDuckDbConnectionFactory _connectionFactory;
    private readonly ISqlQueryStore _queries;
    private readonly ILogger _logger;

    public DesignerLayoutStore(IDuckDbConnectionFactory connectionFactory, ISqlQueryStore queries, ILogger logger)
    {
        _connectionFactory = connectionFactory ?? throw ExceptionFactory.ArgumentNull(nameof(connectionFactory));
        _queries = queries ?? throw ExceptionFactory.ArgumentNull(nameof(queries));
        _logger = logger ?? throw ExceptionFactory.ArgumentNull(nameof(logger));
        EnsureSchema();
    }

    public async Task<string?> ReadAsync(string layoutId, CancellationToken cancellationToken)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = _queries.Get("designer/layout_read");
        command.Parameters.Add(new DuckDBParameter { Value = Normalize(layoutId) });
        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result == null || result == DBNull.Value ? null : Convert.ToString(result);
    }

    public async Task WriteAsync(string layoutId, string json, CancellationToken cancellationToken)
    {
        if (json == null) throw ExceptionFactory.ArgumentNull(nameof(json));
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = _queries.Get("designer/layout_write");
        command.Parameters.Add(new DuckDBParameter { Value = Normalize(layoutId) });
        command.Parameters.Add(new DuckDBParameter { Value = json });
        command.Parameters.Add(new DuckDBParameter { Value = DateTime.UtcNow });
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<LayoutSummary>> ListAsync(int limit, CancellationToken cancellationToken)
    {
        var normalizedLimit = Math.Clamp(limit, 1, 100);
        var results = new List<LayoutSummary>();

        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = _queries.Get("designer/layout_list");
        command.Parameters.Add(new DuckDBParameter { Value = normalizedLimit });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var layoutId = Convert.ToString(reader.GetValue(0)) ?? string.Empty;
            var updatedUtc = reader.GetDateTime(1);
            if (string.IsNullOrWhiteSpace(layoutId))
            {
                continue;
            }

            results.Add(new LayoutSummary(layoutId, DateTime.SpecifyKind(updatedUtc, DateTimeKind.Utc)));
        }

        return results;
    }

    private void EnsureSchema()
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = _queries.Get("designer/layout_schema");
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



