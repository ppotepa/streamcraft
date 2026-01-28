using Core.Bits;

namespace Bits.Sc2;

public class Sc2BitState : IBitState
{
    public int? HeartRate { get; set; }
    public DateTime? HeartRateTimestamp { get; set; }
    public bool HeartRateHasSignal { get; set; }
}
