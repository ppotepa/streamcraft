using StreamCraft.Core.Messaging;

namespace StreamCraft.Core.Panels;

public interface IPanel
{
    string Id { get; }
    string Type { get; }
    DateTime LastUpdated { get; }
    object GetStateSnapshot();
    void InitializePanel(object messageBus);
}

public abstract class Panel<TState, TMessageType> : IPanel
    where TState : class, new()
    where TMessageType : Enum
{
    protected IMessageBus<TMessageType> MessageBus { get; private set; } = null!;
    protected TState State { get; set; } = new();
    protected readonly object StateLock = new();

    public virtual string Id => GetType().Name
        .Replace("Panel", "")
        .ToLowerInvariant();
    public abstract string Type { get; }
    public DateTime LastUpdated { get; protected set; } = DateTime.UtcNow;

    public void Initialize(IMessageBus<TMessageType> messageBus)
    {
        MessageBus = messageBus;
        RegisterHandlers();
    }

    void IPanel.InitializePanel(object messageBus)
    {
        if (messageBus is IMessageBus<TMessageType> typedBus)
        {
            Initialize(typedBus);
        }
        else
        {
            throw new ArgumentException($"Message bus must be of type IMessageBus<{typeof(TMessageType).Name}>");
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

    protected void UpdateLastModified()
    {
        LastUpdated = DateTime.UtcNow;
    }
}
