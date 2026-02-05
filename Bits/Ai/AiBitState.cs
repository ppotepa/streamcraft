using Core.Bits;

namespace StreamCraft.Bits.Ai;

public sealed class AiBitState : IBitState
{
    public DateTime LastUpdatedUtc { get; set; } = DateTime.UtcNow;
    public string? ProviderId { get; set; }
    public string? TargetModel { get; set; }
}
