using StreamCraft.Core.Messaging;

namespace StreamCraft.Core.Events;

public sealed record EventEnvelope(MessageType MessageType, object Payload, MessageMetadata Metadata)
{
    public static EventEnvelope FromMessage<TPayload>(MessageType messageType, TPayload payload, MessageMetadata? metadata = null)
    {
        return new EventEnvelope(messageType, payload!, metadata ?? MessageMetadata.Create());
    }
}
