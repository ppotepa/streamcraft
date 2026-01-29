using Bits.Sc2.Domain.Services;
using Bits.Sc2.Domain.ValueObjects;
using Bits.Sc2.Infrastructure.Repositories;
using Microsoft.Extensions.Logging;

namespace Bits.Sc2.Application.Services;

/// <summary>
/// Service for managing heart rate vitals with validation, business logic, and analysis.
/// </summary>
public class VitalsService : IVitalsService
{
    private readonly IVitalsRepository _repository;
    private readonly HeartRateAnalysisService _analysisService;
    private readonly ILogger<VitalsService> _logger;
    private readonly TimeSpan _signalTimeout = TimeSpan.FromSeconds(10);

    public VitalsService(
        IVitalsRepository repository,
        HeartRateAnalysisService analysisService,
        ILogger<VitalsService> logger)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _analysisService = analysisService ?? throw new ArgumentNullException(nameof(analysisService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public void AddHeartRateSample(int bpm, DateTime? timestamp = null)
    {
        try
        {
            var actualTimestamp = timestamp ?? DateTime.UtcNow;
            var measurement = new HeartRateMeasurement(bpm, actualTimestamp);

            _repository.AddSample(measurement);
            _logger.LogDebug("Added heart rate sample: {Bpm} bpm at {Timestamp}", bpm, actualTimestamp);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid heart rate value: {Bpm}", bpm);
            throw;
        }
    }

    public HeartRateMeasurement? GetLatestHeartRate()
    {
        var latest = _repository.GetLatest();

        if (latest == null)
        {
            _logger.LogTrace("No heart rate measurements available");
            return null;
        }

        if (latest.IsExpired(_signalTimeout))
        {
            _logger.LogTrace("Latest heart rate measurement is expired (older than {Timeout})", _signalTimeout);
            return null;
        }

        return latest;
    }

    public IReadOnlyList<HeartRateMeasurement> GetRecentSamples(TimeSpan duration)
    {
        var samples = _repository.GetRecentSamples(duration);
        _logger.LogTrace("Retrieved {Count} samples from last {Duration}", samples.Count, duration);
        return samples;
    }

    public HeartRateStatistics GetStatistics(TimeSpan? duration = null)
    {
        var samples = duration.HasValue
            ? _repository.GetRecentSamples(duration.Value)
            : _repository.GetRecentSamples(TimeSpan.FromMinutes(30));

        return _analysisService.GetStatistics(samples);
    }

    public HeartRateTrend GetTrend(int windowSize = 10)
    {
        var samples = _repository.GetRecentSamples(TimeSpan.FromMinutes(5));
        return _analysisService.CalculateTrend(samples, windowSize);
    }

    public IReadOnlyList<HeartRateSpike> DetectRecentSpikes(TimeSpan? duration = null)
    {
        var samples = duration.HasValue
            ? _repository.GetRecentSamples(duration.Value)
            : _repository.GetRecentSamples(TimeSpan.FromMinutes(10));

        return _analysisService.DetectSpikes(samples);
    }

    public bool HasActiveSignal
    {
        get
        {
            var latest = _repository.GetLatest();
            return latest != null && latest.IsCurrent(_signalTimeout);
        }
    }
}
