namespace StreamCraft.Core.Messaging;

public interface IMessageBus<TMessageType> where TMessageType : Enum
{
    void Publish<TPayload>(TMessageType messageType, TPayload payload);

    Guid Subscribe<TPayload>(TMessageType messageType, Action<TPayload> handler);

    void Unsubscribe(Guid subscriptionId);

    void Clear();
}
