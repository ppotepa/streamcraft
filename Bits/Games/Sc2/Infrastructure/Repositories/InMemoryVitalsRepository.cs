using Bits.Sc2.Domain.ValueObjects;

namespace Bits.Sc2.Infrastructure.Repositories;

/// <summary>
/// In-memory implementation of vitals repository.
/// Thread-safe storage for heart rate measurements with automatic cleanup.
/// </summary>
public class InMemoryVitalsRepository : IVitalsRepository
{
    private readonly List<HeartRateMeasurement> _samples = new();
    private readonly object _lock = new();
    private readonly int _maxSamples;

    public InMemoryVitalsRepository(int maxSamples = 200)
    {
        if (maxSamples < 1)
            throw new ArgumentException("Max samples must be at least 1.", nameof(maxSamples));

        _maxSamples = maxSamples;
    }

    public void AddSample(HeartRateMeasurement measurement)
    {
        lock (_lock)
        {
            _samples.Add(measurement);

            // Maintain max samples limit by removing oldest
            if (_samples.Count > _maxSamples)
            {
                _samples.RemoveAt(0);
            }
        }
    }

    public HeartRateMeasurement? GetLatest()
    {
        lock (_lock)
        {
            return _samples.Count > 0 ? _samples[^1] : null;
        }
    }

    public IReadOnlyList<HeartRateMeasurement> GetSamplesAfter(DateTime timestamp)
    {
        lock (_lock)
        {
            return _samples
                .Where(s => s.Timestamp > timestamp)
                .ToList()
                .AsReadOnly();
        }
    }

    public IReadOnlyList<HeartRateMeasurement> GetRecentSamples(TimeSpan duration)
    {
        var cutoff = DateTime.UtcNow - duration;
        return GetSamplesAfter(cutoff);
    }
}
