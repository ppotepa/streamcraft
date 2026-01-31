namespace Core.Diagnostics.StartupChecks;

public interface IStartupCheckRegistry
{
    StartupCheckReport? GetLastReport();
    void SetLastReport(StartupCheckReport report);
}
