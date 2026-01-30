namespace Core.State;

public interface IBitStateStore
{
    object GetSnapshot();
    IAsyncEnumerable<object> WatchAsync(CancellationToken cancellationToken);
}

public interface IBitStateStore<TState> : IBitStateStore
{
    void Update(Action<TState> update);
    new TState GetSnapshot();
    new IAsyncEnumerable<TState> WatchAsync(CancellationToken cancellationToken);
}

public interface IBitStateStoreDiagnostics
{
    int SubscriberCount { get; }
    long PendingUpdates { get; }
    DateTime LastUpdatedUtc { get; }
}
