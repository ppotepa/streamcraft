using Bits.Sc2.Application.Services;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Bits.Sc2.Application.BackgroundServices;

/// <summary>
/// Background service that monitors heart rate vitals and updates Sc2BitState.
/// Replaces the manual VitalsRunner with proper IHostedService integration.
/// </summary>
public class VitalsBackgroundService : BackgroundService
{
    private readonly IVitalsService _vitalsService;
    private readonly ISc2BitStateService _stateService;
    private readonly ILogger<VitalsBackgroundService> _logger;
    private readonly TimeSpan _updateInterval = TimeSpan.FromMilliseconds(500);

    public VitalsBackgroundService(
        IVitalsService vitalsService,
        ISc2BitStateService stateService,
        ILogger<VitalsBackgroundService> logger)
    {
        _vitalsService = vitalsService ?? throw new ArgumentNullException(nameof(vitalsService));
        _stateService = stateService ?? throw new ArgumentNullException(nameof(stateService));
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

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var measurement = _vitalsService.GetLatestHeartRate();

                if (measurement != null)
                {
                    _stateService.HeartRate = measurement.Bpm;
                    _stateService.HeartRateTimestamp = measurement.Timestamp;
                    _stateService.HeartRateHasSignal = true;

                    _logger.LogTrace("Updated state with heart rate: {Bpm} bpm", measurement.Bpm);
                }
                else
                {
                    _stateService.HeartRate = null;
                    _stateService.HeartRateTimestamp = null;
                    _stateService.HeartRateHasSignal = false;

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
