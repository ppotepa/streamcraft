namespace Infrastructure;

/// <summary>
/// Singleton service that stores heart rate samples from external devices.
/// </summary>
public class VitalsService
{
    private static readonly Lazy<VitalsService> _instance = new(() => new VitalsService());
    public static VitalsService Instance => _instance.Value;

    private readonly List<(DateTime timestamp, int bpm)> _hrSamples = new();
    private readonly object _lock = new();

    private VitalsService() { }

    public void AddHeartRateSample(int bpm, DateTime timestamp)
    {
        lock (_lock)
        {
            _hrSamples.Add((timestamp, bpm));

            // Keep only last 200 readings
            if (_hrSamples.Count > 200)
            {
                _hrSamples.RemoveRange(0, _hrSamples.Count - 200);
            }
        }
    }

    public (DateTime timestamp, int bpm, bool hasSignal) GetLatestHeartRate()
    {
        lock (_lock)
        {
            if (_hrSamples.Count == 0)
            {
                return (default, 0, false);
            }

            var lastReading = _hrSamples[^1];
            var ageSeconds = (DateTime.UtcNow - lastReading.timestamp).TotalSeconds;
            var hasSignal = ageSeconds <= 10; // Signal valid for 10 seconds

            return (lastReading.timestamp, lastReading.bpm, hasSignal);
        }
    }

    public List<(DateTime timestamp, int bpm)> GetAllSamples()
    {
        lock (_lock)
        {
            return _hrSamples.ToList();
        }
    }
}
