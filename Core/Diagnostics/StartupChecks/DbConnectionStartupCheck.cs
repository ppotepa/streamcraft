using Core.Data.Postgres;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Npgsql;

namespace Core.Diagnostics.StartupChecks;

public sealed class DbConnectionStartupCheck : IStartupCheck
{
    private readonly PostgresDatabaseOptions _options;

    public DbConnectionStartupCheck(IOptions<PostgresDatabaseOptions> options)
    {
        _options = options?.Value ?? new PostgresDatabaseOptions();
    }

    public string Name => "Database";
    public bool IsCritical => true;

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
            cmd.CommandText = "SELECT 1;";
            await cmd.ExecuteScalarAsync(cancellationToken).ConfigureAwait(false);

            return StartupCheckResult.Ok(Name, "Connection successful.");
        }
        catch (Exception ex)
        {
            return StartupCheckResult.Fail(Name, ex.Message);
        }
    }
}
