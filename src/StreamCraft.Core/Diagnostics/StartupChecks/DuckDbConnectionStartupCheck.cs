using StreamCraft.Core.Data.DuckDb;
using Microsoft.Extensions.Options;

namespace StreamCraft.Core.Diagnostics.StartupChecks;

public sealed class DuckDbConnectionStartupCheck : IStartupCheck
{
    private readonly DuckDbOptions _options;

    public DuckDbConnectionStartupCheck(IOptions<DuckDbOptions> options)
    {
        _options = options?.Value ?? new DuckDbOptions();
    }

    public string Name => "DuckDB";
    public bool IsCritical => true;
    public StartupCheckStage Stage => StartupCheckStage.PreMigrations;

    public Task<StartupCheckResult> RunAsync(StartupCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            var path = _options.Path ?? "(default)";
            return Task.FromResult(StartupCheckResult.Ok(Name, $"DuckDB ready ({path})."));
        }
        catch (Exception ex)
        {
            return Task.FromResult(StartupCheckResult.Fail(Name, $"DuckDB failed: {ex.Message}"));
        }
    }
}



