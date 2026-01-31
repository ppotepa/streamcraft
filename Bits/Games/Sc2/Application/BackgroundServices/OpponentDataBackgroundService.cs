using Bits.Sc2.Application.Services;
using Bits.Sc2.Messages;
using Core.Diagnostics;
using Core.Messaging;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Sc2Pulse;
using Sc2Pulse.Models;
using Sc2Pulse.Queries;
using Sc2Queue = Sc2Pulse.Models.Queue;

namespace Bits.Sc2.Application.BackgroundServices;

public sealed class OpponentDataBackgroundService : BackgroundService
{
    private readonly IMessageBus _messageBus;
    private readonly ISc2PulseClient _pulseClient;
    private readonly ISc2RuntimeConfig _runtimeConfig;
    private readonly ILogger<OpponentDataBackgroundService> _logger;
    private string? _lastQueriedBattleTag;
    private Guid _subscriptionId;
    private CancellationToken _stoppingToken;
    private bool _providerLogged;

    public OpponentDataBackgroundService(
        IMessageBus messageBus,
        ISc2PulseClient pulseClient,
        ISc2RuntimeConfig runtimeConfig,
        ILogger<OpponentDataBackgroundService> logger)
    {
        _messageBus = messageBus;
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
        await Task.Delay(Timeout.Infinite, stoppingToken);
    }

    private void OnLobbyParsed(LobbyParsedData data)
    {
        if (_stoppingToken.IsCancellationRequested)
            return;

        if (!string.Equals(_runtimeConfig.ApiProvider, Sc2ApiProviders.Sc2Pulse, StringComparison.OrdinalIgnoreCase))
        {
            if (!_providerLogged)
            {
                _logger.LogInformation("Opponent data fetch skipped: API provider is {Provider}", _runtimeConfig.ApiProvider);
                _providerLogged = true;
            }
            return;
        }

        if (string.IsNullOrWhiteSpace(data.OpponentBattleTag))
            return;

        if (_lastQueriedBattleTag == data.OpponentBattleTag)
            return;

        _ = Task.Run(async () =>
        {
            try
            {
                _lastQueriedBattleTag = data.OpponentBattleTag;

                var opponentData = await FetchOpponentDataAsync(data.OpponentBattleTag, _stoppingToken);

                if (opponentData != null)
                {
                    var message = new OpponentDataMessage(opponentData);
                    _messageBus.Publish(message.Type, message.Payload);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to fetch opponent data for {BattleTag}", data.OpponentBattleTag);
                _lastQueriedBattleTag = null;
            }
        }, _stoppingToken);
    }

    private async Task<OpponentData?> FetchOpponentDataAsync(string battleTag, CancellationToken cancellationToken)
    {
        try
        {
            var query = new CharacterFindQuery { Query = battleTag };
            var characters = await _pulseClient.FindCharactersAsync(query, cancellationToken);

            if (characters == null || characters.Count == 0)
                return null;

            var character = SelectBestMatch(characters, battleTag);
            var characterId = character.Members?.Character?.Id;

            if (!characterId.HasValue)
                return null;

            var detailedCharacters = await _pulseClient.GetCharacterByIdAsync(characterId.Value, cancellationToken);
            if (detailedCharacters == null || detailedCharacters.Count == 0)
            {
                return await ExtractOpponentDataFromCharacter(character, characterId.Value, battleTag, cancellationToken);
            }

            return await ExtractOpponentDataFromCharacter(detailedCharacters[0], characterId.Value, battleTag, cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Error fetching opponent data for {BattleTag}", battleTag);
            return null;
        }
    }

    private async Task<OpponentData> ExtractOpponentDataFromCharacter(
        LadderDistinctCharacter character,
        long characterId,
        string battleTag,
        CancellationToken cancellationToken)
    {
        var currentStats = character.CurrentStats;
        var members = character.Members;
        var playerCharacter = members?.Character;
        var account = members?.Account;
        var clan = members?.Clan;

        LadderTeam? currentTeam = null;
        try
        {
            var teamQuery = new CharacterTeamsQuery
            {
                CharacterId = new List<long> { characterId },
                Queue = new List<Sc2Queue> { Sc2Queue.LOTV_1V1 },
                Limit = 1
            };
            var teams = await _pulseClient.GetCharacterTeamsAsync(teamQuery, cancellationToken);
            currentTeam = teams?.FirstOrDefault();
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Error fetching team data for {BattleTag}", battleTag);
        }

        int currentSeasonGames = currentStats?.GamesPlayed ?? 0;
        double? winRate = null;
        int? wins = currentTeam?.Wins;
        int? losses = currentTeam?.Losses;

        if (wins.HasValue && losses.HasValue)
        {
            var totalGames = wins.Value + losses.Value;
            winRate = totalGames > 0 ? wins.Value * 100.0 / totalGames : null;
            currentSeasonGames = totalGames;
        }
        else if (currentStats?.Rating.HasValue == true && currentSeasonGames > 0)
        {
            var estimatedWinRate = Math.Min(95, Math.Max(35, 50 + (currentStats.Rating.Value - 3000) / 100.0));
            winRate = estimatedWinRate;
            wins = (int)(currentSeasonGames * (estimatedWinRate / 100.0));
            losses = currentSeasonGames - wins;
        }

        var opponentData = new OpponentData
        {
            BattleTag = account?.BattleTag ?? battleTag,
            Name = playerCharacter?.Name,
            CharacterId = characterId,
            MMR = currentStats?.Rating ?? character.RatingMax,
            PeakMMR = character.RatingMax,
            Rank = currentTeam?.LeagueRank?.ToString(),
            Race = GetPrimaryRace(members?.RaceGames),
            League = GetLeagueString(character.LeagueMax),
            LeagueType = (int?)character.LeagueMax,
            GlobalRank = currentTeam?.GlobalRank,
            RegionRank = currentTeam?.RegionRank,
            Wins = wins,
            Losses = losses,
            TotalGamesPlayed = character.TotalGamesPlayed,
            CurrentSeasonGames = currentSeasonGames,
            WinRate = winRate,
            IsProPlayer = members?.ProId.HasValue == true,
            ProNickname = members?.ProNickname,
            ProTeam = members?.ProPlayer?.ProTeam?.ShortName ?? members?.ProTeam,
            ClanTag = clan?.Tag,
            ClanName = clan?.Name,
            RecentMatches = new List<DetailedMatchRecord>(),
            LastPlayedUtc = null
        };

        string? teamLegacyUid = currentTeam?.TeamLegacyUid;
        if (string.IsNullOrEmpty(teamLegacyUid) && playerCharacter?.BattleNetId != null)
        {
            var regionCode = GetRegionCode(playerCharacter.Region);
            var battlenetId = playerCharacter.BattleNetId;
            var raceId = GetRaceId(opponentData.Race);
            teamLegacyUid = $"{regionCode}-0-2-1.{battlenetId}.{raceId}";
        }

        await PopulateMmrHistoryAsync(opponentData, teamLegacyUid, cancellationToken);
        await PopulateMatchHistoryAsync(opponentData, characterId, cancellationToken);

        return opponentData;
    }

    private async Task PopulateMatchHistoryAsync(OpponentData opponentData, long characterId, CancellationToken cancellationToken)
    {
        try
        {
            var matchesQuery = new CharacterMatchesQuery
            {
                CharacterId = new List<long> { characterId },
                Type = new List<MatchKind> { MatchKind._1V1 },
                Limit = 30
            };

            var matchesResult = await _pulseClient.GetCharacterMatchesAsync(matchesQuery, cancellationToken);

            if (matchesResult?.Result == null)
                return;

            var matches = new List<DetailedMatchRecord>();
            var mapWins = new Dictionary<string, int>();
            var mapGames = new Dictionary<string, int>();
            var sortedMatches = matchesResult.Result.OrderByDescending(m => m.Match?.Date ?? DateTime.MinValue).ToList();

            int? currentRating = null;
            int? rating24hAgo = null;
            var cutoff24h = DateTime.UtcNow.AddDays(-1);

            foreach (var match in sortedMatches.Take(15))
            {
                var ourParticipant = match.Participants?
                    .FirstOrDefault(p => p.Participant?.PlayerCharacterId == characterId);

                if (ourParticipant?.Participant == null || match.Match == null)
                    continue;

                var opponentParticipant = match.Participants?
                    .FirstOrDefault(p => p.Participant?.PlayerCharacterId != characterId);

                var won = ourParticipant.Participant.Decision?.Equals("WIN", StringComparison.OrdinalIgnoreCase) == true;
                var mapName = match.Map?.Name ?? "Unknown";
                var matchDate = match.Match?.Date ?? DateTime.UtcNow;
                var ourRating = ourParticipant.TeamState?.TeamState?.Rating;

                if (currentRating == null && ourRating.HasValue)
                    currentRating = ourRating.Value;

                if (matchDate < cutoff24h && rating24hAgo == null && ourRating.HasValue)
                    rating24hAgo = ourRating.Value;

                if (ourParticipant.TeamState?.TeamState?.GlobalRank.HasValue == true &&
                    (!opponentData.GlobalRank.HasValue || matchDate > (opponentData.LastPlayedUtc ?? DateTime.MinValue)))
                {
                    opponentData.GlobalRank = ourParticipant.TeamState.TeamState.GlobalRank;
                    opponentData.RegionRank = ourParticipant.TeamState.TeamState.RegionRank;
                }

                if (!mapGames.ContainsKey(mapName))
                {
                    mapGames[mapName] = 0;
                    mapWins[mapName] = 0;
                }
                mapGames[mapName]++;
                if (won) mapWins[mapName]++;

                var opponentFullName = opponentParticipant?.Team?.Members?.FirstOrDefault()?.Character?.Name;
                var opponentDisplayName = StripBattleTag(opponentFullName);

                matches.Add(new DetailedMatchRecord
                {
                    DateUtc = matchDate,
                    MapName = mapName,
                    OpponentName = opponentDisplayName,
                    OpponentRace = GetRaceFromRaceGames(opponentParticipant?.Team?.Members?.FirstOrDefault()?.RaceGames),
                    OpponentRating = opponentParticipant?.TeamState?.TeamState?.Rating,
                    Won = won,
                    RatingChange = ourParticipant.Participant.RatingChange,
                    Duration = match.Match?.Duration
                });

                if (opponentData.LastPlayedUtc == null ||
                    match.Match?.Updated > opponentData.LastPlayedUtc)
                {
                    opponentData.LastPlayedUtc = match.Match?.Updated;
                }
            }

            opponentData.RecentMatches = matches.OrderByDescending(m => m.DateUtc).ToList();

            if (mapGames.Any())
            {
                var favoriteMap = mapGames.OrderByDescending(kvp => kvp.Value).First();
                opponentData.FavoriteMap = favoriteMap.Key;
                opponentData.FavoriteMapWinRate = mapWins[favoriteMap.Key] * 100.0 / favoriteMap.Value;
            }

            if (matches.Any())
            {
                var orderedMatchesForStreak = matches.OrderByDescending(m => m.DateUtc).ToList();
                var streakCount = 0;
                var isWinStreak = orderedMatchesForStreak[0].Won;

                foreach (var match in orderedMatchesForStreak)
                {
                    if (match.Won == isWinStreak)
                        streakCount++;
                    else
                        break;
                }

                opponentData.StreakCount = streakCount;
                opponentData.CurrentStreak = isWinStreak ? $"W{streakCount}" : $"L{streakCount}";
            }

            if (matches.Any())
            {
                var actualWinRate = matches.Count(m => m.Won) * 100.0 / matches.Count;
                opponentData.WinRate = actualWinRate;
            }

            var last24hMatches = matches.Where(m => m.DateUtc >= DateTime.UtcNow.AddDays(-1)).ToList();
            opponentData.GamesLast24h = last24hMatches.Count;
            opponentData.WinsLast24h = last24hMatches.Count(m => m.Won);

            if (currentRating.HasValue && rating24hAgo.HasValue)
                opponentData.RatingChange24h = currentRating.Value - rating24hAgo.Value;
            else if (opponentData.MMR.HasValue && last24hMatches.Any())
            {
                var sumChanges = last24hMatches
                    .Where(m => m.RatingChange.HasValue)
                    .Sum(m => m.RatingChange!.Value);
                if (sumChanges != 0)
                    opponentData.RatingChange24h = sumChanges;
            }

            var vsZergMatches = matches.Where(m => m.OpponentRace?.ToUpper() == "ZERG").ToList();
            var vsProtossMatches = matches.Where(m => m.OpponentRace?.ToUpper() == "PROTOSS").ToList();
            var vsTerranMatches = matches.Where(m => m.OpponentRace?.ToUpper() == "TERRAN").ToList();

            if (vsZergMatches.Any())
                opponentData.WinRateVsZerg = vsZergMatches.Count(m => m.Won) * 100.0 / vsZergMatches.Count;

            if (vsProtossMatches.Any())
                opponentData.WinRateVsProtoss = vsProtossMatches.Count(m => m.Won) * 100.0 / vsProtossMatches.Count;

            if (vsTerranMatches.Any())
                opponentData.WinRateVsTerran = vsTerranMatches.Count(m => m.Won) * 100.0 / vsTerranMatches.Count;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogDebug(ex, "Error fetching match history for {CharacterId}", characterId);
        }
    }

    private async Task PopulateMmrHistoryAsync(OpponentData opponentData, string? teamLegacyUid, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(teamLegacyUid))
        {
            return;
        }

        try
        {
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
                    opponentData.MmrHistory.Add(new Messages.MmrHistoryPoint
                    {
                        Timestamp = timestamps[i],
                        Rating = ratings[i]
                    });
                }
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogDebug(ex, "Error fetching opponent MMR history for {BattleTag}", opponentData.BattleTag);
        }
    }

    private static string GetRegionCode(Region region)
    {
        return region switch
        {
            Region.US => "101",
            Region.EU => "201",
            Region.KR => "301",
            Region.CN => "501",
            _ => "201"
        };
    }

    private static int GetRaceId(string? race)
    {
        if (string.IsNullOrWhiteSpace(race))
        {
            return 1;
        }

        return race.Trim().ToUpperInvariant() switch
        {
            "TERRAN" => 1,
            "PROTOSS" => 2,
            "ZERG" => 3,
            "RANDOM" => 4,
            _ => 1
        };
    }

    private static LadderDistinctCharacter SelectBestMatch(List<LadderDistinctCharacter> characters, string battleTag)
    {
        if (characters.Count == 0)
        {
            throw ExceptionFactory.Argument("No characters provided.", nameof(characters));
        }

        var target = battleTag.Trim();

        var match = characters.FirstOrDefault(c =>
            string.Equals(c.Members?.Account?.BattleTag, target, StringComparison.OrdinalIgnoreCase));

        match ??= characters.FirstOrDefault(c =>
            string.Equals(c.Members?.Character?.Name, target, StringComparison.OrdinalIgnoreCase));

        match ??= characters.FirstOrDefault(c =>
        {
            var tag = c.Members?.Account?.Tag;
            var disc = c.Members?.Account?.Discriminator;
            if (string.IsNullOrWhiteSpace(tag) || disc == null)
            {
                return false;
            }
            var candidate = $"{tag}#{disc.Value}";
            return string.Equals(candidate, target, StringComparison.OrdinalIgnoreCase);
        });

        return match ?? characters[0];
    }

    private static string GetPrimaryRace(Dictionary<string, int>? raceGames)
    {
        if (raceGames == null || raceGames.Count == 0)
            return "Unknown";

        return raceGames.OrderByDescending(kvp => kvp.Value).First().Key;
    }

    private static string? GetRaceFromRaceGames(Dictionary<string, int>? raceGames)
    {
        if (raceGames == null || raceGames.Count == 0)
            return null;

        return raceGames.OrderByDescending(kvp => kvp.Value).First().Key;
    }

    private static string GetLeagueString(League? league)
    {
        if (league == null) return "Unranked";

        return league switch
        {
            League.BRONZE => "Bronze",
            League.SILVER => "Silver",
            League.GOLD => "Gold",
            League.PLATINUM => "Platinum",
            League.DIAMOND => "Diamond",
            League.MASTER => "Master",
            League.GRANDMASTER => "Grandmaster",
            _ => "Unknown"
        };
    }

    private static string? StripBattleTag(string? fullName)
    {
        if (string.IsNullOrEmpty(fullName)) return fullName;

        var hashIndex = fullName.IndexOf('#');
        return hashIndex > 0 ? fullName[..hashIndex] : fullName;
    }
}
