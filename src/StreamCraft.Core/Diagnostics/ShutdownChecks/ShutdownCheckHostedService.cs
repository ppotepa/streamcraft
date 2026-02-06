using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System.Threading;

namespace StreamCraft.Core.Diagnostics.ShutdownChecks;

public sealed class ShutdownCheckHostedService : IHostedService
{
    private readonly ShutdownCheckRunner _runner;
    private readonly IShutdownCheckRegistry _registry;
    private readonly ILogger<ShutdownCheckHostedService> _logger;
    private int _hasRun;

    public ShutdownCheckHostedService(
        ShutdownCheckRunner runner,
        IShutdownCheckRegistry registry,
        ILogger<ShutdownCheckHostedService> logger)
    {
        _runner = runner;
        _registry = registry;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }

    public async Task StopAsync(CancellationToken cancellationToken)
    {
        if (Interlocked.Exchange(ref _hasRun, 1) == 1)
        {
            return;
        }

        try
        {
            var report = await _runner.RunAsync(cancellationToken).ConfigureAwait(false);
            _registry.SetLastReport(report);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Shutdown checks failed.");
        }
    }
}
