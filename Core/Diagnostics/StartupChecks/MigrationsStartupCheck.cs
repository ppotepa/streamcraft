using Core.Data.Postgres;
using Microsoft.Extensions.Options;
using Npgsql;

namespace Core.Diagnostics.StartupChecks;

public sealed class MigrationsStartupCheck : IStartupCheck
{
    private readonly PostgresDatabaseOptions _options;

    public MigrationsStartupCheck(IOptions<PostgresDatabaseOptions> options)
    {
        _options = options?.Value ?? new PostgresDatabaseOptions();
    }

    public string Name => "Migrations";
    public bool IsCritical => true;
    public StartupCheckStage Stage => StartupCheckStage.PostMigrations;

    public async Task<StartupCheckResult> RunAsync(StartupCheckContext context, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.ConnectionString))
        {
            return StartupCheckResult.Fail(Name, "Connection string is not configured.");
        }

        try
        {
            await using var connection = new NpgsqlConnection(_options.ConnectionString);
            await connection.OpenAsync(cancellationToken).ConfigureAwait(false);
            await using var cmd = connection.CreateCommand();
            cmd.CommandText = "SELECT COUNT(*) FROM core_schema_migrations;";
            var result = await cmd.ExecuteScalarAsync(cancellationToken).ConfigureAwait(false);
            return StartupCheckResult.Ok(Name, $"core_schema_migrations rows: {result}");
        }
        catch (PostgresException ex) when (string.Equals(ex.SqlState, "42P01", StringComparison.Ordinal))
        {
            return StartupCheckResult.Fail(Name, "core_schema_migrations table is missing.");
        }
        catch (Exception ex)
        {
            return StartupCheckResult.Fail(Name, ex.Message);
        }
    }
}
