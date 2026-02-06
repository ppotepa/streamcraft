namespace StreamCraft.Core.Diagnostics.ShutdownChecks;

public sealed class ShutdownCheckReport
{
    public DateTime StartedUtc { get; init; }
    public DateTime CompletedUtc { get; init; }
    public ShutdownCheckStatus OverallStatus { get; init; } = ShutdownCheckStatus.Ok;
    public IReadOnlyList<ShutdownCheckResult> Results { get; init; } = Array.Empty<ShutdownCheckResult>();
}
