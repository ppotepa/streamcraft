using Core.Diagnostics.ProcessEvents;

namespace Bits.Sc2.Application.Services;

public interface ISc2ProcessWatcher : IAsyncDisposable
{
    IAsyncEnumerable<ProcessChange> WatchAsync(CancellationToken cancellationToken);
    Task StartAsync(CancellationToken cancellationToken);
}
