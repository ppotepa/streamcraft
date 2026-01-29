using Bits.Sc2.Domain.ValueObjects;

namespace Bits.Sc2.Infrastructure.Repositories;

/// <summary>
/// Repository interface for storing and retrieving heart rate measurements.
/// </summary>
public interface IVitalsRepository
{
    /// <summary>
    /// Adds a new heart rate sample to the repository.
    /// </summary>
    void AddSample(HeartRateMeasurement measurement);

    /// <summary>
    /// Gets the most recent heart rate measurement.
    /// </summary>
    HeartRateMeasurement? GetLatest();

    /// <summary>
    /// Gets all samples recorded after the specified timestamp.
    /// </summary>
    IReadOnlyList<HeartRateMeasurement> GetSamplesAfter(DateTime timestamp);

    /// <summary>
    /// Gets all samples within the specified time window.
    /// </summary>
    IReadOnlyList<HeartRateMeasurement> GetRecentSamples(TimeSpan duration);
}
