using Bits.Sc2.Application.Services;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Core.State;

namespace Bits.Sc2.Application.BackgroundServices;

/// <summary>
/// Background service that monitors heart rate vitals and updates Sc2BitState.
/// Replaces the manual VitalsRunner with proper IHostedService integration.
/// </summary>
public class VitalsBackgroundService : BackgroundService
{
    private readonly IVitalsService _vitalsService;
    private readonly IBitStateStoreRegistry _stateStoreRegistry;
    private readonly ILogger<VitalsBackgroundService> _logger;
    private readonly TimeSpan _updateInterval = TimeSpan.FromMilliseconds(500);
    private IBitStateStore<Sc2BitState>? _stateStore;

    public VitalsBackgroundService(
        IVitalsService vitalsService,
        IBitStateStoreRegistry stateStoreRegistry,
        ILogger<VitalsBackgroundService> logger)
    {
        _vitalsService = vitalsService ?? throw new ArgumentNullException(nameof(vitalsService));
        _stateStoreRegistry = stateStoreRegistry ?? throw new ArgumentNullException(nameof(stateStoreRegistry));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public override Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("VitalsBackgroundService starting...");
        return base.StartAsync(cancellationToken);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("VitalsBackgroundService is running.");
        _stateStore = await _stateStoreRegistry.WaitForStoreAsync<Sc2BitState>(Sc2Constants.StateStoreId, stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var measurement = _vitalsService.GetLatestHeartRate();

                if (measurement != null)
                {
                    _stateStore.Update(state =>
                    {
                        state.HeartRate = measurement.Bpm;
                        state.HeartRateTimestamp = measurement.Timestamp;
                        state.HeartRateHasSignal = true;
                        state.Panels ??= new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
                        state.Panels["metric"] = new
                        {
                            value = measurement.Bpm,
                            timestampUtc = measurement.Timestamp.ToString("O"),
                            units = "bpm",
                            hasSignal = true
                        };
                        state.PanelsUpdatedAt = DateTime.UtcNow;
                    });

                    _logger.LogTrace("Updated state with heart rate: {Bpm} bpm", measurement.Bpm);
                }
                else
                {
                    _stateStore.Update(state =>
                    {
                        state.HeartRate = null;
                        state.HeartRateTimestamp = null;
                        state.HeartRateHasSignal = false;
                        state.Panels ??= new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
                        state.Panels["metric"] = new
                        {
                            value = (int?)null,
                            timestampUtc = (string?)null,
                            units = "bpm",
                            hasSignal = false
                        };
                        state.PanelsUpdatedAt = DateTime.UtcNow;
                    });

                    _logger.LogTrace("No active heart rate signal");
                }

                await Task.Delay(_updateInterval, stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Error in VitalsBackgroundService");

                // Back off on error to prevent tight loop
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
        }
    }

    public override Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("VitalsBackgroundService stopping...");
        return base.StopAsync(cancellationToken);
    }
}
