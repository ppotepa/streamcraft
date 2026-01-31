using Bits.Sc2.Application.Services;
using Bits.Sc2.Domain.Entities;
using Bits.Sc2.Domain.ValueObjects;
using Microsoft.Extensions.Logging;
using Sc2Pulse;
using Sc2Pulse.Models;
using Sc2Pulse.Queries;
using Core.Diagnostics;

namespace Bits.Sc2.Infrastructure.Services;

/// <summary>
/// Implementation of SC2 Pulse API service.
/// Wraps the Sc2PulseClient and provides domain-focused methods.
/// </summary>
public class Sc2PulseApiService : ISc2PulseApiService
{
    private readonly ISc2PulseClient _pulseClient;
    private readonly ILogger<Sc2PulseApiService> _logger;

    public Sc2PulseApiService(ISc2PulseClient pulseClient, ILogger<Sc2PulseApiService> logger)
    {
        if (pulseClient == null) throw ExceptionFactory.ArgumentNull(nameof(pulseClient));
        if (logger == null) throw ExceptionFactory.ArgumentNull(nameof(logger));
        _pulseClient = pulseClient;
        _logger = logger;
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

            // Log a few search results
            for (int i = 0; i < Math.Min(characters.Count, 5); i++)
            {
                var result = characters[i];
                var name = result.Members?.Character?.Name;
                var battleNetId = result.Members?.Character?.BattleNetId;
                var charId = result.Members?.Character?.Id;
                _logger.LogInformation("  Result [{Index}]: CharID={CharId}, Name={Name}, BattleNetId={BattleNetId}",
                    i, charId, name, battleNetId);
            }

            var targetTag = battleTag.ToString();
            LadderDistinctCharacter? match = characters.FirstOrDefault(c =>
                string.Equals(c.Members?.Account?.BattleTag, targetTag, StringComparison.OrdinalIgnoreCase));

            if (match == null)
            {
                match = characters.FirstOrDefault(c =>
                    string.Equals(c.Members?.Character?.Name, targetTag, StringComparison.OrdinalIgnoreCase));
            }

            if (match == null)
            {
                match = characters.FirstOrDefault(c =>
                {
                    var tag = c.Members?.Account?.Tag;
                    var disc = c.Members?.Account?.Discriminator;
                    if (string.IsNullOrWhiteSpace(tag) || disc == null)
                    {
                        return false;
                    }
                    var candidate = $"{tag}#{disc.Value}";
                    return string.Equals(candidate, targetTag, StringComparison.OrdinalIgnoreCase);
                });
            }

            match ??= characters[0];

            var characterId = match.Members?.Character?.Id;

            if (characterId.HasValue)
            {
                _logger.LogDebug("Using matched result - character ID {CharacterId}", characterId.Value);
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
            ExceptionFactory.Report(ex, ExceptionSeverity.Error, source: "Sc2PulseApiService",
                context: new Dictionary<string, string?> { ["BattleTag"] = battleTag.ToString() });
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
            return await FetchPlayerDataByIdAsyncInternal(characterId.Value, battleTag, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching player data for BattleTag: {BattleTag}", battleTag);
            ExceptionFactory.Report(ex, ExceptionSeverity.Error, source: "Sc2PulseApiService",
                context: new Dictionary<string, string?> { ["BattleTag"] = battleTag.ToString() });
            throw;
        }
    }

    public async Task<PlayerProfile?> FetchPlayerDataByIdAsync(long characterId, CancellationToken cancellationToken = default)
    {
        return await FetchPlayerDataByIdAsyncInternal(characterId, null, cancellationToken);
    }

    private async Task<PlayerProfile?> FetchPlayerDataByIdAsyncInternal(long characterId, BattleTag? fallbackBattleTag, CancellationToken cancellationToken)
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

            if (string.IsNullOrWhiteSpace(playerCharacter.Name))
            {
                _logger.LogWarning("Character {CharacterId} has incomplete data - Name is missing.", characterId);
                return null;
            }

            BattleTag? battleTag = null;

            if (!string.IsNullOrWhiteSpace(account?.BattleTag))
            {
                battleTag = BattleTag.TryParse(account.BattleTag);
                if (battleTag != null)
                {
                    _logger.LogInformation("Using account BattleTag from API: {BattleTag}", account.BattleTag);
                }
            }

            if (battleTag == null && playerCharacter.Name.Contains('#'))
            {
                battleTag = BattleTag.TryParse(playerCharacter.Name);
                if (battleTag != null)
                {
                    _logger.LogInformation("Using BattleTag from character name: {BattleTag}", playerCharacter.Name);
                }
            }

            if (battleTag == null && !string.IsNullOrWhiteSpace(account?.Tag) && account?.Discriminator != null)
            {
                var candidate = $"{account.Tag}#{account.Discriminator.Value}";
                battleTag = BattleTag.TryParse(candidate);
                if (battleTag != null)
                {
                    _logger.LogInformation("Using BattleTag from account tag/discriminator: {BattleTag}", candidate);
                }
            }

            if (battleTag == null && fallbackBattleTag != null)
            {
                battleTag = fallbackBattleTag;
                _logger.LogInformation("Using fallback BattleTag: {BattleTag}", fallbackBattleTag);
            }

            if (battleTag == null)
            {
                _logger.LogWarning("Unable to resolve a valid BattleTag for character ID {CharacterId}.", characterId);
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
            ExceptionFactory.Report(ex, ExceptionSeverity.Error, source: "Sc2PulseApiService",
                context: new Dictionary<string, string?> { ["CharacterId"] = characterId.ToString() });
            throw;
        }
    }

    public async Task<List<MmrHistoryPoint>> FetchMmrHistoryAsync(
        long characterId,
        Domain.ValueObjects.Race? race,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var resolvedRace = race ?? Domain.ValueObjects.Race.Terran;

            _logger.LogDebug("Fetching MMR history for character {CharacterId}, race {Race}",
                characterId, resolvedRace.Name);

            var teamLegacyUid = await ResolveTeamLegacyUidAsync(characterId, resolvedRace, cancellationToken);

            if (string.IsNullOrWhiteSpace(teamLegacyUid))
            {
                _logger.LogDebug("Unable to resolve team legacy UID for character {CharacterId}", characterId);
                return new List<MmrHistoryPoint>();
            }

            var queryUids = BuildLegacyUidQuery(teamLegacyUid, out var targetSuffix);

            var query = new TeamHistoriesQuery
            {
                TeamLegacyUids = queryUids,
                GroupBy = "LEGACY_UID",
                Static = new List<string> { "LEGACY_ID" },
                History = new List<string> { "TIMESTAMP", "RATING" }
            };

            var histories = await _pulseClient.GetTeamHistoriesAsync(query, cancellationToken);
            var points = new List<MmrHistoryPoint>();

            if (histories == null || histories.Count == 0)
            {
                _logger.LogDebug("No MMR history found for character {CharacterId}", characterId);
                return points;
            }

            var matchingHistory = ResolveMatchingHistory(histories, targetSuffix);

            if (matchingHistory?.History == null)
            {
                _logger.LogDebug("No matching MMR history payload for character {CharacterId}", characterId);
                return points;
            }

            var timestamps = matchingHistory.History.Timestamp;
            var ratings = matchingHistory.History.Rating;

            if (timestamps == null || ratings == null)
            {
                return points;
            }

            var count = Math.Min(timestamps.Count, ratings.Count);
            for (int i = 0; i < count; i++)
            {
                var mmr = new Mmr(ratings[i]);
                var timestamp = DateTimeOffset.FromUnixTimeSeconds(timestamps[i]).UtcDateTime;

                points.Add(new MmrHistoryPoint(timestamp, mmr, 0));
            }

            _logger.LogDebug("Fetched {Count} MMR history points for character {CharacterId}",
                points.Count, characterId);

            return points;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching MMR history for character {CharacterId}", characterId);
            ExceptionFactory.Report(ex, ExceptionSeverity.Error, source: "Sc2PulseApiService",
                context: new Dictionary<string, string?> { ["CharacterId"] = characterId.ToString() });
            throw;
        }
    }

    private async Task<string?> ResolveTeamLegacyUidAsync(long characterId, Domain.ValueObjects.Race race, CancellationToken cancellationToken)
    {
        try
        {
            var teamQuery = new CharacterTeamsQuery
            {
                CharacterId = new List<long> { characterId },
                Queue = new List<Queue> { Queue.LOTV_1V1 },
                Limit = 1
            };

            var teams = await _pulseClient.GetCharacterTeamsAsync(teamQuery, cancellationToken);
            var currentTeam = teams?.FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(currentTeam?.TeamLegacyUid))
            {
                return currentTeam.TeamLegacyUid;
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogDebug(ex, "Failed to resolve team legacy UID from team data for character {CharacterId}", characterId);
        }

        try
        {
            var characterDetails = await _pulseClient.GetCharacterByIdAsync(characterId, cancellationToken);
            var character = characterDetails?.FirstOrDefault();
            var battleNetId = character?.Members?.Character?.BattleNetId;
            var region = character?.Members?.Character?.Region;

            if (!battleNetId.HasValue || !region.HasValue)
            {
                return null;
            }

            var regionCode = GetLegacyRegionCode(region.Value);
            var raceId = GetRaceId(race);
            return $"{regionCode}-0-2-1.{battleNetId.Value}.{raceId}";
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogDebug(ex, "Failed to resolve team legacy UID from character details for character {CharacterId}", characterId);
            return null;
        }
    }

    private static List<string> BuildLegacyUidQuery(string teamLegacyUid, out string? targetSuffix)
    {
        targetSuffix = null;

        var parts = teamLegacyUid.Split('.');
        if (parts.Length == 3)
        {
            var baseUid = $"{parts[0]}.{parts[1]}";
            targetSuffix = $"{parts[1]}.{parts[2]}";
            return new List<string>
            {
                $"{baseUid}.1",
                $"{baseUid}.2",
                $"{baseUid}.3"
            };
        }

        return new List<string> { teamLegacyUid };
    }

    private static TeamHistory? ResolveMatchingHistory(List<TeamHistory> histories, string? targetSuffix)
    {
        if (histories.Count == 0)
        {
            return null;
        }

        if (string.IsNullOrWhiteSpace(targetSuffix))
        {
            return histories[0];
        }

        return histories.FirstOrDefault(h =>
                   h.StaticData?.LegacyId?.EndsWith($".{targetSuffix}", StringComparison.OrdinalIgnoreCase) == true
                   || string.Equals(h.StaticData?.LegacyId, targetSuffix, StringComparison.OrdinalIgnoreCase))
               ?? histories[0];
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
            ExceptionFactory.Report(ex, ExceptionSeverity.Error, source: "Sc2PulseApiService",
                context: new Dictionary<string, string?> { ["CharacterId"] = characterId.ToString() });
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

    private string GetLegacyRegionCode(Region region)
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
