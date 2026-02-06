using System.Collections.Generic;
using StreamCraft.Core.Diagnostics;
using StreamCraft.Core.Messaging;

namespace StreamCraft.Core.Events.BuiltIn;

/// <summary>
/// Built-in trigger that fires whenever the exception pipeline publishes an ExceptionNotice.
/// </summary>
public sealed class ExceptionRaisedTrigger : ITrigger
{
    public const string TriggerId = "builtin:core:exceptions:raised";
    private static readonly IReadOnlyList<string> _effectIds = new[] { ExceptionNotificationEffect.EffectId };

    public string Id => TriggerId;
    public MessageType MessageType => ExceptionMessageType.ExceptionRaised;
    public IReadOnlyList<string> EffectIds => _effectIds;

    public TriggerEvaluationResult Evaluate(EventEnvelope envelope)
    {
        if (envelope.Payload is ExceptionNotice)
        {
            return new TriggerEvaluationResult(true);
        }

        return new TriggerEvaluationResult(false, "Expected ExceptionNotice payload.");
    }
}
