using Bits.Sc2.Domain.ValueObjects;
using Core.Diagnostics;

namespace Bits.Sc2.Domain.Services;

/// <summary>
/// Domain service for analyzing heart rate data and calculating metrics.
/// </summary>
public class HeartRateAnalysisService
{
    /// <summary>
    /// Calculates the heart rate zone based on maximum heart rate.
    /// Zone 1: 50-60% (Recovery)
    /// Zone 2: 60-70% (Endurance)
    /// Zone 3: 70-80% (Tempo)
    /// Zone 4: 80-90% (Threshold)
    /// Zone 5: 90-100% (Maximum)
    /// </summary>
    public HeartRateZone CalculateZone(int currentBpm, int maxHeartRate)
    {
        if (currentBpm < 30 || currentBpm > 220)
            throw ExceptionFactory.Argument($"Invalid heart rate: {currentBpm}", nameof(currentBpm));

        if (maxHeartRate < 100 || maxHeartRate > 220)
            throw ExceptionFactory.Argument($"Invalid max heart rate: {maxHeartRate}", nameof(maxHeartRate));

        var percentage = (double)currentBpm / maxHeartRate * 100;

        return percentage switch
        {
            < 50 => HeartRateZone.Resting,
            < 60 => HeartRateZone.Zone1,
            < 70 => HeartRateZone.Zone2,
            < 80 => HeartRateZone.Zone3,
            < 90 => HeartRateZone.Zone4,
            _ => HeartRateZone.Zone5
        };
    }

    /// <summary>
    /// Calculates average heart rate from a collection of measurements.
    /// </summary>
    public double CalculateAverage(IEnumerable<HeartRateMeasurement> measurements)
    {
        var list = measurements.ToList();

        if (!list.Any())
            return 0;

        return list.Average(m => m.Bpm);
    }

    /// <summary>
    /// Calculates the trend (increasing, decreasing, stable) over recent measurements.
    /// </summary>
    public HeartRateTrend CalculateTrend(IReadOnlyList<HeartRateMeasurement> measurements, int windowSize = 10)
    {
        if (measurements.Count < 2)
            return HeartRateTrend.Stable;

        var recentMeasurements = measurements
            .OrderByDescending(m => m.Timestamp)
            .Take(Math.Min(windowSize, measurements.Count))
            .OrderBy(m => m.Timestamp)
            .ToList();

        if (recentMeasurements.Count < 2)
            return HeartRateTrend.Stable;

        // Calculate linear regression slope
        var n = recentMeasurements.Count;
        var sumX = 0.0;
        var sumY = 0.0;
        var sumXY = 0.0;
        var sumX2 = 0.0;

        for (int i = 0; i < n; i++)
        {
            var x = i;
            var y = recentMeasurements[i].Bpm;
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumX2 += x * x;
        }

        var slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

        // Classify trend based on slope
        return slope switch
        {
            > 0.5 => HeartRateTrend.RapidlyIncreasing,
            > 0.1 => HeartRateTrend.Increasing,
            < -0.5 => HeartRateTrend.RapidlyDecreasing,
            < -0.1 => HeartRateTrend.Decreasing,
            _ => HeartRateTrend.Stable
        };
    }

    /// <summary>
    /// Detects heart rate spikes (sudden increases).
    /// </summary>
    public IReadOnlyList<HeartRateSpike> DetectSpikes(
        IReadOnlyList<HeartRateMeasurement> measurements,
        int threshold = 15,
        TimeSpan window = default)
    {
        if (window == default)
            window = TimeSpan.FromSeconds(30);

        var spikes = new List<HeartRateSpike>();
        var orderedMeasurements = measurements.OrderBy(m => m.Timestamp).ToList();

        for (int i = 1; i < orderedMeasurements.Count; i++)
        {
            var current = orderedMeasurements[i];
            var previous = orderedMeasurements[i - 1];

            var timeDiff = current.Timestamp - previous.Timestamp;
            var bpmDiff = current.Bpm - previous.Bpm;

            if (timeDiff <= window && bpmDiff >= threshold)
            {
                spikes.Add(new HeartRateSpike(
                    Timestamp: current.Timestamp,
                    PreviousBpm: previous.Bpm,
                    CurrentBpm: current.Bpm,
                    Increase: bpmDiff,
                    Duration: timeDiff
                ));
            }
        }

        return spikes;
    }

    /// <summary>
    /// Calculates heart rate variability (HRV) - standard deviation of intervals.
    /// </summary>
    public double CalculateVariability(IReadOnlyList<HeartRateMeasurement> measurements)
    {
        if (measurements.Count < 2)
            return 0;

        var average = measurements.Average(m => m.Bpm);
        var sumOfSquares = measurements.Sum(m => Math.Pow(m.Bpm - average, 2));

        return Math.Sqrt(sumOfSquares / measurements.Count);
    }

    /// <summary>
    /// Estimates stress level based on heart rate, baseline, and variability.
    /// </summary>
    public StressLevel EstimateStressLevel(
        int currentBpm,
        int restingBpm,
        double variability)
    {
        var bpmDifference = currentBpm - restingBpm;
        var percentageIncrease = (double)bpmDifference / restingBpm * 100;

        // High variability can indicate stress
        var variabilityFactor = variability > 15 ? 1 : 0;

        return (percentageIncrease, variabilityFactor) switch
        {
            ( < 10, 0) => StressLevel.Low,
            ( < 20, _) => StressLevel.Moderate,
            ( < 35, _) => StressLevel.High,
            _ => StressLevel.VeryHigh
        };
    }

    /// <summary>
    /// Gets statistics for a collection of measurements.
    /// </summary>
    public HeartRateStatistics GetStatistics(IReadOnlyList<HeartRateMeasurement> measurements)
    {
        if (!measurements.Any())
        {
            return new HeartRateStatistics(
                Min: 0,
                Max: 0,
                Average: 0,
                Median: 0,
                StandardDeviation: 0,
                SampleCount: 0
            );
        }

        var bpmValues = measurements.Select(m => m.Bpm).OrderBy(b => b).ToList();

        var min = bpmValues.First();
        var max = bpmValues.Last();
        var average = bpmValues.Average();

        var median = bpmValues.Count % 2 == 0
            ? (bpmValues[bpmValues.Count / 2 - 1] + bpmValues[bpmValues.Count / 2]) / 2.0
            : bpmValues[bpmValues.Count / 2];

        var variance = bpmValues.Average(b => Math.Pow(b - average, 2));
        var stdDev = Math.Sqrt(variance);

        return new HeartRateStatistics(
            Min: min,
            Max: max,
            Average: average,
            Median: median,
            StandardDeviation: stdDev,
            SampleCount: measurements.Count
        );
    }
}

public enum HeartRateZone
{
    Resting = 0,     // < 50% max HR
    Zone1 = 1,       // 50-60% (Recovery)
    Zone2 = 2,       // 60-70% (Endurance)
    Zone3 = 3,       // 70-80% (Tempo)
    Zone4 = 4,       // 80-90% (Threshold)
    Zone5 = 5        // 90-100% (Maximum)
}

public enum HeartRateTrend
{
    RapidlyDecreasing = -2,
    Decreasing = -1,
    Stable = 0,
    Increasing = 1,
    RapidlyIncreasing = 2
}

public enum StressLevel
{
    Low = 0,
    Moderate = 1,
    High = 2,
    VeryHigh = 3
}

public record HeartRateSpike(
    DateTime Timestamp,
    int PreviousBpm,
    int CurrentBpm,
    int Increase,
    TimeSpan Duration
);

public record HeartRateStatistics(
    int Min,
    int Max,
    double Average,
    double Median,
    double StandardDeviation,
    int SampleCount
);
