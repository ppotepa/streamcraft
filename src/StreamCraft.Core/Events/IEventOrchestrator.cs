using System;
using StreamCraft.Core.Messaging;

namespace StreamCraft.Core.Events;

public interface ITrigger
{
    string Id { get; }
    MessageType MessageType { get; }
    IReadOnlyList<string> EffectIds { get; }
    TriggerEvaluationResult Evaluate(EventEnvelope envelope);
}

public interface IEffect
{
    string Id { get; }
    Task<EffectExecutionResult> ExecuteAsync(EventEnvelope envelope, CancellationToken cancellationToken = default);
}

public interface ITriggerRegistry
{
    event EventHandler<TriggerRegistryChangedEventArgs>? Changed;
    void Register(ITrigger trigger);
    bool TryRemove(string triggerId);
    IReadOnlyList<ITrigger> GetAll();
}

public interface IEffectRegistry
{
    event EventHandler<EffectRegistryChangedEventArgs>? Changed;
    void Register(IEffect effect);
    bool TryRemove(string effectId);
    bool TryGet(string effectId, out IEffect? effect);
    IReadOnlyList<IEffect> GetAll();
}

public interface IEventOrchestrator
{
    Task StartAsync(CancellationToken cancellationToken);
    Task StopAsync(CancellationToken cancellationToken);
}

public sealed class TriggerRegistryChangedEventArgs : EventArgs
{
    public TriggerRegistryChangedEventArgs(ITrigger trigger, TriggerRegistryChangeType changeType)
    {
        Trigger = trigger;
        ChangeType = changeType;
    }

    public ITrigger Trigger { get; }
    public TriggerRegistryChangeType ChangeType { get; }
}

public enum TriggerRegistryChangeType
{
    Added,
    Removed
}

public sealed class EffectRegistryChangedEventArgs : EventArgs
{
    public EffectRegistryChangedEventArgs(IEffect effect, EffectRegistryChangeType changeType)
    {
        Effect = effect;
        ChangeType = changeType;
    }

    public IEffect Effect { get; }
    public EffectRegistryChangeType ChangeType { get; }
}

public enum EffectRegistryChangeType
{
    Added,
    Removed
}
