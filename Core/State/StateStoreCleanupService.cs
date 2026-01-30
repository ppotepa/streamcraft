using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Core.State;

public sealed class StateStoreCleanupService : IHostedService
{
    private readonly IBitStateStoreRegistry _registry;
    private readonly ILogger<StateStoreCleanupService> _logger;

    public StateStoreCleanupService(IBitStateStoreRegistry registry, ILogger<StateStoreCleanupService> logger)
    {
        _registry = registry ?? throw new ArgumentNullException(nameof(registry));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        var stores = _registry.GetAll();
        foreach (var (bitId, store) in stores)
        {
            if (store is IDisposable disposable)
            {
                try
                {
                    disposable.Dispose();
                    _logger.LogDebug("Disposed state store for bit {BitId}", bitId);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to dispose state store for bit {BitId}", bitId);
                }
            }
        }

        return Task.CompletedTask;
    }
}
