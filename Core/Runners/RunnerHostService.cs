using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Core.Runners;

public sealed class RunnerHostService : IHostedService
{
    private readonly IRunnerRegistry _runnerRegistry;
    private readonly ILogger<RunnerHostService> _logger;

    public RunnerHostService(IRunnerRegistry runnerRegistry, ILogger<RunnerHostService> logger)
    {
        _runnerRegistry = runnerRegistry;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Starting runner host service.");
        _runnerRegistry.StartAll();
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Stopping runner host service.");
        _runnerRegistry.StopAll();
        return Task.CompletedTask;
    }
}
