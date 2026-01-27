using Bits.Sc2.Messages;
using Core.Messaging;
using Sc2Pulse;
using Sc2Pulse.Models;
using Sc2Pulse.Queries;

namespace Bits.Sc2.Runners;

/// <summary>
/// Background service that fetches opponent data from SC2 Pulse API when opponent battle tag is detected.
/// This is not a traditional Runner as it doesn't target a specific panel.
/// </summary>
public class OpponentDataRunner : IDisposable
{
    private readonly IMessageBus _messageBus;
    private readonly Sc2PulseClient _pulseClient;
    private string? _lastQueriedBattleTag;
    private CancellationTokenSource? _cts;
    private Task? _backgroundTask;

    public OpponentDataRunner(IMessageBus messageBus)
    {
        _messageBus = messageBus;
        _pulseClient = new Sc2PulseClient();

        // Subscribe to lobby parsed events
        _messageBus.Subscribe<LobbyParsedData>(Sc2MessageType.LobbyFileParsed, OnLobbyParsed);
    }

    public void Start()
    {
        if (_backgroundTask != null) return;

        _cts = new CancellationTokenSource();
        _backgroundTask = Task.Run(async () =>
        {
            // Just wait indefinitely - this runner is event-driven
            await Task.Delay(Timeout.Infinite, _cts.Token);
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
        if (string.IsNullOrWhiteSpace(data.OpponentBattleTag))
            return;

        // Don't query again if we already have data for this opponent
        if (_lastQueriedBattleTag == data.OpponentBattleTag)
            return;

        try
        {
            _lastQueriedBattleTag = data.OpponentBattleTag;

            // Query SC2 Pulse for opponent info
            var opponentData = await FetchOpponentDataAsync(data.OpponentBattleTag);

            if (opponentData != null)
            {
                // Publish enriched opponent data
                var message = new OpponentDataMessage(opponentData);
                _messageBus.Publish(message.Type, message.Payload);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to fetch opponent data: {ex.Message}");
            _lastQueriedBattleTag = null; // Reset so we can retry
        }
    }

    private async Task<OpponentData?> FetchOpponentDataAsync(string battleTag)
    {
        try
        {
            // First, search for character by battle tag to get character ID
            var query = new CharacterFindQuery { Query = battleTag };
            var characters = await _pulseClient.FindCharactersAsync(query);

            if (characters == null || characters.Count == 0)
                return null;

            var character = characters[0];
            var characterId = character.Members?.Character?.Id;

            if (!characterId.HasValue)
                return null;

            // Get detailed character information by ID for more reliable data
            var detailedCharacters = await _pulseClient.GetCharacterByIdAsync(characterId.Value);
            if (detailedCharacters == null || detailedCharacters.Count == 0)
            {
                // Fallback to original character data
                return await ExtractOpponentDataFromCharacter(character, characterId.Value, battleTag);
            }

            // Use the detailed character data
            return await ExtractOpponentDataFromCharacter(detailedCharacters[0], characterId.Value, battleTag);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error fetching opponent data for {battleTag}: {ex.Message}");
            return null;
        }
    }

    private async Task<OpponentData> ExtractOpponentDataFromCharacter(LadderDistinctCharacter character, long characterId, string battleTag)
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
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error fetching team data: {ex.Message}");
        }

        // Calculate win rate from current season games
        int currentSeasonGames = currentStats?.GamesPlayed ?? 0;
        double? winRate = null;
        int? wins = currentTeam?.Wins;
        int? losses = currentTeam?.Losses;

        // Calculate win rate from actual team data if available
        if (wins.HasValue && losses.HasValue)
        {
            var totalGames = wins.Value + losses.Value;
            winRate = totalGames > 0 ? wins.Value * 100.0 / totalGames : null;
            currentSeasonGames = totalGames;
        }
        else if (currentStats?.Rating.HasValue == true && currentSeasonGames > 0)
        {
            // Fallback estimation if team data unavailable
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

            // Current Season Stats
            MMR = currentStats?.Rating,
            PeakMMR = character.RatingMax,
            Rank = currentTeam?.LeagueRank?.ToString(),
            Race = GetPrimaryRace(members?.RaceGames),
            League = GetLeagueString(character.LeagueMax),
            LeagueType = (int?)character.LeagueMax,
            GlobalRank = currentTeam?.GlobalRank,
            RegionRank = currentTeam?.RegionRank,

            // Games and Win Rate
            Wins = wins,
            Losses = losses,
            TotalGamesPlayed = character.TotalGamesPlayed,
            CurrentSeasonGames = currentSeasonGames,
            WinRate = winRate,

            // Pro Player Info
            IsProPlayer = members?.ProId.HasValue == true,
            ProNickname = members?.ProNickname,
            ProTeam = members?.ProPlayer?.ProTeam?.ShortName ?? members?.ProTeam,

            // Clan Info
            ClanTag = clan?.Tag,
            ClanName = clan?.Name,

            // Will be populated by match history
            RecentMatches = new List<DetailedMatchRecord>(),
            LastPlayedUtc = null
        };

        // Fetch detailed match history
        await PopulateMatchHistoryAsync(opponentData, characterId);

        return opponentData;
    }

    private async Task PopulateMatchHistoryAsync(OpponentData opponentData, long characterId)
    {
        try
        {
            var matchesQuery = new CharacterMatchesQuery
            {
                CharacterId = new List<long> { characterId },
                Type = new List<MatchKind> { MatchKind._1V1 }, // Only 1v1 matches
                Limit = 30 // Get more matches for better 24h analysis
            };

            var matchesResult = await _pulseClient.GetCharacterMatchesAsync(matchesQuery);

            if (matchesResult?.Result == null)
                return;

            var matches = new List<DetailedMatchRecord>();
            var mapWins = new Dictionary<string, int>();
            var mapGames = new Dictionary<string, int>();
            var sortedMatches = matchesResult.Result.OrderByDescending(m => m.Match?.Date ?? DateTime.MinValue).ToList();

            // Track ratings for 24h change calculation
            int? currentRating = null;
            int? rating24hAgo = null;
            var cutoff24h = DateTime.UtcNow.AddDays(-1);

            foreach (var match in sortedMatches.Take(15)) // Use 15 most recent matches for display
            {
                var ourParticipant = match.Participants?
                    .FirstOrDefault(p => p.Participant?.PlayerCharacterId == characterId);

                if (ourParticipant?.Participant == null || match.Match == null)
                    continue;

                // Find opponent
                var opponentParticipant = match.Participants?
                    .FirstOrDefault(p => p.Participant?.PlayerCharacterId != characterId);

                var won = ourParticipant.Participant.Decision?.Equals("WIN", StringComparison.OrdinalIgnoreCase) == true;
                var mapName = match.Map?.Name ?? "Unknown";
                var matchDate = match.Match?.Date ?? DateTime.UtcNow;
                var ourRating = ourParticipant.TeamState?.TeamState?.Rating;

                // Track current rating (from most recent match)
                if (currentRating == null && ourRating.HasValue)
                    currentRating = ourRating.Value;

                // Track rating from ~24h ago (first match beyond cutoff)
                if (matchDate < cutoff24h && rating24hAgo == null && ourRating.HasValue)
                    rating24hAgo = ourRating.Value;

                // Extract global rank from match teamState (if more recent than opponentData.GlobalRank)
                if (ourParticipant.TeamState?.TeamState?.GlobalRank.HasValue == true &&
                    (!opponentData.GlobalRank.HasValue || matchDate > (opponentData.LastPlayedUtc ?? DateTime.MinValue)))
                {
                    opponentData.GlobalRank = ourParticipant.TeamState.TeamState.GlobalRank;
                    opponentData.RegionRank = ourParticipant.TeamState.TeamState.RegionRank;
                }

                // Track map statistics
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

                // Update last played
                if (opponentData.LastPlayedUtc == null ||
                    match.Match?.Updated > opponentData.LastPlayedUtc)
                {
                    opponentData.LastPlayedUtc = match.Match?.Updated;
                }
            }

            opponentData.RecentMatches = matches.OrderByDescending(m => m.DateUtc).ToList();

            // Calculate favorite map
            if (mapGames.Any())
            {
                var favoriteMap = mapGames.OrderByDescending(kvp => kvp.Value).First();
                opponentData.FavoriteMap = favoriteMap.Key;
                opponentData.FavoriteMapWinRate = mapWins[favoriteMap.Key] * 100.0 / favoriteMap.Value;
            }

            // Calculate current streak
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

            // Calculate actual win rate from match history (more accurate)
            if (matches.Any())
            {
                var actualWinRate = matches.Count(m => m.Won) * 100.0 / matches.Count;
                opponentData.WinRate = actualWinRate;
            }

            // Calculate 24-hour statistics
            var last24hMatches = matches.Where(m => m.DateUtc >= DateTime.UtcNow.AddDays(-1)).ToList();
            opponentData.GamesLast24h = last24hMatches.Count;
            opponentData.WinsLast24h = last24hMatches.Count(m => m.Won);

            // Calculate MMR change in last 24 hours
            if (currentRating.HasValue && rating24hAgo.HasValue)
                opponentData.RatingChange24h = currentRating.Value - rating24hAgo.Value;
            else if (opponentData.MMR.HasValue && last24hMatches.Any())
            {
                // Fallback: sum rating changes from last 24h matches
                var sumChanges = last24hMatches
                    .Where(m => m.RatingChange.HasValue)
                    .Sum(m => m.RatingChange!.Value);
                if (sumChanges != 0)
                    opponentData.RatingChange24h = sumChanges;
            }

            // Calculate race-specific win rates
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
        catch (Exception ex)
        {
            Console.WriteLine($"Error fetching match history for character {characterId}: {ex.Message}");
        }
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
