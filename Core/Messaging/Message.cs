using Core.Diagnostics;
using Messaging.Shared;

namespace Core.Messaging;

/// <summary>
/// Abstract base class for all messages in the system.
/// Uses composition with MessageMetadata instead of property inheritance.
/// </summary>
public abstract class Message
{
    /// <summary>
    /// Gets the MessageType for this message.
    /// </summary>
    public abstract MessageType Type { get; }

    /// <summary>
    /// Gets the message metadata.
    /// </summary>
    public MessageMetadata Metadata { get; init; } = new();
}

/// <summary>
/// Generic abstract base class for messages with typed payloads.
/// Provides compile-time type safety.
/// </summary>
public abstract class Message<TPayload> : Message
{
    /// <summary>
    /// The payload data for this message.
    /// </summary>
    public TPayload Payload { get; init; }

    protected Message(TPayload payload)
    {
        if (payload == null) throw ExceptionFactory.ArgumentNull(nameof(payload));
        Payload = payload;
    }
}

/// <summary>
/// Message metadata that can be attached to any message.
/// Uses composition instead of inheritance.
/// </summary>
public class MessageMetadata
{
    /// <summary>
    /// When the message was created.
    /// </summary>
    public DateTime Timestamp { get; init; }

    /// <summary>
    /// Unique identifier for this message instance.
    /// </summary>
    public Guid MessageId { get; init; }

    /// <summary>
    /// Optional correlation ID for tracking related messages.
    /// </summary>
    public string? CorrelationId { get; init; }

    /// <summary>
    /// The source bit that created this message.
    /// </summary>
    public string? Source { get; init; }

    /// <summary>
    /// Creates new metadata with default values.
    /// </summary>
    public MessageMetadata()
    {
        Timestamp = DateTime.UtcNow;
        MessageId = Guid.NewGuid();
    }

    /// <summary>
    /// Creates a copy with modified properties using with-expression.
    /// </summary>
    public static MessageMetadata Create(string? source = null, string? correlationId = null) => new()
    {
        Source = source,
        CorrelationId = correlationId
    };
}
