using System.Collections.Concurrent;
using Core.Diagnostics;

namespace Core.State;

public sealed class BitStateStoreRegistry : IBitStateStoreRegistry
{
    private readonly ConcurrentDictionary<string, object> _stores = new(StringComparer.OrdinalIgnoreCase);
    private readonly ConcurrentDictionary<string, TaskCompletionSource<object>> _waiters = new(StringComparer.OrdinalIgnoreCase);

    public void Register<TState>(string bitId, IBitStateStore<TState> store)
    {
        if (string.IsNullOrWhiteSpace(bitId)) throw ExceptionFactory.Argument("Bit id is required.", nameof(bitId));
        if (store == null) throw ExceptionFactory.ArgumentNull(nameof(store));

        var key = Normalize(bitId);
        _stores[key] = store;

        if (_waiters.TryRemove(key, out var waiter))
        {
            waiter.TrySetResult(store);
        }
    }

    public bool TryGet(string bitId, out IBitStateStore store)
    {
        store = default!;
        if (string.IsNullOrWhiteSpace(bitId)) return false;

        var key = Normalize(bitId);
        if (_stores.TryGetValue(key, out var boxed) && boxed is IBitStateStore typed)
        {
            store = typed;
            return true;
        }

        return false;
    }

    public bool TryGet<TState>(string bitId, out IBitStateStore<TState> store)
    {
        store = default!;
        if (string.IsNullOrWhiteSpace(bitId)) return false;

        var key = Normalize(bitId);
        if (!_stores.TryGetValue(key, out var boxed))
        {
            return false;
        }

        if (boxed is IBitStateStore<TState> typedStore)
        {
            store = typedStore;
            return true;
        }

        throw ExceptionFactory.InvalidOperation($"State store registered for '{bitId}' has incompatible type.");
    }

    public async Task<IBitStateStore<TState>> WaitForStoreAsync<TState>(string bitId, CancellationToken cancellationToken)
    {
        if (TryGet(bitId, out IBitStateStore<TState> store))
        {
            return store;
        }

        var key = Normalize(bitId);
        var waiter = _waiters.GetOrAdd(key, _ => new TaskCompletionSource<object>(TaskCreationOptions.RunContinuationsAsynchronously));

        if (TryGet(bitId, out store))
        {
            _waiters.TryRemove(key, out _);
            waiter.TrySetResult(store);
        }

        using var registration = cancellationToken.Register(() =>
        {
            if (_waiters.TryRemove(key, out var tcs))
            {
                tcs.TrySetCanceled(cancellationToken);
            }
        });

        var result = await waiter.Task.ConfigureAwait(false);
        if (result is IBitStateStore<TState> typedStore)
        {
            return typedStore;
        }

        throw ExceptionFactory.InvalidOperation($"State store registered for '{bitId}' has incompatible type.");
    }

    public IReadOnlyDictionary<string, IBitStateStore> GetAll()
    {
        var result = new Dictionary<string, IBitStateStore>(StringComparer.OrdinalIgnoreCase);
        foreach (var entry in _stores)
        {
            if (entry.Value is IBitStateStore store)
            {
                result[entry.Key] = store;
            }
        }

        return result;
    }

    private static string Normalize(string bitId) => bitId.Trim().ToLowerInvariant();
}
