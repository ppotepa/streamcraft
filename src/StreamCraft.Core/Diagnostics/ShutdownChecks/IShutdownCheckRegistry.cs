namespace StreamCraft.Core.Diagnostics.ShutdownChecks;

public interface IShutdownCheckRegistry
{
    ShutdownCheckReport? GetLastReport();
    void SetLastReport(ShutdownCheckReport report);
}
