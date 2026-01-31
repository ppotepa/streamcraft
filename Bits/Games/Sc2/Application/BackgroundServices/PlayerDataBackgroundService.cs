using Bits.Sc2.Application.Services;
using Bits.Sc2.Domain.ValueObjects;
using Bits.Sc2.Messages;
using Core.Messaging;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Bits.Sc2.Application.BackgroundServices;

public sealed class PlayerDataBackgroundService : BackgroundService
{
    private readonly IMessageBus _messageBus;
    private readonly IPlayerProfileService _profileService;
    private readonly ISc2PulseApiService _apiService;
    private readonly ISc2RuntimeConfig _runtimeConfig;
    private readonly ILogger<PlayerDataBackgroundService> _logger;
    private readonly SemaphoreSlim _fetchLock = new(1, 1);
    private readonly TimeSpan _refreshInterval = TimeSpan.FromMinutes(5);
    private string? _lastQueriedBattleTag;
    private DateTime _lastFetchTime = DateTime.MinValue;
    private Guid _subscriptionId;
    private CancellationToken _stoppingToken;

    public PlayerDataBackgroundService(
        IMessageBus messageBus,
        IPlayerProfileService profileService,
        ISc2PulseApiService apiService,
        ISc2RuntimeConfig runtimeConfig,
        ILogger<PlayerDataBackgroundService> logger)
    {
        _messageBus = messageBus;
        _profileService = profileService;
        _apiService = apiService;
        _runtimeConfig = runtimeConfig;
        _logger = logger;

        _subscriptionId = _messageBus.Subscribe<LobbyParsedData>(Sc2MessageType.LobbyFileParsed, OnLobbyParsed);
    }

    public override Task StopAsync(CancellationToken cancellationToken)
    {
        _messageBus.Unsubscribe(_subscriptionId);
        return base.StopAsync(cancellationToken);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _stoppingToken = stoppingToken;

        var configuredBattleTag = _runtimeConfig.BattleTag;
        if (!string.IsNullOrWhiteSpace(configuredBattleTag))
        {
            await FetchPlayerDataAsync(configuredBattleTag, stoppingToken);
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(_refreshInterval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }

            var battleTag = _lastQueriedBattleTag ?? _runtimeConfig.BattleTag;
            if (!string.IsNullOrWhiteSpace(battleTag))
            {
                await FetchPlayerDataAsync(battleTag, stoppingToken);
            }
        }
    }

    private void OnLobbyParsed(LobbyParsedData data)
    {
        if (_stoppingToken.IsCancellationRequested)
            return;

        var battleTag = data.UserBattleTag ?? _runtimeConfig.BattleTag;

        if (string.IsNullOrWhiteSpace(battleTag))
            return;

        if ((DateTime.UtcNow - _lastFetchTime) < TimeSpan.FromMinutes(1))
            return;

        if (_lastQueriedBattleTag == battleTag && (DateTime.UtcNow - _lastFetchTime) < _refreshInterval)
            return;

        _ = Task.Run(() => FetchPlayerDataAsync(battleTag, _stoppingToken), _stoppingToken);
    }

    private async Task FetchPlayerDataAsync(string battleTagString, CancellationToken cancellationToken)
    {
        if (!await _fetchLock.WaitAsync(0, cancellationToken))
        {
            return;
        }

        try
        {
            _lastFetchTime = DateTime.UtcNow;
            _lastQueriedBattleTag = battleTagString;

            var battleTag = BattleTag.TryParse(battleTagString);
            if (battleTag == null)
            {
                _logger.LogWarning("Invalid BattleTag format: {BattleTag}", battleTagString);
                return;
            }

            var profile = await _profileService.RefreshProfileAsync(battleTag);

            if (profile == null)
            {
                _logger.LogWarning("No profile data found for: {BattleTag}", battleTag);
                return;
            }

            var playerData = await ConvertToLegacyPlayerDataAsync(profile, cancellationToken);

            var message = new PlayerDataMessage(playerData);
            _messageBus.Publish(message.Type, message.Payload);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Error fetching player data for {BattleTag}", battleTagString);
            _lastQueriedBattleTag = null;
        }
        finally
        {
            _fetchLock.Release();
        }
    }

    private async Task<PlayerData> ConvertToLegacyPlayerDataAsync(Domain.Entities.PlayerProfile profile, CancellationToken cancellationToken)
    {
        var playerData = new PlayerData
        {
            BattleTag = profile.BattleTag.ToString(),
            Name = profile.DisplayName,
            CharacterId = profile.CharacterId,

            MMR = profile.CurrentMmr?.Rating,
            PeakMMR = profile.PeakMmr?.Rating,
            Rank = null,
            Race = profile.PrimaryRace?.ToString() ?? "Unknown",
            League = profile.CurrentMmr?.GetFormattedLeague() ?? "Unranked",
            LeagueType = (int?)profile.CurrentMmr?.League,
            GlobalRank = profile.GlobalRank,
            RegionRank = profile.RegionRank,

            Wins = profile.Wins,
            Losses = profile.Losses,
            TotalGamesPlayed = profile.TotalGamesPlayed,
            CurrentSeasonGames = profile.CurrentSeasonGames,
            WinRate = profile.WinRate,

            IsProPlayer = profile.IsProPlayer,
            ProNickname = profile.ProNickname,
            ProTeam = profile.ProTeam,

            ClanTag = profile.ClanTag,
            ClanName = profile.ClanName,

            RecentMatches = new List<DetailedMatchRecord>(),
            LastPlayedUtc = profile.LastPlayedUtc,
            MmrHistory = new List<Messages.MmrHistoryPoint>(),

            FavoriteMap = null,
            FavoriteMapWinRate = null,
            StreakCount = 0,
            CurrentStreak = null,

            GamesLast24h = 0,
            WinsLast24h = 0,
            RatingChange24h = null,

            WinRateVsZerg = null,
            WinRateVsProtoss = null,
            WinRateVsTerran = null
        };

        if (profile.CharacterId.HasValue)
        {
            await PopulateMmrHistoryAsync(playerData, profile, cancellationToken);
        }

        return playerData;
    }

    private async Task PopulateMmrHistoryAsync(PlayerData playerData, Domain.Entities.PlayerProfile profile, CancellationToken cancellationToken)
    {
        try
        {
            if (!profile.CharacterId.HasValue)
            {
                return;
            }

            var race = profile.PrimaryRace ?? Race.TryParse(playerData.Race) ?? Race.Terran;
            var history = await _apiService.FetchMmrHistoryAsync(profile.CharacterId.Value, race, cancellationToken);

            if (history == null || history.Count == 0)
            {
                return;
            }

            var cutoffDate = DateTimeOffset.UtcNow.AddDays(-60);
            foreach (var point in history)
            {
                if (point.Timestamp >= cutoffDate.UtcDateTime)
                {
                    playerData.MmrHistory.Add(new Messages.MmrHistoryPoint
                    {
                        Timestamp = new DateTimeOffset(point.Timestamp).ToUnixTimeSeconds(),
                        Rating = point.Mmr.Rating
                    });
                }
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogDebug(ex, "Error fetching MMR history for character ID: {CharacterId}", profile.CharacterId);
        }
    }
}
