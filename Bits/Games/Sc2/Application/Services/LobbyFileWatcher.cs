using Bits.Sc2.Configuration;
using Bits.Sc2.Infrastructure;
using Core.Diagnostics;
using Core.IO;
using Microsoft.Extensions.Options;

namespace Bits.Sc2.Application.Services;

public sealed class LobbyFileWatcher : ILobbyFileWatcher
{
    private readonly Sc2RuntimeOptions _options;
    private readonly ISc2PathResolver _pathResolver;
    private DirectoryEventScanner? _scanner;

    public LobbyFileWatcher(IOptions<Sc2RuntimeOptions> options, ISc2PathResolver pathResolver)
    {
        _options = options?.Value ?? new Sc2RuntimeOptions();
        _pathResolver = pathResolver ?? throw ExceptionFactory.ArgumentNull(nameof(pathResolver));
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        var root = _pathResolver.GetLobbyRoot();
        if (!Directory.Exists(root))
        {
            throw ExceptionFactory.DirectoryNotFound($"Lobby root directory not found: {root}");
        }

        _scanner = new DirectoryEventScanner(
            rootPath: root,
            includeSubdirectories: true,
            filter: _options.LobbyFileName,
            debounceWindow: TimeSpan.FromMilliseconds(Math.Max(50, _options.PollIntervalMs)),
            internalBufferSizeBytes: 256 * 1024);

        return Task.CompletedTask;
    }

    public async IAsyncEnumerable<FileChange> WatchAsync([System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken)
    {
        if (_scanner == null)
        {
            yield break;
        }

        await foreach (var change in _scanner.WatchAsync(cancellationToken))
        {
            yield return change;
        }
    }

    public string? GetCurrentLobbyPath()
    {
        var lobbyPath = _pathResolver.GetLobbyFilePath();
        return File.Exists(lobbyPath) ? lobbyPath : null;
    }

    public async ValueTask DisposeAsync()
    {
        if (_scanner != null)
        {
            await _scanner.DisposeAsync().ConfigureAwait(false);
            _scanner = null;
        }
    }
}
