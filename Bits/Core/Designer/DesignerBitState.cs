using StreamCraft.Core.Bits;

namespace StreamCraft.Bits.Designer;

public sealed class DesignerBitState : IBitState
{
    public int ApiSourceCount { get; set; }
    public DateTime TimestampUtc { get; set; }
}
