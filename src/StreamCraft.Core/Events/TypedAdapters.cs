using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using StreamCraft.Core.Messaging;

namespace StreamCraft.Core.Events;

public sealed class TypedTriggerAdapter<TEvent> : ITrigger where TEvent : notnull
{
    private readonly ITrigger<TEvent> _inner;
    private readonly MessageType _messageType;
    private readonly IReadOnlyList<string> _effectIds;
    private readonly ILogger _logger;

    public TypedTriggerAdapter(
        ITrigger<TEvent> inner,
        MessageType messageType,
        IReadOnlyList<string> effectIds,
        ILogger<TypedTriggerAdapter<TEvent>> logger)
    {
        _inner = inner ?? throw new ArgumentNullException(nameof(inner));
        _messageType = messageType;
        _effectIds = effectIds ?? throw new ArgumentNullException(nameof(effectIds));
        _logger = logger;
    }

    public string Id => _inner.TriggerId;
    public MessageType MessageType => _messageType;
    public IReadOnlyList<string> EffectIds => _effectIds;

    public TriggerEvaluationResult Evaluate(EventEnvelope envelope)
    {
        if (envelope.Payload is not TEvent typed)
        {
            return new TriggerEvaluationResult(false, $"Payload was not {typeof(TEvent).Name}.");
        }

        try
        {
            return _inner.Matches(typed)
                ? new TriggerEvaluationResult(true)
                : new TriggerEvaluationResult(false, "Trigger predicate returned false.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Typed trigger {TriggerId} failed during evaluation.", Id);
            return new TriggerEvaluationResult(false, "Trigger threw an exception.");
        }
    }
}

public sealed class TypedEffectAdapter<TEvent> : IEffect where TEvent : notnull
{
    private readonly IEffect<TEvent> _inner;
    private readonly IServiceProvider _services;
    private readonly ILogger _logger;

    public TypedEffectAdapter(
        IEffect<TEvent> inner,
        IServiceProvider services,
        ILogger<TypedEffectAdapter<TEvent>> logger)
    {
        _inner = inner ?? throw new ArgumentNullException(nameof(inner));
        _services = services ?? throw new ArgumentNullException(nameof(services));
        _logger = logger;
    }

    public string Id => _inner.EffectId;

    public async Task<EffectExecutionResult> ExecuteAsync(EventEnvelope envelope, CancellationToken cancellationToken = default)
    {
        if (envelope.Payload is not TEvent typed)
        {
            return EffectExecutionResult.Failed($"Payload was not {typeof(TEvent).Name}.");
        }

        var context = new TypedEffectContext(envelope.MessageType, envelope.Metadata, _services, _logger, cancellationToken);

        try
        {
            return await _inner.ExecuteAsync(typed, context, cancellationToken).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Typed effect {EffectId} failed during execution.", Id);
            return EffectExecutionResult.Failed(ex.Message, ex);
        }
    }
}

public sealed class TypedEffectContext : IEffectContext
{
    public TypedEffectContext(MessageType messageType, MessageMetadata metadata, IServiceProvider services, ILogger logger, CancellationToken cancellation)
    {
        MessageType = messageType;
        Metadata = metadata;
        Services = services;
        Logger = logger;
        Cancellation = cancellation;
    }

    public MessageType MessageType { get; }
    public MessageMetadata Metadata { get; }
    public IServiceProvider Services { get; }
    public ILogger? Logger { get; }
    public CancellationToken Cancellation { get; }
}
