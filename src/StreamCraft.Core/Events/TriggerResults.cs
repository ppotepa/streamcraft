namespace StreamCraft.Core.Events;

public sealed record TriggerEvaluationResult(bool ShouldFire, string? Reason = null);

public sealed record EffectExecutionResult(bool Success, string? Message = null, Exception? Exception = null, bool RetrySuggested = false)
{
    public static EffectExecutionResult Completed(string? message = null) => new(true, message);

    public static EffectExecutionResult Failed(string? message = null, Exception? exception = null, bool retrySuggested = false)
        => new(false, message, exception, retrySuggested);
}
