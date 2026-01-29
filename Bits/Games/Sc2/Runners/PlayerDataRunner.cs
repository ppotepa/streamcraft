using Bits.Sc2.Application.Services;
using Bits.Sc2.Domain.ValueObjects;
using Bits.Sc2.Messages;
using Core.Messaging;
using Microsoft.Extensions.Logging;

namespace Bits.Sc2.Runners;

/// <summary>
/// Background service that fetches current player's data from SC2 Pulse API.
/// Triggers when user battle tag is detected in lobby or periodically.
/// </summary>
public class PlayerDataRunner : IDisposable
{
    private readonly IMessageBus _messageBus;
    private readonly IPlayerProfileService _profileService;
    private readonly ILogger<PlayerDataRunner> _logger;
    private readonly string? _configuredBattleTag;
    private string? _lastQueriedBattleTag;
    private CancellationTokenSource? _cts;
    private Task? _backgroundTask;
    private DateTime _lastFetchTime = DateTime.MinValue;
    private readonly TimeSpan _refreshInterval = TimeSpan.FromMinutes(5);

    public PlayerDataRunner(
        IMessageBus messageBus,
        IPlayerProfileService profileService,
        ILogger<PlayerDataRunner> logger,
        string? configuredBattleTag)
    {
        _messageBus = messageBus;
        _profileService = profileService;
        _logger = logger;
        _configuredBattleTag = string.IsNullOrWhiteSpace(configuredBattleTag) ? null : configuredBattleTag.Trim();

        // Subscribe to lobby parsed events
        _messageBus.Subscribe<LobbyParsedData>(Sc2MessageType.LobbyFileParsed, OnLobbyParsed);
    }

    public void Start()
    {
        if (_backgroundTask != null) return;

        _cts = new CancellationTokenSource();
        _backgroundTask = Task.Run(async () =>
        {
            // Fetch immediately on start if configured
            if (!string.IsNullOrWhiteSpace(_configuredBattleTag))
            {
                await FetchPlayerDataAsync(_configuredBattleTag);
            }

            // Then periodically refresh
            while (!_cts.Token.IsCancellationRequested)
            {
                try
                {
                    await Task.Delay(_refreshInterval, _cts.Token);

                    var battleTag = _lastQueriedBattleTag ?? _configuredBattleTag;
                    if (!string.IsNullOrWhiteSpace(battleTag))
                    {
                        await FetchPlayerDataAsync(battleTag);
                    }
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in PlayerDataRunner background loop");
                }
            }
        }, _cts.Token);
    }

    public void Stop()
    {
        _cts?.Cancel();
        _backgroundTask?.Wait(TimeSpan.FromSeconds(5));
        _backgroundTask = null;
    }

    private async void OnLobbyParsed(LobbyParsedData data)
    {
        var battleTag = data.UserBattleTag ?? _configuredBattleTag;

        if (string.IsNullOrWhiteSpace(battleTag))
            return;

        // Don't query too frequently
        if ((DateTime.UtcNow - _lastFetchTime) < TimeSpan.FromMinutes(1))
            return;

        // Don't query again if we already have data for this player
        if (_lastQueriedBattleTag == battleTag && (DateTime.UtcNow - _lastFetchTime) < _refreshInterval)
            return;

        try
        {
            await FetchPlayerDataAsync(battleTag);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch player data on lobby parsed for {BattleTag}", battleTag);
        }
    }

    private async Task FetchPlayerDataAsync(string battleTagString)
    {
        _logger.LogInformation("Starting data fetch for user: {BattleTag}", battleTagString);

        try
        {
            _lastFetchTime = DateTime.UtcNow;
            _lastQueriedBattleTag = battleTagString;

            // Parse BattleTag
            var battleTag = BattleTag.TryParse(battleTagString);
            if (battleTag == null)
            {
                _logger.LogWarning("Invalid BattleTag format: {BattleTag}", battleTagString);
                return;
            }

            // Use PlayerProfileService to refresh the profile (which uses ISc2PulseApiService internally)
            var profile = await _profileService.RefreshProfileAsync(battleTag);

            if (profile == null)
            {
                _logger.LogWarning("No profile data found for: {BattleTag}", battleTag);
                return;
            }

            // Convert domain entity to legacy PlayerData message format
            var playerData = ConvertToLegacyPlayerData(profile);

            _logger.LogInformation("Publishing data for {BattleTag}: MMR={Mmr}, Wins={Wins}, Losses={Losses}",
                battleTag, playerData.MMR, playerData.Wins, playerData.Losses);

            // Publish player data
            var message = new PlayerDataMessage(playerData);
            _messageBus.Publish(message.Type, message.Payload);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching player data for {BattleTag}", battleTagString);
            _lastQueriedBattleTag = null; // Reset so we can retry
        }
    }

    /// <summary>
    /// Converts the new PlayerProfile domain entity to the legacy PlayerData message format.
    /// This maintains backward compatibility with existing UI and message consumers.
    /// TODO: Update UI to work with domain entities directly, then remove this conversion.
    /// </summary>
    private PlayerData ConvertToLegacyPlayerData(Domain.Entities.PlayerProfile profile)
    {
        // Calculate statistics
        var totalGames = (profile.Wins ?? 0) + (profile.Losses ?? 0);

        return new PlayerData
        {
            BattleTag = profile.BattleTag.ToString(),
            Name = profile.DisplayName,
            CharacterId = profile.CharacterId,

            MMR = profile.CurrentMmr?.Rating,
            PeakMMR = profile.PeakMmr?.Rating,
            Rank = null, // TODO: Add rank to PlayerProfile
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

            RecentMatches = new List<DetailedMatchRecord>(), // TODO: Fetch from match history repository
            LastPlayedUtc = profile.LastPlayedUtc,
            MmrHistory = new List<Messages.MmrHistoryPoint>(), // TODO: Fetch from MMR history

            FavoriteMap = null, // TODO: Calculate from match history
            FavoriteMapWinRate = null,
            StreakCount = 0, // TODO: Calculate from match history
            CurrentStreak = null,

            GamesLast24h = 0, // TODO: Calculate from match history
            WinsLast24h = 0,
            RatingChange24h = null,

            WinRateVsZerg = null, // TODO: Calculate from match history
            WinRateVsProtoss = null,
            WinRateVsTerran = null
        };
    }

    public void Dispose()
    {
        Stop();
        _cts?.Dispose();
    }
}
