namespace StreamCraft.Core.Diagnostics.ShutdownChecks;

public sealed class ShutdownCheckProgress
{
    public int Total { get; init; }
    public int Completed { get; init; }
    public string? CurrentName { get; init; }
    public ShutdownCheckStatus? CurrentStatus { get; init; }
}
