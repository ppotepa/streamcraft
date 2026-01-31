using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using Npgsql;
using Serilog;

namespace Core.Data.Postgres;

public sealed class PostgresMigrationRunner : IPostgresMigrationRunner
{
    private static readonly Regex TableReferenceRegex = new(
        @"(?ix)
            \bcreate\s+table\s+(if\s+not\s+exists\s+)?(?<name>[""`\w\.]+)|
            \balter\s+table\s+(?<name>[""`\w\.]+)|
            \bdrop\s+table\s+(if\s+exists\s+)?(?<name>[""`\w\.]+)|
            \binsert\s+into\s+(?<name>[""`\w\.]+)|
            \bupdate\s+(?<name>[""`\w\.]+)|
            \bdelete\s+from\s+(?<name>[""`\w\.]+)",
        RegexOptions.Compiled);

    private static readonly Regex IndexReferenceRegex = new(
        @"(?ix)
            \bcreate\s+(unique\s+)?index\s+[""`\w\.]+\s+on\s+(?<table>[""`\w\.]+)",
        RegexOptions.Compiled);

    private static readonly Regex ViewReferenceRegex = new(
        @"(?ix)
            \bcreate\s+(or\s+replace\s+)?view\s+(?<name>[""`\w\.]+)",
        RegexOptions.Compiled);

    private static readonly Regex TriggerReferenceRegex = new(
        @"(?ix)
            \bcreate\s+trigger\s+(?<name>[""`\w\.]+)\s+on\s+(?<table>[""`\w\.]+)",
        RegexOptions.Compiled);

    private readonly PostgresDatabaseOptions _options;
    private readonly ILogger _logger;

    public PostgresMigrationRunner(IOptions<PostgresDatabaseOptions> options, ILogger logger)
    {
        _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public void ApplyMigrations(IReadOnlyList<MigrationSource> sources)
    {
        if (string.IsNullOrWhiteSpace(_options.ConnectionString))
        {
            throw new InvalidOperationException("StreamCraft:Database:ConnectionString is not configured.");
        }

        NpgsqlConnection? connection = null;
        try
        {
            connection = new NpgsqlConnection(_options.ConnectionString);
            connection.Open();
        }
        catch (Exception ex) when (ex is NpgsqlException or InvalidOperationException)
        {
            _logger.Warning("Postgres is unreachable. Skipping migrations for this run.");
            _logger.Debug(ex, "Postgres connection failed while applying migrations.");
            return;
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Unexpected error while connecting to Postgres for migrations.");
            throw;
        }

        using (connection)
        {
            EnsureMigrationsTable(connection);

            foreach (var source in sources)
            {
                if (source.Scripts.Count == 0)
                {
                    continue;
                }

                ApplyMigrationSource(connection, source);
            }
        }
    }

    private void EnsureMigrationsTable(NpgsqlConnection connection)
    {
        using var command = connection.CreateCommand();
        command.CommandText = """
            CREATE TABLE IF NOT EXISTS core_schema_migrations (
                id TEXT PRIMARY KEY,
                applied_utc TIMESTAMPTZ NOT NULL
            );
            """;
        command.ExecuteNonQuery();
    }

    private void ApplyMigrationSource(NpgsqlConnection connection, MigrationSource source)
    {
        foreach (var script in source.Scripts)
        {
            var migrationId = $"{source.ScopeId}:{script.Id}";

            if (IsApplied(connection, migrationId))
            {
                continue;
            }

            if (!string.IsNullOrWhiteSpace(source.AllowedTablePrefix))
            {
                ValidateSql(script.Sql, source.AllowedTablePrefix, migrationId);
            }

            using var transaction = connection.BeginTransaction();
            using var command = connection.CreateCommand();
            command.Transaction = transaction;
            command.CommandText = script.Sql;
            command.ExecuteNonQuery();

            command.CommandText = "INSERT INTO core_schema_migrations (id, applied_utc) VALUES ($id, $utc);";
            command.Parameters.Clear();
            command.Parameters.AddWithValue("$id", migrationId);
            command.Parameters.AddWithValue("$utc", DateTime.UtcNow);
            command.ExecuteNonQuery();

            transaction.Commit();

            _logger.Information("Applied migration {MigrationId}", migrationId);
        }
    }

    private bool IsApplied(NpgsqlConnection connection, string migrationId)
    {
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT 1 FROM core_schema_migrations WHERE id = $id LIMIT 1;";
        command.Parameters.AddWithValue("$id", migrationId);
        var result = command.ExecuteScalar();
        return result != null && result != DBNull.Value;
    }

    private void ValidateSql(string sql, string allowedPrefix, string migrationId)
    {
        var normalizedPrefix = allowedPrefix.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(normalizedPrefix))
        {
            return;
        }

        foreach (Match match in TableReferenceRegex.Matches(sql))
        {
            var tableName = NormalizeIdentifier(match.Groups["name"].Value);
            EnsureAllowedTable(tableName, normalizedPrefix, migrationId);
        }

        foreach (Match match in IndexReferenceRegex.Matches(sql))
        {
            var tableName = NormalizeIdentifier(match.Groups["table"].Value);
            EnsureAllowedTable(tableName, normalizedPrefix, migrationId);
        }

        foreach (Match match in ViewReferenceRegex.Matches(sql))
        {
            var viewName = NormalizeIdentifier(match.Groups["name"].Value);
            EnsureAllowedTable(viewName, normalizedPrefix, migrationId);
        }

        foreach (Match match in TriggerReferenceRegex.Matches(sql))
        {
            var tableName = NormalizeIdentifier(match.Groups["table"].Value);
            EnsureAllowedTable(tableName, normalizedPrefix, migrationId);
        }
    }

    private void EnsureAllowedTable(string identifier, string allowedPrefix, string migrationId)
    {
        if (string.IsNullOrWhiteSpace(identifier))
        {
            return;
        }

        var tableName = identifier.Split('.').Last().Trim('"', '`').ToLowerInvariant();

        if (!tableName.StartsWith(allowedPrefix, StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                $"Migration {migrationId} targets table '{identifier}' which does not match required prefix '{allowedPrefix}'.");
        }
    }

    private static string NormalizeIdentifier(string identifier)
    {
        return identifier.Trim().Trim('"', '`');
    }
}
