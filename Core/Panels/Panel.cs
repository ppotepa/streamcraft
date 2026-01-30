using Core.Messaging;
using Messaging.Shared;
using System;

namespace Core.Panels;

public interface IPanel
{
    string Id { get; }
    string Type { get; }
    DateTime LastUpdated { get; }
    event Action<IPanel>? StateUpdated;
    object GetStateSnapshot();
    void InitializePanel(object messageBus);
}

public interface IStatefulPanel<TState> : IPanel where TState : class
{
    void UpdateState(Action<TState> updateAction);
}

public abstract class Panel<TState> : IStatefulPanel<TState>
    where TState : class, new()
{
    protected IMessageBus MessageBus { get; private set; } = null!;
    protected TState State { get; set; } = new();
    protected readonly object StateLock = new();

    public event Action<IPanel>? StateUpdated;

    public virtual string Id => GetType().Name
        .Replace("Panel", "")
        .ToLowerInvariant();
    public abstract string Type { get; }
    public DateTime LastUpdated { get; protected set; } = DateTime.UtcNow;

    public void Initialize(IMessageBus messageBus)
    {
        MessageBus = messageBus;
        RegisterHandlers();
    }

    void IPanel.InitializePanel(object messageBus)
    {
        if (messageBus is IMessageBus typedBus)
        {
            Initialize(typedBus);
        }
        else
        {
            throw new ArgumentException($"Message bus must be of type IMessageBus");
        }
    }

    protected abstract void RegisterHandlers();

    public virtual object GetStateSnapshot()
    {
        lock (StateLock)
        {
            return State;
        }
    }

    public void UpdateState(Action<TState> updateAction)
    {
        lock (StateLock)
        {
            updateAction(State);
            UpdateLastModified();
        }
    }

    protected void UpdateLastModified()
    {
        LastUpdated = DateTime.UtcNow;
        StateUpdated?.Invoke(this);
    }
}
