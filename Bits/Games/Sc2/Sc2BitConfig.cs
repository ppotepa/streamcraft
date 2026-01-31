using Bits.Sc2.Application.Services;
using Core.Bits;

namespace Bits.Sc2;

public class Sc2BitConfig : IConfigurationModel
{
    public string? BattleTag { get; set; }
    public int PollIntervalMs { get; set; } = 250;
    public string ApiProvider { get; set; } = Sc2ApiProviders.Sc2Pulse;
    public string Region { get; set; } = "us";

    public string? GetEffectiveBattleTag()
    {
        return string.IsNullOrWhiteSpace(BattleTag) ? null : BattleTag;
    }
}
