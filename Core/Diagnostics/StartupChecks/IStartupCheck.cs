namespace Core.Diagnostics.StartupChecks;

public interface IStartupCheck
{
    string Name { get; }
    bool IsCritical { get; }
    StartupCheckStage Stage { get; }
    Task<StartupCheckResult> RunAsync(StartupCheckContext context, CancellationToken cancellationToken = default);
}
