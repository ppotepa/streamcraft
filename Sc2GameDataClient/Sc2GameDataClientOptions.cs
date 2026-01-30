namespace Sc2GameDataClient;

public sealed class Sc2GameDataClientOptions
{
    public string Region { get; set; } = "us";
    public string Locale { get; set; } = "en_US";

    public int RegionId { get; set; } = 1;
    public int RealmId { get; set; } = 1;
    public int ProfileId { get; set; }
    public long? AccountId { get; set; }

    public string? DefaultBattleTag { get; set; }

    public string? ClientId { get; set; }
    public string? ClientSecret { get; set; }

    public bool UseChinaGateway { get; set; }

    public string ApiBaseUrl => UseChinaGateway
        ? "https://gateway.battlenet.com.cn"
        : $"https://{Region}.api.blizzard.com";

    public string AuthBaseUrl => UseChinaGateway
        ? "https://oauth.battlenet.com.cn"
        : "https://oauth.battle.net";
}
