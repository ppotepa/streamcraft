using StreamCraft.Core.Bits;

namespace StreamCraft.Bits.Ai;

public sealed class AiBitConfig : IConfigurationModel
{
    public string? ProviderId { get; set; }
    public string? AccessToken { get; set; }
    public string? TargetModel { get; set; }
    public bool UseFreeTier { get; set; }
    public string? FreeTierChatRequirementsToken { get; set; }
    public string? FreeTierProofToken { get; set; }
    public string? FreeTierTurnstileToken { get; set; }
    public string? FreeTierConduitToken { get; set; }
}



