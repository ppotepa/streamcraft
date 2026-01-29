using Bits.Sc2.Application.Services;
using Bits.Sc2.Domain.Entities;
using Bits.Sc2.Domain.ValueObjects;
using Microsoft.Extensions.Logging;
using Sc2Pulse;
using Sc2Pulse.Models;
using Sc2Pulse.Queries;

namespace Bits.Sc2.Infrastructure.Services;

/// <summary>
/// Implementation of SC2 Pulse API service.
/// Wraps the Sc2PulseClient and provides domain-focused methods.
/// </summary>
public class Sc2PulseApiService : ISc2PulseApiService
{
    private readonly Sc2PulseClient _pulseClient;
    private readonly ILogger<Sc2PulseApiService> _logger;

    public Sc2PulseApiService(Sc2PulseClient pulseClient, ILogger<Sc2PulseApiService> logger)
    {
        _pulseClient = pulseClient ?? throw new ArgumentNullException(nameof(pulseClient));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<long?> FindCharacterIdAsync(BattleTag battleTag, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug("Searching for character ID for BattleTag: {BattleTag}", battleTag);

            var query = new CharacterFindQuery { Query = battleTag.ToString() };
            var characters = await _pulseClient.FindCharactersAsync(query, cancellationToken);

            if (characters == null || characters.Count == 0)
            {
                _logger.LogWarning("No character found for BattleTag: {BattleTag}. This BattleTag may not exist or may not have played ranked 1v1.", battleTag);
                return null;
            }

            _logger.LogInformation("Search for '{BattleTag}' returned {Count} results",
                battleTag, characters.Count);

            // Log all search results
            for (int i = 0; i < Math.Min(characters.Count, 5); i++)
            {
                var result = characters[i];
                var name = result.Members?.Character?.Name;
                var battleNetId = result.Members?.Character?.BattleNetId;
                var charId = result.Members?.Character?.Id;
                _logger.LogInformation("  Result [{Index}]: CharID={CharId}, Name={Name}, BattleNetId={BattleNetId}",
                    i, charId, name, battleNetId);
            }

            var characterId = characters[0].Members?.Character?.Id;

            if (characterId.HasValue)
            {
                _logger.LogDebug("Using first result - character ID {CharacterId}", characterId.Value);
            }
            else
            {
                _logger.LogWarning("Character found but ID is null for BattleTag: {BattleTag}", battleTag);
            }

            return characterId;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error finding character ID for BattleTag: {BattleTag}", battleTag);
            throw;
        }
    }

    public async Task<PlayerProfile?> FetchPlayerDataAsync(BattleTag battleTag, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Fetching player data for BattleTag: {BattleTag}", battleTag);

            // First find the character ID
            var characterId = await FindCharacterIdAsync(battleTag, cancellationToken);
            if (!characterId.HasValue)
            {
                _logger.LogWarning("Cannot fetch player data - character not found for BattleTag: {BattleTag}", battleTag);
                return null;
            }

            // Fetch detailed data by ID
            return await FetchPlayerDataByIdAsync(characterId.Value, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching player data for BattleTag: {BattleTag}", battleTag);
            throw;
        }
    }

    public async Task<PlayerProfile?> FetchPlayerDataByIdAsync(long characterId, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug("Fetching player data for character ID: {CharacterId}", characterId);

            // Get detailed character information
            var characters = await _pulseClient.GetCharacterByIdAsync(characterId, cancellationToken);
            if (characters == null || characters.Count == 0)
            {
                _logger.LogWarning("No character data found for ID: {CharacterId}", characterId);
                return null;
            }

            var character = characters[0];
            var members = character.Members;
            var playerCharacter = members?.Character;
            var account = members?.Account;
            var clan = members?.Clan;

            if (playerCharacter == null)
            {
                _logger.LogWarning("Character data incomplete (no player character) for ID: {CharacterId}", characterId);
                return null;
            }

            // Log raw API response data
            _logger.LogInformation("API Response for character {CharacterId} - Name: {Name}, BattleNetId: {BattleNetId}, Realm: {Realm}, Region: {Region}",
                characterId,
                playerCharacter.Name,
                playerCharacter.BattleNetId,
                playerCharacter.Realm,
                playerCharacter.Region);

            // Parse BattleTag - Handle cases where Name might already contain #
            if (!playerCharacter.BattleNetId.HasValue || string.IsNullOrWhiteSpace(playerCharacter.Name))
            {
                _logger.LogWarning("Character {CharacterId} has incomplete data - Name: {Name}, BattleNetId: {BattleNetId}",
                    characterId, playerCharacter.Name, playerCharacter.BattleNetId);
                return null;
            }

            // If the Name field already contains '#', extract just the name part
            string characterName = playerCharacter.Name;
            if (characterName.Contains('#'))
            {
                var parts = characterName.Split('#');
                characterName = parts[0]; // Take only the first part
                _logger.LogDebug("Name field contained '#', extracted base name: {CharacterName}", characterName);
            }

            var battleTagString = $"{characterName}#{playerCharacter.BattleNetId.Value}";
            _logger.LogInformation("Constructed BattleTag: {BattleTag}", battleTagString);

            var battleTag = BattleTag.TryParse(battleTagString);
            if (battleTag == null)
            {
                _logger.LogWarning("Invalid BattleTag format: {BattleTag} for character ID: {CharacterId}",
                    battleTagString, characterId);
                return null;
            }

            // Create profile
            var profile = PlayerProfile.Create(battleTag, playerCharacter.Name);

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
                var teams = await _pulseClient.GetCharacterTeamsAsync(teamQuery, cancellationToken);
                currentTeam = teams?.FirstOrDefault();

                _logger.LogDebug("Team query for character {CharacterId}: Found {TeamCount} teams",
                    characterId, teams?.Count ?? 0);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error fetching team data for character {CharacterId}", characterId);
            }

            // Extract basic info - using actual model properties
            var currentStats = character.CurrentStats;

            // Note: LastPlayedRaceId is not in the model, need to determine race differently
            Domain.ValueObjects.Race? race = null;
            // TODO: Determine race from team data or match history

            profile.UpdateBasicInfo(characterId, race);

            // Extract ranking info - using actual model properties
            var rating = character.RatingMax;
            Mmr? mmr = rating.HasValue ? new Mmr(rating.Value) : null;

            var peakRating = character.RatingMax;
            Mmr? peakMmr = peakRating.HasValue ? new Mmr(peakRating.Value) : null;

            var globalRank = currentTeam?.GlobalRank;
            var regionRank = currentTeam?.RegionRank;

            profile.UpdateRanking(mmr, peakMmr, globalRank, regionRank);

            // Extract game statistics
            var totalGames = character.TotalGamesPlayed;
            var wins = currentTeam?.Wins ?? 0;
            var losses = currentTeam?.Losses ?? 0;

            // If we have team data, use those wins/losses; otherwise calculate from total games
            if (currentTeam != null && (wins > 0 || losses > 0))
            {
                profile.UpdateStatistics(totalGames, wins + losses, wins, losses);
            }
            else if (totalGames > 0)
            {
                // Estimate current season games as total games
                profile.UpdateStatistics(totalGames, totalGames, null, null);
            }

            // Extract pro player info
            // TODO: Pro player info not available in current model structure
            // Need to check if Account model has these properties
            var isProPlayer = false;
            string? proNickname = null;
            string? proTeam = null;

            if (isProPlayer)
            {
                profile.UpdateProInfo(isProPlayer, proNickname, proTeam);
            }

            // Extract clan info
            if (clan != null && !string.IsNullOrWhiteSpace(clan.Tag))
            {
                profile.UpdateClanInfo(clan.Tag, clan.Name);
            }

            // Update last played time
            // TODO: LastPlayedAt not in CurrentStats model
            // Need to determine from team data or other source
            profile.UpdateLastPlayed(DateTime.UtcNow);

            _logger.LogInformation(
                "Successfully fetched player data for {BattleTag}: MMR={Mmr}, GlobalRank={GlobalRank}, Games={Games}",
                battleTag, mmr?.Rating, globalRank, totalGames);

            return profile;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching player data for character ID: {CharacterId}", characterId);
            throw;
        }
    }

    public async Task<List<MmrHistoryPoint>> FetchMmrHistoryAsync(
        long characterId,
        Domain.ValueObjects.Race race,
        int region,
        long battleNetId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug("Fetching MMR history for character {CharacterId}, race {Race}",
                characterId, race.Name);

            // Construct team legacy UID
            // Format: {regionCode}-0-{queueType}-{teamFormat}.{battlenetId}.{raceId}
            var regionCode = GetRegionCode(region);
            var raceId = GetRaceId(race);
            var teamLegacyUid = $"{regionCode}-0-2-1.{battleNetId}.{raceId}";

            _logger.LogDebug("Using team legacy UID: {TeamLegacyUid}", teamLegacyUid);

            var query = new TeamHistoriesQuery
            {
                TeamLegacyUids = new List<string> { teamLegacyUid },
                GroupBy = "LEGACY_UID",
                Static = new List<string> { "LEGACY_ID" },
                History = new List<string> { "TIMESTAMP", "RATING" }
            };

            var histories = await _pulseClient.GetTeamHistoriesAsync(query, cancellationToken);

            var points = new List<MmrHistoryPoint>();

            if (histories != null && histories.Count > 0)
            {
                var history = histories[0];
                if (history.History != null)
                {
                    var timestamps = history.History.Timestamp;
                    var ratings = history.History.Rating;

                    if (timestamps != null && ratings != null)
                    {
                        var count = Math.Min(timestamps.Count, ratings.Count);
                        for (int i = 0; i < count; i++)
                        {
                            var mmr = new Mmr(ratings[i]);
                            var timestamp = DateTimeOffset.FromUnixTimeSeconds(timestamps[i]).UtcDateTime;

                            // Games count not available in this endpoint
                            points.Add(new MmrHistoryPoint(timestamp, mmr, 0));
                        }
                    }
                }

                _logger.LogDebug("Fetched {Count} MMR history points for character {CharacterId}",
                    points.Count, characterId);
            }
            else
            {
                _logger.LogDebug("No MMR history found for character {CharacterId}", characterId);
            }

            return points;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching MMR history for character {CharacterId}", characterId);
            throw;
        }
    }

    public async Task<MatchHistory?> FetchMatchHistoryAsync(
        long characterId,
        int limit = 25,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug("Fetching match history for character {CharacterId}, limit {Limit}",
                characterId, limit);

            var query = new CharacterMatchesQuery
            {
                CharacterId = new List<long> { characterId },
                Limit = limit
            };

            var matchResult = await _pulseClient.GetCharacterMatchesAsync(query, cancellationToken);

            if (matchResult?.Result == null || matchResult.Result.Count == 0)
            {
                _logger.LogDebug("No match history found for character {CharacterId}", characterId);
                return null;
            }

            var matchHistory = new MatchHistory();

            foreach (var ladderMatch in matchResult.Result)
            {
                try
                {
                    var match = ParseLadderMatch(ladderMatch);
                    if (match != null)
                    {
                        matchHistory.AddMatch(match);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error parsing match data for character {CharacterId}", characterId);
                }
            }

            _logger.LogDebug("Fetched {Count} matches for character {CharacterId}",
                matchHistory.TotalMatches, characterId);

            return matchHistory;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching match history for character {CharacterId}", characterId);
            throw;
        }
    }

    #region Helper Methods

    private Domain.ValueObjects.Race? ParseRace(int? raceId)
    {
        if (!raceId.HasValue) return null;

        return raceId.Value switch
        {
            1 => Domain.ValueObjects.Race.Terran,
            2 => Domain.ValueObjects.Race.Protoss,
            3 => Domain.ValueObjects.Race.Zerg,
            4 => Domain.ValueObjects.Race.Random,
            _ => null
        };
    }

    private int GetRaceId(Domain.ValueObjects.Race race)
    {
        if (race == Domain.ValueObjects.Race.Terran) return 1;
        if (race == Domain.ValueObjects.Race.Protoss) return 2;
        if (race == Domain.ValueObjects.Race.Zerg) return 3;
        if (race == Domain.ValueObjects.Race.Random) return 4;
        return 1; // Default to Terran
    }

    private string GetRegionCode(int region)
    {
        return region switch
        {
            1 => "1",  // US
            2 => "2",  // EU
            3 => "3",  // KR/TW
            5 => "5",  // CN
            _ => "1"   // Default to US
        };
    }

    private MatchRecord? ParseLadderMatch(LadderMatch ladderMatch)
    {
        // TODO: Complete implementation once LadderMatch model is fully understood
        // The model structure appears different from initial assumptions
        // Need to check actual properties available in LadderMatch

        _logger.LogDebug("Match parsing not yet implemented - model structure needs verification");
        return null;

        /*
        if (ladderMatch.Date == null || string.IsNullOrWhiteSpace(ladderMatch.Map))
        {
            return null;
        }

        var dateUtc = ladderMatch.Date.Value;
        var mapName = ladderMatch.Map;
        var won = ladderMatch.Decision == Decision.WIN;
        
        // Try to parse opponent BattleTag
        BattleTag? opponentBattleTag = null;
        // TODO: Extract opponent BattleTag from match data if available

        // Try to parse opponent race
        Domain.ValueObjects.Race? opponentRace = ParseRace(ladderMatch.OpponentRaceId);

        // Try to get rating change
        int? ratingChange = null;
        // TODO: Calculate rating change if before/after ratings available

        // Try to get match duration
        TimeSpan? duration = null;
        if (ladderMatch.Duration.HasValue)
        {
            duration = TimeSpan.FromSeconds(ladderMatch.Duration.Value);
        }

        var match = MatchRecord.Create(dateUtc, mapName, won);
        
        if (opponentRace != null)
        {
            // TODO: Add method to set opponent race on MatchRecord
        }

        return match;
        */
    }

    #endregion
}
