using System.Text.Json;

namespace StreamCraft.Bits.Ai;

public sealed record AiProviderConfig(
    string ProviderId,
    string? AccessToken,
    string? TargetModel,
    JsonElement? Metadata = null);




