using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using StreamCraft.Core.Diagnostics;

namespace StreamCraft.Core.Events.BuiltIn;

/// <summary>
/// Built-in effect that logs exception notices surfaced through the event system.
/// </summary>
public sealed class ExceptionNotificationEffect : IEffect
{
    public const string EffectId = "builtin:core:exceptions:notify";
    private readonly ILogger<ExceptionNotificationEffect> _logger;

    public ExceptionNotificationEffect(ILogger<ExceptionNotificationEffect> logger)
    {
        _logger = logger;
    }

    public string Id => EffectId;

    public Task<EffectExecutionResult> ExecuteAsync(EventEnvelope envelope, CancellationToken cancellationToken = default)
    {
        if (envelope.Payload is not ExceptionNotice notice)
        {
            return Task.FromResult(EffectExecutionResult.Failed("Expected ExceptionNotice payload for exception notification effect."));
        }

        _logger.LogWarning(
            "[{Severity}] Exception {ExceptionId} from {Source} (Bit: {BitId}) - {Message}",
            notice.Severity,
            notice.Id,
            notice.Source ?? "unknown",
            notice.BitId ?? "n/a",
            notice.Message);

        return Task.FromResult(EffectExecutionResult.Completed());
    }
}
