using Bits.Sc2.Messages;
using Core.Panels;

namespace Bits.Sc2.Panels;

public class MetricPanelState
{
    public int? HeartRate { get; set; }
    public DateTime? HeartRateTimestamp { get; set; }
    public string Units { get; set; } = "bpm";
}

public class MetricPanel : Panel<MetricPanelState>
{

    public override string Type => "biometric";

    protected override void RegisterHandlers()
    {
        MessageBus.Subscribe<MetricData>(Sc2MessageType.MetricDataReceived, OnMetricDataReceived);
    }

    private void OnMetricDataReceived(MetricData data)
    {
        lock (StateLock)
        {
            State.HeartRate = data.Value;
            State.HeartRateTimestamp = data.Timestamp;
            UpdateLastModified();
        }
    }

    public override object GetStateSnapshot()
    {
        lock (StateLock)
        {
            return new
            {
                value = State.HeartRate,
                timestampUtc = State.HeartRateTimestamp?.ToString("O"),
                units = State.Units
            };
        }
    }
}
