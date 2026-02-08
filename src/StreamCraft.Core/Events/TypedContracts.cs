using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using StreamCraft.Core.Messaging;

namespace StreamCraft.Core.Events;

public interface IEventProducer<out TEvent> where TEvent : notnull
{
    string ProducerId { get; }
    IAsyncEnumerable<TEvent> StreamAsync(CancellationToken cancellationToken);
}

public interface ITrigger<in TEvent> where TEvent : notnull
{
    string TriggerId { get; }
    bool Matches(TEvent evt);
}

public interface IEffect<in TEvent> where TEvent : notnull
{
    string EffectId { get; }
    ValueTask<EffectExecutionResult> ExecuteAsync(TEvent evt, IEffectContext context, CancellationToken cancellationToken);
}

public interface IEffectContext
{
    MessageType MessageType { get; }
    MessageMetadata Metadata { get; }
    IServiceProvider Services { get; }
    ILogger? Logger { get; }
    CancellationToken Cancellation { get; }
}

public sealed record EventEnvelope<TEvent>(MessageType MessageType, TEvent Payload, MessageMetadata Metadata) where TEvent : notnull
{
    public static EventEnvelope<TEvent> From(MessageType messageType, TEvent payload, MessageMetadata? metadata = null)
        => new(messageType, payload, metadata ?? MessageMetadata.Create());
}
