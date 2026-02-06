using System;
using System.Collections.Concurrent;

namespace StreamCraft.Core.Events;

public sealed class InMemoryEffectRegistry : IEffectRegistry
{
    private readonly ConcurrentDictionary<string, IEffect> _effects = new();
    public event EventHandler<EffectRegistryChangedEventArgs>? Changed;

    public void Register(IEffect effect)
    {
        ArgumentNullException.ThrowIfNull(effect);

        _effects[effect.Id] = effect;
        Changed?.Invoke(this, new EffectRegistryChangedEventArgs(effect, EffectRegistryChangeType.Added));
    }

    public bool TryRemove(string effectId)
    {
        ArgumentNullException.ThrowIfNull(effectId);

        if (_effects.TryRemove(effectId, out var removed) && removed != null)
        {
            Changed?.Invoke(this, new EffectRegistryChangedEventArgs(removed, EffectRegistryChangeType.Removed));
            return true;
        }

        return false;
    }

    public bool TryGet(string effectId, out IEffect? effect)
    {
        ArgumentNullException.ThrowIfNull(effectId);

        return _effects.TryGetValue(effectId, out effect);
    }

    public IReadOnlyList<IEffect> GetAll()
    {
        return _effects.Values.ToArray();
    }
}
