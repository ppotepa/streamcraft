namespace Core.Scheduling;

public interface IScheduler
{
    IDisposable SchedulePeriodic(
        string name,
        TimeSpan interval,
        Func<CancellationToken, Task> action,
        bool runImmediately = false);
}

public interface ISchedulerDiagnostics
{
    int TaskCount { get; }
    bool IsStopping { get; }
}
