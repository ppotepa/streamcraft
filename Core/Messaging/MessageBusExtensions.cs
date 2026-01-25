using Messaging.Shared;

namespace Core.Messaging;

/// <summary>
/// Extension methods for IMessageBus to simplify common patterns.
/// </summary>
public static class MessageBusExtensions
{
    /// <summary>
    /// Subscribe to a message type and automatically unsubscribe when disposed.
    /// </summary>
    public static IDisposable SubscribeScoped<TPayload>(
        this IMessageBus messageBus,
        MessageType messageType,
        Action<TPayload> handler)
    {
        var subscriptionId = messageBus.Subscribe(messageType, handler);
        return new Subscription(messageBus, subscriptionId);
    }

    private class Subscription : IDisposable
    {
        private readonly IMessageBus _messageBus;
        private readonly Guid _subscriptionId;
        private bool _disposed;

        public Subscription(IMessageBus messageBus, Guid subscriptionId)
        {
            _messageBus = messageBus;
            _subscriptionId = subscriptionId;
        }

        public void Dispose()
        {
            if (!_disposed)
            {
                _messageBus.Unsubscribe(_subscriptionId);
                _disposed = true;
            }
        }
    }
}
