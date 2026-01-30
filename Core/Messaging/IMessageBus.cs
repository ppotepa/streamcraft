using Messaging.Shared;

namespace Core.Messaging;

public interface IMessageBus
{
    void Publish<TPayload>(MessageType messageType, TPayload payload, MessageMetadata? metadata = null);
    Task PublishAsync<TPayload>(MessageType messageType, TPayload payload, MessageMetadata? metadata = null, CancellationToken cancellationToken = default);

    Guid Subscribe<TPayload>(MessageType messageType, Action<TPayload> handler);

    void Unsubscribe(Guid subscriptionId);

    void Clear();
}

public interface IMessageBusDiagnostics
{
    long PendingMessages { get; }
    int SubscriptionCount { get; }
    DateTime LastPublishedUtc { get; }
}
