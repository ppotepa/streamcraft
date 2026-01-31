namespace Core.Diagnostics.StartupChecks;

public sealed class StartupCheckReport
{
    public DateTime StartedUtc { get; init; } = DateTime.UtcNow;
    public DateTime CompletedUtc { get; init; } = DateTime.UtcNow;
    public StartupCheckStatus OverallStatus { get; init; } = StartupCheckStatus.Ok;
    public IReadOnlyList<StartupCheckResult> Results { get; init; } = Array.Empty<StartupCheckResult>();
}
