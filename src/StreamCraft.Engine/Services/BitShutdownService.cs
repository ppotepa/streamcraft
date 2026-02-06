using Microsoft.Extensions.Hosting;
using Serilog;
using StreamCraft.Core.Bits;

namespace StreamCraft.Engine.Services;

public sealed class BitShutdownService : IHostedService
{
    private readonly IBitsRegistry _bitsRegistry;
    private readonly ILogger _logger;
    private int _hasRun;

    public BitShutdownService(IBitsRegistry bitsRegistry, ILogger logger)
    {
        _bitsRegistry = bitsRegistry;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    public Task StopAsync(CancellationToken cancellationToken)
    {
        if (Interlocked.Exchange(ref _hasRun, 1) == 1)
        {
            return Task.CompletedTask;
        }

        foreach (var bit in _bitsRegistry.GetAllBits())
        {
            if (bit is IDisposable disposable)
            {
                try
                {
                    disposable.Dispose();
                }
                catch (Exception ex)
                {
                    _logger.Warning(ex, "Failed to dispose bit {BitName}", bit.Name);
                }
            }
        }

        return Task.CompletedTask;
    }
}
