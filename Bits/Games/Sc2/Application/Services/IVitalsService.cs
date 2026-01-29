using Bits.Sc2.Domain.Services;
using Bits.Sc2.Domain.ValueObjects;

namespace Bits.Sc2.Application.Services;

/// <summary>
/// Service interface for managing heart rate vitals data with analysis capabilities.
/// </summary>
public interface IVitalsService
{
    /// <summary>
    /// Records a new heart rate sample.
    /// </summary>
    void AddHeartRateSample(int bpm, DateTime? timestamp = null);

    /// <summary>
    /// Gets the most recent heart rate measurement.
    /// Returns null if no measurements exist or if the latest is too old.
    /// </summary>
    HeartRateMeasurement? GetLatestHeartRate();

    /// <summary>
    /// Gets recent heart rate samples within the specified duration.
    /// </summary>
    IReadOnlyList<HeartRateMeasurement> GetRecentSamples(TimeSpan duration);

    /// <summary>
    /// Gets statistical analysis of heart rate data.
    /// </summary>
    HeartRateStatistics GetStatistics(TimeSpan? duration = null);

    /// <summary>
    /// Calculates the current heart rate trend.
    /// </summary>
    HeartRateTrend GetTrend(int windowSize = 10);

    /// <summary>
    /// Detects heart rate spikes in recent data.
    /// </summary>
    IReadOnlyList<HeartRateSpike> DetectRecentSpikes(TimeSpan? duration = null);

    /// <summary>
    /// Checks if there is an active heart rate signal (recent measurement).
    /// </summary>
    bool HasActiveSignal { get; }
}
