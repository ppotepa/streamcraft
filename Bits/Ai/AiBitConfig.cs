using StreamCraft.Core.Bits;

namespace StreamCraft.Bits.Ai;

public sealed class AiBitConfig : IConfigurationModel
{
    public string? ProviderId { get; set; }
    public string? AccessToken { get; set; }
    public string? TargetModel { get; set; }
}



