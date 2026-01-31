using Core.Diagnostics;

namespace Bits.Sc2.Domain.ValueObjects;

/// <summary>
/// Value object representing a single heart rate measurement.
/// Immutable and contains validation logic.
/// </summary>
public record HeartRateMeasurement
{
    public int Bpm { get; }
    public DateTime Timestamp { get; }

    public HeartRateMeasurement(int bpm, DateTime timestamp)
    {
        if (bpm < 30 || bpm > 220)
            throw ExceptionFactory.Argument($"Invalid heart rate: {bpm}. Must be between 30-220 bpm.", nameof(bpm));

        Bpm = bpm;
        Timestamp = timestamp;
    }

    /// <summary>
    /// Checks if this measurement is older than the specified max age.
    /// </summary>
    public bool IsExpired(TimeSpan maxAge) => DateTime.UtcNow - Timestamp > maxAge;

    /// <summary>
    /// Checks if this measurement is still considered fresh/current.
    /// </summary>
    public bool IsCurrent(TimeSpan maxAge) => !IsExpired(maxAge);
}
