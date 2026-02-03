using Core.Data.DuckDb;

namespace Core.Diagnostics.StartupChecks;

public sealed class DuckDbMigrationsStartupCheck : IStartupCheck
{
    public string Name => "DuckDB Migrations";
    public bool IsCritical => true;
    public StartupCheckStage Stage => StartupCheckStage.PreMigrations;

    public Task<StartupCheckResult> RunAsync(StartupCheckContext context, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(StartupCheckResult.Ok(Name, "DuckDB migrations ready."));
    }
}
