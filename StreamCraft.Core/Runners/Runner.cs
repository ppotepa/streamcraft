using StreamCraft.Core.Panels;

namespace StreamCraft.Core.Runners;

/// <summary>
/// Base class for runners that execute background tasks targeting specific panels.
/// Panels are singletons, and runners operate on panel state.
/// </summary>
public abstract class Runner<TPanel, TState> : IRunner
    where TPanel : IPanel
    where TState : class
{
    protected TPanel Panel { get; private set; } = default!;
    protected CancellationTokenSource? RunnerCts { get; private set; }
    protected Task? RunnerTask { get; private set; }

    public string Name => GetType().Name;
    public bool IsRunning => RunnerTask != null && !RunnerTask.IsCompleted;

    public void Initialize(TPanel panel)
    {
        Panel = panel;
        OnInitialize();
    }

    void IRunner.InitializeRunner(object panel)
    {
        if (panel is TPanel typedPanel)
        {
            Initialize(typedPanel);
        }
        else
        {
            throw new ArgumentException($"Panel must be of type {typeof(TPanel).Name}");
        }
    }

    protected virtual void OnInitialize() { }

    public void Start()
    {
        if (IsRunning)
        {
            return;
        }

        RunnerCts = new CancellationTokenSource();
        RunnerTask = Task.Run(() => RunAsync(RunnerCts.Token), RunnerCts.Token);
        OnStarted();
    }

    public void Stop()
    {
        if (RunnerCts == null || RunnerTask == null)
        {
            return;
        }

        try
        {
            RunnerCts.Cancel();
            RunnerTask.Wait(TimeSpan.FromSeconds(5));
        }
        catch (OperationCanceledException)
        {
            // Expected
        }
        catch
        {
            // Ignore other cancellation errors
        }
        finally
        {
            RunnerCts?.Dispose();
            RunnerCts = null;
            RunnerTask = null;
            OnStopped();
        }
    }

    protected abstract Task RunAsync(CancellationToken cancellationToken);

    protected virtual void OnStarted() { }
    protected virtual void OnStopped() { }

    protected TState GetPanelState()
    {
        var snapshot = Panel.GetStateSnapshot();
        if (snapshot is TState state)
        {
            return state;
        }
        throw new InvalidOperationException($"Panel state is not of expected type {typeof(TState).Name}");
    }

    protected void UpdatePanelState(Action<TState> updateAction)
    {
        // Access panel through reflection to modify state
        var stateProperty = Panel.GetType().GetProperty("State",
            System.Reflection.BindingFlags.NonPublic |
            System.Reflection.BindingFlags.Instance);

        var stateLockField = Panel.GetType().GetField("StateLock",
            System.Reflection.BindingFlags.NonPublic |
            System.Reflection.BindingFlags.Instance);

        if (stateProperty == null || stateLockField == null)
        {
            throw new InvalidOperationException("Cannot access panel state or lock");
        }

        var stateLock = stateLockField.GetValue(Panel);
        var state = stateProperty.GetValue(Panel) as TState;

        if (state == null || stateLock == null)
        {
            throw new InvalidOperationException("Panel state or lock is null");
        }

        lock (stateLock)
        {
            updateAction(state);

            // Update LastUpdated timestamp
            var updateMethod = Panel.GetType().GetMethod("UpdateLastModified",
                System.Reflection.BindingFlags.NonPublic |
                System.Reflection.BindingFlags.Instance);
            updateMethod?.Invoke(Panel, null);
        }
    }

    public void Dispose()
    {
        Stop();
    }
}

public interface IRunner : IDisposable
{
    string Name { get; }
    bool IsRunning { get; }
    void InitializeRunner(object panel);
    void Start();
    void Stop();
}
