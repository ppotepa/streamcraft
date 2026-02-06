using System;
using System.Threading;
using StreamCraft.Core.Messaging;

namespace StreamCraft.Core.Events;

public sealed class EventDiagnostics
{
    private long _messagesReceived;
    private long _triggersEvaluated;
    private long _triggersFired;
    private long _effectsQueued;
    private long _effectsDropped;
    private long _effectsSucceeded;
    private long _effectsFailed;
    private long _effectRetries;

    public void RecordMessage(MessageType messageType) => Interlocked.Increment(ref _messagesReceived);

    public void RecordTriggerEvaluation(bool fired)
    {
        Interlocked.Increment(ref _triggersEvaluated);
        if (fired)
        {
            Interlocked.Increment(ref _triggersFired);
        }
    }

    public void RecordEffectQueued() => Interlocked.Increment(ref _effectsQueued);

    public void RecordEffectDropped() => Interlocked.Increment(ref _effectsDropped);

    public void RecordEffectOutcome(bool success)
    {
        if (success)
        {
            Interlocked.Increment(ref _effectsSucceeded);
            return;
        }

        Interlocked.Increment(ref _effectsFailed);
    }

    public void RecordRetry() => Interlocked.Increment(ref _effectRetries);

    public EventDiagnosticsSnapshot Snapshot(int activeEffects = 0) => new(
        Interlocked.Read(ref _messagesReceived),
        Interlocked.Read(ref _triggersEvaluated),
        Interlocked.Read(ref _triggersFired),
        Interlocked.Read(ref _effectsQueued),
        Interlocked.Read(ref _effectsSucceeded),
        Interlocked.Read(ref _effectsFailed),
        Interlocked.Read(ref _effectsDropped),
        Interlocked.Read(ref _effectRetries),
        activeEffects,
        DateTimeOffset.UtcNow);
}

public sealed record EventDiagnosticsSnapshot(
    long MessagesReceived,
    long TriggersEvaluated,
    long TriggersFired,
    long EffectsQueued,
    long EffectsSucceeded,
    long EffectsFailed,
    long EffectsDropped,
    long EffectRetries,
    int ActiveEffects,
    DateTimeOffset CapturedAt);
