using System.Collections.Concurrent;
using System.Runtime.CompilerServices;
using System.Threading.Channels;
using Serilog;

namespace Core.State;

public sealed class BitStateStore<TState> : IBitStateStore<TState>, IBitStateStoreDiagnostics, IDisposable
{
    private readonly TState _state;
    private readonly Func<TState, TState>? _snapshotFactory;
    private readonly Channel<Action<TState>> _updates;
    private readonly CancellationTokenSource _cts = new();
    private readonly Task _processor;
    private readonly object _stateLock = new();
    private readonly ILogger? _logger;
    private readonly ConcurrentDictionary<Guid, Channel<TState>> _subscribers = new();
    private long _pendingUpdates;
    private DateTime _lastUpdatedUtc = DateTime.MinValue;

    public BitStateStore(TState state, Func<TState, TState>? snapshotFactory = null, ILogger? logger = null)
    {
        _state = state ?? throw new ArgumentNullException(nameof(state));
        _snapshotFactory = snapshotFactory;
        _logger = logger;
        _updates = Channel.CreateUnbounded<Action<TState>>(new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = false
        });
        _processor = Task.Run(ProcessAsync);
    }

    public int SubscriberCount => _subscribers.Count;
    public long PendingUpdates => Interlocked.Read(ref _pendingUpdates);
    public DateTime LastUpdatedUtc => _lastUpdatedUtc;

    public void Update(Action<TState> update)
    {
        if (update == null) throw new ArgumentNullException(nameof(update));
        Interlocked.Increment(ref _pendingUpdates);
        if (!_updates.Writer.TryWrite(update))
        {
            Interlocked.Decrement(ref _pendingUpdates);
            throw new InvalidOperationException("State store is not accepting updates.");
        }
    }

    public TState GetSnapshot()
    {
        lock (_stateLock)
        {
            return _snapshotFactory != null ? _snapshotFactory(_state) : _state;
        }
    }

    object IBitStateStore.GetSnapshot() => GetSnapshot()!;

    async IAsyncEnumerable<object> IBitStateStore.WatchAsync([EnumeratorCancellation] CancellationToken cancellationToken)
    {
        await foreach (var snapshot in WatchAsync(cancellationToken))
        {
            yield return snapshot!;
        }
    }

    public async IAsyncEnumerable<TState> WatchAsync([EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var channel = Channel.CreateUnbounded<TState>(new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = false
        });
        var id = Guid.NewGuid();
        _subscribers[id] = channel;

        channel.Writer.TryWrite(GetSnapshot());

        using var registration = cancellationToken.Register(() =>
        {
            if (_subscribers.TryRemove(id, out var existing))
            {
                existing.Writer.TryComplete();
            }
        });

        try
        {
            while (await channel.Reader.WaitToReadAsync(cancellationToken))
            {
                while (channel.Reader.TryRead(out var snapshot))
                {
                    yield return snapshot;
                }
            }
        }
        finally
        {
            if (_subscribers.TryRemove(id, out var existing))
            {
                existing.Writer.TryComplete();
            }
        }
    }

    public void Dispose()
    {
        _updates.Writer.TryComplete();
        _cts.Cancel();

        try
        {
            _processor.Wait(TimeSpan.FromSeconds(2));
        }
        catch
        {
            // Ignore shutdown errors
        }
        finally
        {
            foreach (var subscriber in _subscribers.Values)
            {
                subscriber.Writer.TryComplete();
            }
            _subscribers.Clear();
            _cts.Dispose();
        }
    }

    private async Task ProcessAsync()
    {
        try
        {
            while (await _updates.Reader.WaitToReadAsync(_cts.Token))
            {
                while (_updates.Reader.TryRead(out var update))
                {
                    try
                    {
                        lock (_stateLock)
                        {
                            update(_state);
                        }
                        _lastUpdatedUtc = DateTime.UtcNow;
                        PublishSnapshot();
                    }
                    catch (Exception ex)
                    {
                        _logger?.Error(ex, "State update failed.");
                    }
                    finally
                    {
                        Interlocked.Decrement(ref _pendingUpdates);
                    }
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Expected during shutdown
        }
    }

    private void PublishSnapshot()
    {
        if (_subscribers.IsEmpty)
        {
            return;
        }

        TState snapshot;
        lock (_stateLock)
        {
            snapshot = _snapshotFactory != null ? _snapshotFactory(_state) : _state;
        }

        foreach (var subscriber in _subscribers.Values)
        {
            subscriber.Writer.TryWrite(snapshot);
        }
    }
}
