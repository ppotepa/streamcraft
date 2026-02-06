namespace StreamCraft.Core.Diagnostics.ShutdownChecks;

public interface IShutdownCheck
{
    string Name { get; }
    bool IsCritical { get; }
    ShutdownCheckStage Stage { get; }
    Task<ShutdownCheckResult> RunAsync(ShutdownCheckContext context, CancellationToken cancellationToken = default);
}
