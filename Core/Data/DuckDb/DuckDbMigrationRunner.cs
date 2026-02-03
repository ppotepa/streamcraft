using Core.Data.Sql;
using Core.Diagnostics;
using DuckDB.NET.Data;
using Microsoft.Extensions.Logging;

namespace Core.Data.DuckDb;

public sealed class DuckDbMigrationRunner : IDuckDbMigrationRunner
{
    private readonly IDuckDbConnectionFactory _connectionFactory;
    private readonly ISqlQueryStore _queries;
    private readonly ILogger<DuckDbMigrationRunner> _logger;

    public DuckDbMigrationRunner(IDuckDbConnectionFactory connectionFactory, ISqlQueryStore queries, ILogger<DuckDbMigrationRunner> logger)
    {
        _connectionFactory = connectionFactory ?? throw ExceptionFactory.ArgumentNull(nameof(connectionFactory));
        _queries = queries ?? throw ExceptionFactory.ArgumentNull(nameof(queries));
        _logger = logger ?? throw ExceptionFactory.ArgumentNull(nameof(logger));
    }

    public async Task ApplyMigrationsAsync(MigrationSource source, CancellationToken cancellationToken = default)
    {
        if (source == null) throw ExceptionFactory.ArgumentNull(nameof(source));

        using var connection = _connectionFactory.OpenConnection();
        using (var create = connection.CreateCommand())
        {
            create.CommandText = _queries.Get("core/schema_migrations_create");
            create.ExecuteNonQuery();
        }

        foreach (var script in source.Scripts)
        {
            var id = script.Id;
            if (IsApplied(connection, id)) continue;

            using var command = connection.CreateCommand();
            command.CommandText = script.Sql;
            command.ExecuteNonQuery();

            using var insert = connection.CreateCommand();
            insert.CommandText = _queries.Get("core/schema_migrations_insert");
            insert.Parameters.Add(new DuckDBParameter { Value = id });
            insert.Parameters.Add(new DuckDBParameter { Value = DateTime.UtcNow });
            insert.ExecuteNonQuery();
            _logger.LogInformation("Applied DuckDB migration {MigrationId}", id);
        }

        await Task.CompletedTask;
    }

    private bool IsApplied(DuckDBConnection connection, string id)
    {
        using var command = connection.CreateCommand();
        command.CommandText = _queries.Get("core/schema_migrations_is_applied");
        command.Parameters.Add(new DuckDBParameter { Value = id });
        var result = command.ExecuteScalar();
        return result != null;
    }

    
}
