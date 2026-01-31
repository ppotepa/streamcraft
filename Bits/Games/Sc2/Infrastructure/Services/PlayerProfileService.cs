using Bits.Sc2.Application.Services;
using Bits.Sc2.Domain.Entities;
using Bits.Sc2.Domain.Repositories;
using Bits.Sc2.Domain.ValueObjects;
using Core.Diagnostics;
using Microsoft.Extensions.Logging;

namespace Bits.Sc2.Infrastructure.Services;

/// <summary>
/// Application service for managing player profiles.
/// Coordinates between repositories and domain logic.
/// </summary>
public class PlayerProfileService : IPlayerProfileService
{
    private readonly IPlayerProfileRepository _repository;
    private readonly ISc2PulseApiService _apiService;
    private readonly ILogger<PlayerProfileService> _logger;

    public PlayerProfileService(
        IPlayerProfileRepository repository,
        ISc2PulseApiService apiService,
        ILogger<PlayerProfileService> logger)
    {
        _repository = repository;
        _apiService = apiService;
        _logger = logger;
    }

    public async Task<PlayerProfile> GetOrCreateProfileAsync(BattleTag battleTag, CancellationToken cancellationToken = default)
    {
        var profile = await _repository.GetByBattleTagAsync(battleTag, cancellationToken);

        if (profile != null)
        {
            _logger.LogDebug("Retrieved existing profile for {BattleTag}", battleTag);
            return profile;
        }

        _logger.LogInformation("Creating new profile for {BattleTag}", battleTag);
        profile = PlayerProfile.Create(battleTag);
        await _repository.SaveAsync(profile, cancellationToken);

        return profile;
    }

    public async Task<PlayerProfile?> GetProfileAsync(BattleTag battleTag, CancellationToken cancellationToken = default)
    {
        var profile = await _repository.GetByBattleTagAsync(battleTag, cancellationToken);

        if (profile == null)
        {
            _logger.LogDebug("Profile not found for {BattleTag}", battleTag);
        }

        return profile;
    }

    public async Task<PlayerProfile> RefreshProfileAsync(BattleTag battleTag, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Refreshing profile for {BattleTag}", battleTag);

        try
        {
            // Fetch fresh data from SC2 Pulse API
            var freshProfile = await _apiService.FetchPlayerDataAsync(battleTag, cancellationToken);

            if (freshProfile == null)
            {
                _logger.LogWarning("Could not fetch fresh data for {BattleTag}, returning existing profile or creating new", battleTag);
                var profile = await GetOrCreateProfileAsync(battleTag, cancellationToken);
                profile.UpdateLastPlayed(DateTime.UtcNow);
                await _repository.SaveAsync(profile, cancellationToken);
                return profile;
            }

            // Save the refreshed profile
            await _repository.SaveAsync(freshProfile, cancellationToken);

            _logger.LogInformation("Profile refreshed successfully for {BattleTag}: MMR={Mmr}, Games={Games}",
                battleTag, freshProfile.CurrentMmr?.Rating, freshProfile.TotalGamesPlayed);

            return freshProfile;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing profile for {BattleTag}", battleTag);
            ExceptionFactory.Report(ex, ExceptionSeverity.Error, source: "PlayerProfileService",
                context: new Dictionary<string, string?> { ["BattleTag"] = battleTag.ToString() });
            throw;
        }
    }

    public async Task UpdateBasicInfoAsync(
        BattleTag battleTag,
        long? characterId,
        Race? race,
        CancellationToken cancellationToken = default)
    {
        var profile = await GetOrCreateProfileAsync(battleTag, cancellationToken);

        profile.UpdateBasicInfo(characterId, race);

        await _repository.SaveAsync(profile, cancellationToken);

        _logger.LogDebug("Updated basic info for {BattleTag}: CharacterId={CharacterId}, Race={Race}",
            battleTag, characterId, race?.Name);
    }

    public async Task UpdateRankingAsync(
        BattleTag battleTag,
        Mmr? mmr,
        Mmr? peakMmr,
        int? globalRank,
        int? regionRank,
        CancellationToken cancellationToken = default)
    {
        var profile = await GetOrCreateProfileAsync(battleTag, cancellationToken);

        profile.UpdateRanking(mmr, peakMmr, globalRank, regionRank);

        await _repository.SaveAsync(profile, cancellationToken);

        _logger.LogDebug("Updated ranking for {BattleTag}: MMR={Mmr}, GlobalRank={GlobalRank}",
            battleTag, mmr?.Rating, globalRank);
    }

    public async Task UpdateStatisticsAsync(
        BattleTag battleTag,
        int? totalGamesPlayed,
        int? currentSeasonGames,
        int? wins,
        int? losses,
        CancellationToken cancellationToken = default)
    {
        var profile = await GetOrCreateProfileAsync(battleTag, cancellationToken);

        if (totalGamesPlayed.HasValue && currentSeasonGames.HasValue)
        {
            profile.UpdateStatistics(totalGamesPlayed.Value, currentSeasonGames.Value, wins, losses);
        }

        await _repository.SaveAsync(profile, cancellationToken);

        _logger.LogDebug("Updated statistics for {BattleTag}: Games={Games}, WinRate={WinRate:F2}%",
            battleTag, totalGamesPlayed, profile.WinRate);
    }

    public async Task UpdateProInfoAsync(
        BattleTag battleTag,
        bool isProPlayer,
        string? proNickname,
        string? proTeam,
        CancellationToken cancellationToken = default)
    {
        var profile = await GetOrCreateProfileAsync(battleTag, cancellationToken);

        profile.UpdateProInfo(isProPlayer, proNickname, proTeam);

        await _repository.SaveAsync(profile, cancellationToken);

        _logger.LogInformation("Updated pro info for {BattleTag}: IsPro={IsPro}, Nickname={Nickname}, Team={Team}",
            battleTag, isProPlayer, proNickname, proTeam);
    }

    public async Task<IReadOnlyList<PlayerProfile>> GetStaleProfilesAsync(
        TimeSpan maxAge,
        CancellationToken cancellationToken = default)
    {
        var staleProfiles = await _repository.GetStaleProfilesAsync(maxAge, cancellationToken);

        _logger.LogDebug("Found {Count} stale profiles (max age: {MaxAge})",
            staleProfiles.Count, maxAge);

        return staleProfiles;
    }

    public async Task<IReadOnlyList<PlayerProfile>> GetTopPlayersAsync(
        int count = 100,
        CancellationToken cancellationToken = default)
    {
        var topPlayers = await _repository.GetTopPlayersByMmrAsync(count, cancellationToken);

        _logger.LogDebug("Retrieved top {Count} players by MMR", count);

        return topPlayers;
    }

    public async Task<IReadOnlyList<PlayerProfile>> GetProPlayersAsync(CancellationToken cancellationToken = default)
    {
        var proPlayers = await _repository.GetProPlayersAsync(cancellationToken);

        _logger.LogDebug("Retrieved {Count} pro players", proPlayers.Count);

        return proPlayers;
    }
}
