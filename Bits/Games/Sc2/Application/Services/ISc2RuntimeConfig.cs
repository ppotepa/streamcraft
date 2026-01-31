namespace Bits.Sc2.Application.Services;

public interface ISc2RuntimeConfig
{
    int PollIntervalMs { get; }
    string? BattleTag { get; }
    string ApiProvider { get; }
    string Region { get; }
    void Update(Sc2BitConfig config);
}
