using Bits.Sc2.Messages;
using Core.Messaging;
using Sc2Pulse;
using Sc2Pulse.Models;
using Sc2Pulse.Queries;

namespace Bits.Sc2.Runners;

/// <summary>
/// Background service that fetches current player's data from SC2 Pulse API.
/// Triggers when user battle tag is detected in lobby or periodically.
/// </summary>
public class PlayerDataRunner : IDisposable
{
    private readonly IMessageBus _messageBus;
    private readonly Sc2PulseClient _pulseClient;
    private readonly string? _configuredBattleTag;
    private string? _lastQueriedBattleTag;
    private CancellationTokenSource? _cts;
    private Task? _backgroundTask;
    private DateTime _lastFetchTime = DateTime.MinValue;
    private readonly TimeSpan _refreshInterval = TimeSpan.FromMinutes(5);

    public PlayerDataRunner(IMessageBus messageBus, string? configuredBattleTag)
    {
        _messageBus = messageBus;
        _pulseClient = new Sc2PulseClient();
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
                    Console.WriteLine($"Error in PlayerDataRunner background loop: {ex.Message}");
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
            Console.WriteLine($"Failed to fetch player data on lobby parsed: {ex.Message}");
        }
    }

    private async Task FetchPlayerDataAsync(string battleTag)
    {
        Console.WriteLine($"[PlayerDataRunner] ===== Starting data fetch for user: {battleTag} =====");
        try
        {
            _lastFetchTime = DateTime.UtcNow;
            _lastQueriedBattleTag = battleTag;

            Console.WriteLine($"[PlayerDataRunner] Fetching data for player: {battleTag}");

            // First, search for character by battle tag
            var query = new CharacterFindQuery { Query = battleTag };
            var characters = await _pulseClient.FindCharactersAsync(query);

            if (characters == null || characters.Count == 0)
            {
                Console.WriteLine($"[PlayerDataRunner] No character found for: {battleTag}");
                return;
            }

            var character = characters[0];
            var characterId = character.Members?.Character?.Id;

            if (!characterId.HasValue)
            {
                Console.WriteLine($"[PlayerDataRunner] Character ID not found for: {battleTag}");
                return;
            }

            // Get detailed character information
            var detailedCharacters = await _pulseClient.GetCharacterByIdAsync(characterId.Value);
            if (detailedCharacters != null && detailedCharacters.Count > 0)
            {
                character = detailedCharacters[0];
            }

            // Extract player data (reusing OpponentDataRunner logic)
            var playerData = await ExtractPlayerDataFromCharacter(character, characterId.Value, battleTag);

            if (playerData != null)
            {
                Console.WriteLine($"[PlayerDataRunner] Publishing data for {battleTag}: MMR={playerData.MMR}, Wins={playerData.Wins}, Losses={playerData.Losses}");

                // Publish player data
                var message = new PlayerDataMessage(playerData);
                _messageBus.Publish(message.Type, message.Payload);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error fetching player data for {battleTag}: {ex.Message}");
            _lastQueriedBattleTag = null; // Reset so we can retry
        }
    }

    private async Task<PlayerData> ExtractPlayerDataFromCharacter(LadderDistinctCharacter character, long characterId, string battleTag)
    {
        var currentStats = character.CurrentStats;
        var members = character.Members;
        var playerCharacter = members?.Character;
        var account = members?.Account;
        var clan = members?.Clan;

        // Get current team data for accurate wins/losses and ranking
        LadderTeam? currentTeam = null;
        try
        {
            var teamQuery = new CharacterTeamsQuery
            {
                CharacterId = new List<long> { characterId },
                Queue = new List<Queue> { Queue.LOTV_1V1 },
                Limit = 1
            };
            var teams = await _pulseClient.GetCharacterTeamsAsync(teamQuery);
            currentTeam = teams?.FirstOrDefault();
            Console.WriteLine($"[PlayerDataRunner] Team query result - Teams count: {teams?.Count ?? 0}, Current team found: {currentTeam != null}, Team Legacy UID: {currentTeam?.TeamLegacyUid}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error fetching team data: {ex.Message}");
        }

        // Get MMR history for the player's current race
        List<MmrHistoryPoint> mmrHistory = new();
        Console.WriteLine($"[PlayerDataRunner] Checking MMR history conditions - currentTeam is null: {currentTeam == null}, TeamLegacyUid: {currentTeam?.TeamLegacyUid}");

        string? teamLegacyUid = currentTeam?.TeamLegacyUid;

        // Fallback: construct team legacy UID if not available from team query
        if (string.IsNullOrEmpty(teamLegacyUid) && playerCharacter?.BattleNetId != null)
        {
            // Format: {regionCode}-0-{queueType}-{teamFormat}.{battlenetId}.{raceId}
            var regionCode = GetRegionCode(playerCharacter.Region);
            var battlenetId = playerCharacter.BattleNetId;
            // Use race 1 (Terran) as default for constructing base UID
            teamLegacyUid = $"{regionCode}-0-2-1.{battlenetId}.1";
            Console.WriteLine($"[PlayerDataRunner] Constructed team legacy UID from character data: {teamLegacyUid}");
        }

        if (!string.IsNullOrEmpty(teamLegacyUid))
        {
            try
            {
                Console.WriteLine($"[PlayerDataRunner] Fetching MMR history for user: {battleTag}");

                // Parse team legacy UID to build UIDs for all races
                // Format: 201-0-2-1.accountId.raceId
                var parts = teamLegacyUid.Split('.');
                if (parts.Length == 3)
                {
                    var baseUid = $"{parts[0]}.{parts[1]}"; // e.g., "201-0-2-1.3141896"
                    Console.WriteLine($"[PlayerDataRunner] Team Legacy UID: {teamLegacyUid}, Base UID: {baseUid}");

                    var historyQuery = new TeamHistoriesQuery
                    {
                        TeamLegacyUids = new List<string>
                        {
                            $"{baseUid}.1", // TERRAN
                            $"{baseUid}.2", // PROTOSS
                            $"{baseUid}.3", // ZERG
                        },
                        GroupBy = "LEGACY_UID",
                        Static = new List<string> { "LEGACY_ID" },
                        History = new List<string> { "TIMESTAMP", "RATING" }
                    };

                    var histories = await _pulseClient.GetTeamHistoriesAsync(historyQuery);
                    Console.WriteLine($"[PlayerDataRunner] API returned {histories?.Count ?? 0} history records");
                    if (histories != null && histories.Count > 0)
                    {
                        // Log all returned histories for debugging
                        for (int idx = 0; idx < histories.Count; idx++)
                        {
                            var h = histories[idx];
                            Console.WriteLine($"[PlayerDataRunner] History [{idx}] - LegacyId: {h.StaticData?.LegacyId}, Timestamp count: {h.History?.Timestamp?.Count ?? 0}, Rating count: {h.History?.Rating?.Count ?? 0}");
                        }

                        // Find the history for the current race
                        var currentRaceId = parts[2];
                        // API returns LEGACY_ID in format: "regionSimple.accountId.raceId" (e.g., "1.315071.1")
                        // We need to match by checking if it ends with ".accountId.raceId"
                        var accountId = parts[1];
                        var targetSuffix = $"{accountId}.{currentRaceId}";
                        Console.WriteLine($"[PlayerDataRunner] Looking for LegacyId ending with: {targetSuffix}");
                        var matchingHistory = histories.FirstOrDefault(h =>
                            h.StaticData?.LegacyId?.EndsWith($".{targetSuffix}") == true ||
                            h.StaticData?.LegacyId == targetSuffix);

                        if (matchingHistory != null && matchingHistory.History != null)
                        {
                            var timestamps = matchingHistory.History.Timestamp;
                            var ratings = matchingHistory.History.Rating;

                            // Filter to last 60 days
                            var cutoffTimestamp = DateTimeOffset.UtcNow.AddDays(-60).ToUnixTimeSeconds();

                            for (int i = 0; i < Math.Min(timestamps.Count, ratings.Count); i++)
                            {
                                // Only include data from last 60 days
                                if (timestamps[i] >= cutoffTimestamp)
                                {
                                    mmrHistory.Add(new MmrHistoryPoint
                                    {
                                        Timestamp = timestamps[i],
                                        Rating = ratings[i]
                                    });
                                }
                            }

                            Console.WriteLine($"[PlayerDataRunner] Successfully loaded {mmrHistory.Count} MMR history points for {battleTag} (last 60 days)");
                        }
                        else
                        {
                            Console.WriteLine($"[PlayerDataRunner] No matching history found for race ID: {currentRaceId}");
                        }
                    }
                    else
                    {
                        Console.WriteLine($"[PlayerDataRunner] No team histories returned from API");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PlayerDataRunner] Error fetching MMR history for {battleTag}: {ex.Message}");
            }
        }

        // Calculate win rate
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

        var playerData = new PlayerData
        {
            BattleTag = account?.BattleTag ?? battleTag,
            Name = playerCharacter?.Name,
            CharacterId = characterId,

            MMR = currentStats?.Rating,
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
            LastPlayedUtc = null,
            MmrHistory = mmrHistory
        };

        // Fetch match history
        await PopulateMatchHistoryAsync(playerData, characterId);

        return playerData;
    }

    private async Task PopulateMatchHistoryAsync(PlayerData playerData, long characterId)
    {
        try
        {
            var matchesQuery = new CharacterMatchesQuery
            {
                CharacterId = new List<long> { characterId },
                Type = new List<MatchKind> { MatchKind._1V1 },
                Limit = 30
            };

            var matchesResult = await _pulseClient.GetCharacterMatchesAsync(matchesQuery);

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
                    (!playerData.GlobalRank.HasValue || matchDate > (playerData.LastPlayedUtc ?? DateTime.MinValue)))
                {
                    playerData.GlobalRank = ourParticipant.TeamState.TeamState.GlobalRank;
                    playerData.RegionRank = ourParticipant.TeamState.TeamState.RegionRank;
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

                if (playerData.LastPlayedUtc == null || matchDate > playerData.LastPlayedUtc)
                {
                    playerData.LastPlayedUtc = matchDate;
                }
            }

            playerData.RecentMatches = matches.OrderByDescending(m => m.DateUtc).ToList();

            if (mapGames.Any())
            {
                var favoriteMap = mapGames.OrderByDescending(kvp => kvp.Value).First();
                playerData.FavoriteMap = favoriteMap.Key;
                playerData.FavoriteMapWinRate = mapWins[favoriteMap.Key] * 100.0 / favoriteMap.Value;
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

                playerData.StreakCount = streakCount;
                playerData.CurrentStreak = isWinStreak ? $"W{streakCount}" : $"L{streakCount}";
            }

            if (matches.Any())
            {
                var actualWinRate = matches.Count(m => m.Won) * 100.0 / matches.Count;
                playerData.WinRate = actualWinRate;
            }

            var last24hMatches = matches.Where(m => m.DateUtc >= DateTime.UtcNow.AddDays(-1)).ToList();
            playerData.GamesLast24h = last24hMatches.Count;
            playerData.WinsLast24h = last24hMatches.Count(m => m.Won);

            if (currentRating.HasValue && rating24hAgo.HasValue)
                playerData.RatingChange24h = currentRating.Value - rating24hAgo.Value;
            else if (playerData.MMR.HasValue && last24hMatches.Any())
            {
                var sumChanges = last24hMatches
                    .Where(m => m.RatingChange.HasValue)
                    .Sum(m => m.RatingChange!.Value);
                if (sumChanges != 0)
                    playerData.RatingChange24h = sumChanges;
            }

            var vsZergMatches = matches.Where(m => m.OpponentRace?.ToUpper() == "ZERG").ToList();
            var vsProtossMatches = matches.Where(m => m.OpponentRace?.ToUpper() == "PROTOSS").ToList();
            var vsTerranMatches = matches.Where(m => m.OpponentRace?.ToUpper() == "TERRAN").ToList();

            if (vsZergMatches.Any())
                playerData.WinRateVsZerg = vsZergMatches.Count(m => m.Won) * 100.0 / vsZergMatches.Count;

            if (vsProtossMatches.Any())
                playerData.WinRateVsProtoss = vsProtossMatches.Count(m => m.Won) * 100.0 / vsProtossMatches.Count;

            if (vsTerranMatches.Any())
                playerData.WinRateVsTerran = vsTerranMatches.Count(m => m.Won) * 100.0 / vsTerranMatches.Count;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error fetching match history for character {characterId}: {ex.Message}");
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
            _ => "201" // Default to EU
        };
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
        return hashIndex > 0 ? fullName.Substring(0, hashIndex) : fullName;
    }

    public void Dispose()
    {
        Stop();
        _cts?.Dispose();
        _pulseClient?.Dispose();
    }
}
