namespace Core.Runners;

/// <summary>
/// Registry for managing runners targeting panels
/// </summary>
public interface IRunnerRegistry
{
    void RegisterRunner(IRunner runner);
    IRunner? GetRunner(string name);
    IReadOnlyList<IRunner> GetAllRunners();
    void Clear();
    void StartAll();
    void StopAll();
}

public class RunnerRegistry : IRunnerRegistry
{
    private readonly Dictionary<string, IRunner> _runners = new(StringComparer.OrdinalIgnoreCase);
    private readonly object _lock = new();
    private bool _isRunning;

    public void RegisterRunner(IRunner runner)
    {
        lock (_lock)
        {
            _runners[runner.Name] = runner;
            if (_isRunning && !runner.IsRunning)
            {
                runner.Start();
            }
        }
    }

    public IRunner? GetRunner(string name)
    {
        lock (_lock)
        {
            _runners.TryGetValue(name, out var runner);
            return runner;
        }
    }

    public IReadOnlyList<IRunner> GetAllRunners()
    {
        lock (_lock)
        {
            return _runners.Values.ToList();
        }
    }

    public void Clear()
    {
        lock (_lock)
        {
            _runners.Clear();
        }
    }

    public void StartAll()
    {
        lock (_lock)
        {
            _isRunning = true;
            foreach (var runner in _runners.Values)
            {
                if (!runner.IsRunning)
                {
                    runner.Start();
                }
            }
        }
    }

    public void StopAll()
    {
        lock (_lock)
        {
            _isRunning = false;
            foreach (var runner in _runners.Values)
            {
                if (runner.IsRunning)
                {
                    runner.Stop();
                }
            }
        }
    }
}
