namespace Core.Diagnostics.StartupChecks;

public sealed class StartupCheckProgress
{
    public int Total { get; init; }
    public int Completed { get; init; }
    public string? CurrentName { get; init; }
    public StartupCheckStatus? CurrentStatus { get; init; }
}
