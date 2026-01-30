using Messaging.Shared;

namespace Core.Messaging;

/// <summary>
/// Extended IMessageBus interface that supports publishing Message objects.
/// Provides both the original payload-based API and the new message-based API.
/// </summary>
public interface IMessageBusEx : IMessageBus
{
    /// <summary>
    /// Publish a strongly-typed Message object.
    /// </summary>
    void Publish<TPayload>(Message<TPayload> message);
    Task PublishAsync<TPayload>(Message<TPayload> message, CancellationToken cancellationToken = default);

    /// <summary>
    /// Subscribe to messages of a specific type using the Message wrapper.
    /// </summary>
    Guid Subscribe<TPayload>(MessageType messageType, Action<Message<TPayload>> handler);
}

/// <summary>
/// Extended MessageBus that supports both payload and Message-based publishing.
/// </summary>
public class MessageBusEx : MessageBus, IMessageBusEx
{
    /// <summary>
    /// Publish a Message object. Extracts the payload and calls the base implementation.
    /// </summary>
    public void Publish<TPayload>(Message<TPayload> message)
    {
        // Publish using the base MessageBus with the payload + metadata
        base.Publish(message.Type, message.Payload, message.Metadata);
    }

    public Task PublishAsync<TPayload>(Message<TPayload> message, CancellationToken cancellationToken = default)
    {
        return base.PublishAsync(message.Type, message.Payload, message.Metadata, cancellationToken);
    }

    /// <summary>
    /// Subscribe with Message wrapper - wraps payload in Message on receive.
    /// </summary>
    public Guid Subscribe<TPayload>(MessageType messageType, Action<Message<TPayload>> handler)
    {
        return base.SubscribeWithMetadata<TPayload>(messageType, (payload, metadata) =>
        {
            var message = new GenericMessage<TPayload>(messageType, payload)
            {
                Metadata = metadata
            };
            handler(message);
        });
    }

    // Internal message wrapper for generic subscriptions
    private class GenericMessage<TPayload>(MessageType type, TPayload payload) : Message<TPayload>(payload)
    {
        public override MessageType Type => type;
    }
}
