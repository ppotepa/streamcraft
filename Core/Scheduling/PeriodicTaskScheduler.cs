using System.Collections.Concurrent;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Core.Scheduling;

public sealed class PeriodicTaskScheduler : IScheduler, ISchedulerDiagnostics, IHostedService, IDisposable
{
    private readonly ConcurrentDictionary<string, ScheduledTask> _tasks = new(StringComparer.OrdinalIgnoreCase);
    private readonly ILogger<PeriodicTaskScheduler> _logger;
    private bool _stopping;

    public PeriodicTaskScheduler(ILogger<PeriodicTaskScheduler> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public IDisposable SchedulePeriodic(string name, TimeSpan interval, Func<CancellationToken, Task> action, bool runImmediately = false)
    {
        if (string.IsNullOrWhiteSpace(name)) throw new ArgumentException("Task name is required.", nameof(name));
        if (interval <= TimeSpan.Zero) throw new ArgumentOutOfRangeException(nameof(interval));
        if (action == null) throw new ArgumentNullException(nameof(action));

        if (_stopping)
        {
            throw new InvalidOperationException("Scheduler is stopping and cannot accept new tasks.");
        }

        var task = new ScheduledTask(name, interval, action, runImmediately, _logger);
        if (!_tasks.TryAdd(name, task))
        {
            throw new InvalidOperationException($"Task '{name}' is already scheduled.");
        }

        task.Start();

        return new TaskHandle(() =>
        {
            if (_tasks.TryRemove(name, out var existing))
            {
                existing.Dispose();
            }
        });
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _stopping = true;

        foreach (var task in _tasks.Values)
        {
            task.Dispose();
        }

        _tasks.Clear();
        return Task.CompletedTask;
    }

    public void Dispose()
    {
        _stopping = true;
        foreach (var task in _tasks.Values)
        {
            task.Dispose();
        }
        _tasks.Clear();
    }

    public int TaskCount => _tasks.Count;
    public bool IsStopping => _stopping;

    private sealed class TaskHandle : IDisposable
    {
        private readonly Action _dispose;
        private int _disposed;

        public TaskHandle(Action dispose)
        {
            _dispose = dispose;
        }

        public void Dispose()
        {
            if (Interlocked.Exchange(ref _disposed, 1) == 0)
            {
                _dispose();
            }
        }
    }

    private sealed class ScheduledTask : IDisposable
    {
        private readonly string _name;
        private readonly TimeSpan _interval;
        private readonly Func<CancellationToken, Task> _action;
        private readonly bool _runImmediately;
        private readonly ILogger _logger;
        private readonly CancellationTokenSource _cts = new();
        private Task? _runner;

        public ScheduledTask(string name, TimeSpan interval, Func<CancellationToken, Task> action, bool runImmediately, ILogger logger)
        {
            _name = name;
            _interval = interval;
            _action = action;
            _runImmediately = runImmediately;
            _logger = logger;
        }

        public void Start()
        {
            if (_runner != null)
            {
                return;
            }

            _runner = Task.Run(RunAsync, _cts.Token);
        }

        private async Task RunAsync()
        {
            if (_runImmediately)
            {
                await ExecuteOnceAsync().ConfigureAwait(false);
            }

            using var timer = new PeriodicTimer(_interval);
            try
            {
                while (await timer.WaitForNextTickAsync(_cts.Token).ConfigureAwait(false))
                {
                    await ExecuteOnceAsync().ConfigureAwait(false);
                }
            }
            catch (OperationCanceledException)
            {
                // Expected on shutdown
            }
        }

        private async Task ExecuteOnceAsync()
        {
            try
            {
                await _action(_cts.Token).ConfigureAwait(false);
            }
            catch (OperationCanceledException)
            {
                // Expected during shutdown
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Scheduled task {TaskName} failed.", _name);
            }
        }

        public void Dispose()
        {
            _cts.Cancel();
            try
            {
                _runner?.Wait(TimeSpan.FromSeconds(2));
            }
            catch
            {
                // Ignore shutdown errors
            }
            finally
            {
                _cts.Dispose();
            }
        }
    }
}
