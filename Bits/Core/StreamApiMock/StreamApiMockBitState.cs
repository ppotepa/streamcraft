using StreamCraft.Core.Bits;

namespace StreamCraft.Bits.StreamApiMock;

public sealed class StreamApiMockBitState : IBitState
{
    public long TotalEvents { get; set; }
    public DateTime? LastEventUtc { get; set; }
    public string? LastScenarioId { get; set; }
    public string? LastMessageType { get; set; }
}
