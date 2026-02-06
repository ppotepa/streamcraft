namespace StreamCraft.Core.Diagnostics.ShutdownChecks;

public sealed class ShutdownCheckRegistry : IShutdownCheckRegistry
{
    private ShutdownCheckReport? _lastReport;

    public ShutdownCheckReport? GetLastReport() => _lastReport;

    public void SetLastReport(ShutdownCheckReport report)
    {
        _lastReport = report;
    }
}
