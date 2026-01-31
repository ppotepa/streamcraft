using Core.IO;

namespace Bits.Sc2.Application.Services;

public interface ILobbyFileWatcher : IAsyncDisposable
{
    Task StartAsync(CancellationToken cancellationToken);
    IAsyncEnumerable<FileChange> WatchAsync(CancellationToken cancellationToken);
    string? GetCurrentLobbyPath();
}
