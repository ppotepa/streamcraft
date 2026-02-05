using Core.Bits;

namespace StreamCraft.Bits.Ai;

public sealed class AiBitState : IBitState
{
    public DateTime LastUpdatedUtc { get; set; } = DateTime.UtcNow;
    public string? ActiveModel { get; set; }
}
