using Messaging.Shared;

namespace Core.Messaging;

public interface IMessageBus
{
    void Publish<TPayload>(MessageType messageType, TPayload payload);

    Guid Subscribe<TPayload>(MessageType messageType, Action<TPayload> handler);

    void Unsubscribe(Guid subscriptionId);

    void Clear();
}
