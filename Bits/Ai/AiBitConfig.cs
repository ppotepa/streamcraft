using Core.Bits;

namespace StreamCraft.Bits.Ai;

public sealed class AiBitConfig : IConfigurationModel
{
    public string? ActiveModel { get; set; }
}
