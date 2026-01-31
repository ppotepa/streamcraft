namespace Bits.Sc2.Application.Services;

public sealed class Sc2RuntimeConfig : ISc2RuntimeConfig
{
    private readonly object _lock = new();
    private int _pollIntervalMs = 250;
    private string? _battleTag;
    private string _apiProvider = Sc2ApiProviders.Sc2Pulse;
    private string _region = "us";

    public int PollIntervalMs
    {
        get { lock (_lock) return _pollIntervalMs; }
    }

    public string? BattleTag
    {
        get { lock (_lock) return _battleTag; }
    }

    public string ApiProvider
    {
        get { lock (_lock) return _apiProvider; }
    }

    public string Region
    {
        get { lock (_lock) return _region; }
    }

    public void Update(Sc2BitConfig config)
    {
        if (config == null) return;

        lock (_lock)
        {
            _pollIntervalMs = Math.Max(50, config.PollIntervalMs);
            _battleTag = config.GetEffectiveBattleTag();
            _apiProvider = string.IsNullOrWhiteSpace(config.ApiProvider)
                ? Sc2ApiProviders.Sc2Pulse
                : config.ApiProvider.Trim().ToLowerInvariant();
            _region = string.IsNullOrWhiteSpace(config.Region)
                ? "us"
                : config.Region.Trim().ToLowerInvariant();
        }
    }
}
