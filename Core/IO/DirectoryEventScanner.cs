using System.Collections.Concurrent;
using System.Runtime.CompilerServices;
using System.Threading.Channels;

namespace Core.IO;

public enum FileChangeKind
{
    Created,
    Changed,
    Deleted,
    Renamed,
    Overflow
}

public sealed record FileChange(FileChangeKind Kind, string Path, string? OldPath = null);

public sealed class DirectoryEventScanner : IAsyncDisposable
{
    private readonly FileSystemWatcher _watcher;
    private readonly Channel<FileChange> _channel;
    private readonly ConcurrentDictionary<string, Pending> _pending = new(StringComparer.OrdinalIgnoreCase);
    private readonly TimeSpan _debounceWindow;
    private readonly PeriodicTimer _flushTimer;
    private readonly CancellationTokenSource _internalCts = new();
    private readonly Task _flusherTask;

    private sealed record Pending(long LastTicks, FileChangeKind Kind, string? OldPath);

    public DirectoryEventScanner(
        string rootPath,
        bool includeSubdirectories,
        string filter,
        TimeSpan debounceWindow,
        int internalBufferSizeBytes = 64 * 1024,
        int channelCapacity = 10_000)
    {
        if (string.IsNullOrWhiteSpace(rootPath))
        {
            throw new ArgumentException("Root path is required.", nameof(rootPath));
        }

        var fullRoot = Path.GetFullPath(rootPath);
        if (!Directory.Exists(fullRoot))
        {
            throw new DirectoryNotFoundException($"Directory not found: {fullRoot}");
        }

        _debounceWindow = debounceWindow <= TimeSpan.Zero
            ? TimeSpan.FromMilliseconds(200)
            : debounceWindow;

        _channel = Channel.CreateBounded<FileChange>(new BoundedChannelOptions(channelCapacity)
        {
            FullMode = BoundedChannelFullMode.Wait,
            SingleReader = false,
            SingleWriter = false
        });

        _watcher = new FileSystemWatcher(fullRoot, filter)
        {
            IncludeSubdirectories = includeSubdirectories,
            NotifyFilter =
                NotifyFilters.FileName |
                NotifyFilters.DirectoryName |
                NotifyFilters.LastWrite |
                NotifyFilters.Size |
                NotifyFilters.CreationTime |
                NotifyFilters.Attributes,
            InternalBufferSize = ClampBuffer(internalBufferSizeBytes)
        };

        _watcher.Created += (_, e) => Enqueue(FileChangeKind.Created, e.FullPath);
        _watcher.Changed += (_, e) => Enqueue(FileChangeKind.Changed, e.FullPath);
        _watcher.Deleted += (_, e) => Enqueue(FileChangeKind.Deleted, e.FullPath);
        _watcher.Renamed += (_, e) => Enqueue(FileChangeKind.Renamed, e.FullPath, e.OldFullPath);
        _watcher.Error += (_, __) => EnqueueOverflow(fullRoot);

        _watcher.EnableRaisingEvents = true;

        _flushTimer = new PeriodicTimer(TimeSpan.FromMilliseconds(Math.Max(25, _debounceWindow.TotalMilliseconds / 2)));
        _flusherTask = Task.Run(FlusherLoop);
    }

    public async IAsyncEnumerable<FileChange> WatchAsync([EnumeratorCancellation] CancellationToken cancellationToken)
    {
        while (await _channel.Reader.WaitToReadAsync(cancellationToken))
        {
            while (_channel.Reader.TryRead(out var item))
            {
                yield return item;
            }
        }
    }

    private void Enqueue(FileChangeKind kind, string path, string? oldPath = null)
    {
        var now = DateTime.UtcNow.Ticks;

        _pending.AddOrUpdate(
            key: path,
            addValueFactory: _ => new Pending(now, kind, oldPath),
            updateValueFactory: (_, prev) =>
            {
                if (kind == FileChangeKind.Deleted) return new Pending(now, kind, oldPath);
                if (kind == FileChangeKind.Renamed) return new Pending(now, kind, oldPath ?? prev.OldPath);
                if (prev.Kind == FileChangeKind.Created && kind == FileChangeKind.Changed)
                {
                    return new Pending(now, FileChangeKind.Created, prev.OldPath);
                }
                return new Pending(now, kind, oldPath ?? prev.OldPath);
            });
    }

    private void EnqueueOverflow(string rootPath)
    {
        _pending.Clear();
        _channel.Writer.TryWrite(new FileChange(FileChangeKind.Overflow, rootPath));
    }

    private async Task FlusherLoop()
    {
        try
        {
            while (await _flushTimer.WaitForNextTickAsync(_internalCts.Token))
            {
                var cutoffTicks = DateTime.UtcNow.Subtract(_debounceWindow).Ticks;

                foreach (var kvp in _pending)
                {
                    if (kvp.Value.LastTicks > cutoffTicks)
                    {
                        continue;
                    }

                    if (_pending.TryRemove(kvp.Key, out var pending))
                    {
                        await _channel.Writer.WriteAsync(
                            new FileChange(pending.Kind, kvp.Key, pending.OldPath),
                            _internalCts.Token);
                    }
                }
            }
        }
        catch (OperationCanceledException)
        {
            // normal shutdown
        }
        finally
        {
            _channel.Writer.TryComplete();
        }
    }

    private static int ClampBuffer(int bytes)
    {
        const int min = 4 * 1024;
        const int max = 4 * 1024 * 1024;
        bytes = Math.Clamp(bytes, min, max);
        bytes = (bytes / (4 * 1024)) * (4 * 1024);
        return bytes;
    }

    public async ValueTask DisposeAsync()
    {
        _watcher.EnableRaisingEvents = false;
        _watcher.Dispose();

        _internalCts.Cancel();
        _flushTimer.Dispose();

        try
        {
            await _flusherTask.ConfigureAwait(false);
        }
        catch
        {
            // ignore shutdown errors
        }

        _internalCts.Dispose();
    }
}
