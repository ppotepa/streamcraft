using System;
using System.Collections.Concurrent;

namespace StreamCraft.Core.Events;

public sealed class InMemoryTriggerRegistry : ITriggerRegistry
{
    private readonly ConcurrentDictionary<string, ITrigger> _triggers = new();
    public event EventHandler<TriggerRegistryChangedEventArgs>? Changed;

    public void Register(ITrigger trigger)
    {
        ArgumentNullException.ThrowIfNull(trigger);

        _triggers[trigger.Id] = trigger;
        Changed?.Invoke(this, new TriggerRegistryChangedEventArgs(trigger, TriggerRegistryChangeType.Added));
    }

    public bool TryRemove(string triggerId)
    {
        ArgumentNullException.ThrowIfNull(triggerId);

        if (_triggers.TryRemove(triggerId, out var removed) && removed != null)
        {
            Changed?.Invoke(this, new TriggerRegistryChangedEventArgs(removed, TriggerRegistryChangeType.Removed));
            return true;
        }

        return false;
    }

    public IReadOnlyList<ITrigger> GetAll()
    {
        return _triggers.Values.ToArray();
    }
}
