using Bits.Sc2.Messages;
using Bits.Sc2.Panels;
using Core.Messaging;
using Core.Runners;
using Infrastructure;

namespace Bits.Sc2.Runners;

/// <summary>
/// Runner that monitors VitalsService for heart rate updates and updates Sc2BitState.
/// </summary>
public class VitalsRunner : IDisposable
{
    private readonly Func<Sc2BitState> _getState;
    private readonly TimeSpan _updateInterval = TimeSpan.FromMilliseconds(500);
    private CancellationTokenSource? _cts;
    private Task? _backgroundTask;

    public VitalsRunner(Func<Sc2BitState> getState)
    {
        _getState = getState;
    }

    public void Start()
    {
        if (_backgroundTask != null) return;

        _cts = new CancellationTokenSource();
        _backgroundTask = Task.Run(async () => await RunAsync(_cts.Token), _cts.Token);
    }

    public void Stop()
    {
        _cts?.Cancel();
        _backgroundTask?.Wait(TimeSpan.FromSeconds(5));
        _backgroundTask = null;
    }

    private async Task RunAsync(CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                var (timestamp, bpm, hasSignal) = VitalsService.Instance.GetLatestHeartRate();
                var state = _getState();

                // Update state directly
                state.HeartRate = hasSignal ? bpm : (int?)null;
                state.HeartRateTimestamp = timestamp != default ? timestamp : (DateTime?)null;
                state.HeartRateHasSignal = hasSignal;
            }
            catch
            {
                // Swallow errors to keep runner alive
            }

            try
            {
                await Task.Delay(_updateInterval, cancellationToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    public void Dispose()
    {
        Stop();
        _cts?.Dispose();
    }
}
