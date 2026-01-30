using Bits.Sc2.Application.Services;
using Bits.Sc2.Domain.ValueObjects;
using Bits.Sc2.Messages;
using Core.Messaging;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Sc2Pulse;
using Sc2Pulse.Queries;
using Sc2Queue = Sc2Pulse.Models.Queue;

namespace Bits.Sc2.Application.BackgroundServices;

public sealed class PlayerDataBackgroundService : BackgroundService
{
    private readonly IMessageBus _messageBus;
    private readonly IPlayerProfileService _profileService;
    private readonly ISc2PulseClient _pulseClient;
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
        ISc2PulseClient pulseClient,
        ISc2RuntimeConfig runtimeConfig,
        ILogger<PlayerDataBackgroundService> logger)
    {
        _messageBus = messageBus;
        _profileService = profileService;
        _pulseClient = pulseClient;
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
            await PopulateMmrHistoryAsync(playerData, profile.CharacterId.Value, cancellationToken);
        }

        return playerData;
    }

    private async Task PopulateMmrHistoryAsync(PlayerData playerData, long characterId, CancellationToken cancellationToken)
    {
        try
        {
            if (!string.Equals(_runtimeConfig.ApiProvider, Sc2ApiProviders.Sc2Pulse, StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            var teamQuery = new CharacterTeamsQuery
            {
                CharacterId = new List<long> { characterId },
                Queue = new List<Sc2Queue> { Sc2Queue.LOTV_1V1 },
                Limit = 1
            };

            var teams = await _pulseClient.GetCharacterTeamsAsync(teamQuery, cancellationToken);
            var currentTeam = teams?.FirstOrDefault();
            var teamLegacyUid = currentTeam?.TeamLegacyUid;

            if (string.IsNullOrEmpty(teamLegacyUid))
            {
                return;
            }

            var parts = teamLegacyUid.Split('.');
            if (parts.Length != 3)
            {
                return;
            }

            var baseUid = $"{parts[0]}.{parts[1]}";

            var historyQuery = new TeamHistoriesQuery
            {
                TeamLegacyUids = new List<string>
                {
                    $"{baseUid}.1",
                    $"{baseUid}.2",
                    $"{baseUid}.3",
                },
                GroupBy = "LEGACY_UID",
                Static = new List<string> { "LEGACY_ID" },
                History = new List<string> { "TIMESTAMP", "RATING" }
            };

            var histories = await _pulseClient.GetTeamHistoriesAsync(historyQuery, cancellationToken);

            if (histories == null || histories.Count == 0)
            {
                return;
            }

            var currentRaceId = parts[2];
            var accountId = parts[1];
            var targetSuffix = $"{accountId}.{currentRaceId}";

            var matchingHistory = histories.FirstOrDefault(h =>
                h.StaticData?.LegacyId?.EndsWith($".{targetSuffix}") == true ||
                h.StaticData?.LegacyId == targetSuffix);

            if (matchingHistory?.History == null)
            {
                return;
            }

            var timestamps = matchingHistory.History.Timestamp;
            var ratings = matchingHistory.History.Rating;
            var cutoffTimestamp = DateTimeOffset.UtcNow.AddDays(-60).ToUnixTimeSeconds();

            for (int i = 0; i < Math.Min(timestamps.Count, ratings.Count); i++)
            {
                if (timestamps[i] >= cutoffTimestamp)
                {
                    playerData.MmrHistory.Add(new Messages.MmrHistoryPoint
                    {
                        Timestamp = timestamps[i],
                        Rating = ratings[i]
                    });
                }
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogDebug(ex, "Error fetching MMR history for character ID: {CharacterId}", characterId);
        }
    }
}
