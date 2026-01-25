using StreamCraft.Core.Bits;

namespace StreamCraft.Bits.Sc2;

public class Sc2BitConfig : IConfigurationModel
{
    public string UserBattleTag { get; set; } = "";
    public string LobbyFilePath { get; set; } = "";
    public int PollIntervalMs { get; set; } = 250;
}
