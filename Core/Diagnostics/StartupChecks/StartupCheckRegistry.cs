namespace Core.Diagnostics.StartupChecks;

public sealed class StartupCheckRegistry : IStartupCheckRegistry
{
    private StartupCheckReport? _lastReport;

    public StartupCheckReport? GetLastReport() => _lastReport;

    public void SetLastReport(StartupCheckReport report)
    {
        _lastReport = report;
    }
}
