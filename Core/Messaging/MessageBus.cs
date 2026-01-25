using System.Collections.Concurrent;
using Messaging.Shared;

namespace Core.Messaging;

public class MessageBus : IMessageBus
{
    private readonly ConcurrentDictionary<MessageType, ConcurrentDictionary<Guid, Delegate>> _subscriptions = new();
    private readonly object _publishLock = new();

    public void Publish<TPayload>(MessageType messageType, TPayload payload)
    {
        if (!_subscriptions.TryGetValue(messageType, out var handlers))
        {
            return;
        }

        lock (_publishLock)
        {
            foreach (var handler in handlers.Values)
            {
                try
                {
                    if (handler is Action<TPayload> typedHandler)
                    {
                        typedHandler(payload);
                    }
                }
                catch
                {
                    // Swallow handler exceptions to prevent cascade failures
                }
            }
        }
    }

    public Guid Subscribe<TPayload>(MessageType messageType, Action<TPayload> handler)
    {
        var subscriptionId = Guid.NewGuid();
        var handlers = _subscriptions.GetOrAdd(messageType, _ => new ConcurrentDictionary<Guid, Delegate>());
        handlers[subscriptionId] = handler;
        return subscriptionId;
    }

    public void Unsubscribe(Guid subscriptionId)
    {
        foreach (var handlers in _subscriptions.Values)
        {
            handlers.TryRemove(subscriptionId, out _);
        }
    }

    public void Clear()
    {
        _subscriptions.Clear();
    }
}
