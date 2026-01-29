using Bits.Sc2.Domain.Entities;
using Bits.Sc2.Domain.ValueObjects;

namespace Bits.Sc2.Application.Services;

/// <summary>
/// Application service interface for managing player profiles.
/// </summary>
public interface IPlayerProfileService
{
    /// <summary>
    /// Gets a player profile by BattleTag, creating a new one if it doesn't exist.
    /// </summary>
    /// <param name="battleTag">The player's BattleTag.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The player profile.</returns>
    Task<PlayerProfile> GetOrCreateProfileAsync(BattleTag battleTag, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a player profile by BattleTag.
    /// </summary>
    /// <param name="battleTag">The player's BattleTag.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The player profile if found, null otherwise.</returns>
    Task<PlayerProfile?> GetProfileAsync(BattleTag battleTag, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates a player profile with fresh data from SC2 Pulse API.
    /// </summary>
    /// <param name="battleTag">The player's BattleTag.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The updated player profile.</returns>
    Task<PlayerProfile> RefreshProfileAsync(BattleTag battleTag, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates basic player information.
    /// </summary>
    /// <param name="battleTag">The player's BattleTag.</param>
    /// <param name="characterId">The character ID.</param>
    /// <param name="race">The player's race.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task UpdateBasicInfoAsync(BattleTag battleTag, long? characterId, Race? race, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates player ranking information.
    /// </summary>
    /// <param name="battleTag">The player's BattleTag.</param>
    /// <param name="mmr">Current MMR.</param>
    /// <param name="peakMmr">Peak MMR this season.</param>
    /// <param name="globalRank">Global rank.</param>
    /// <param name="regionRank">Region rank.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task UpdateRankingAsync(BattleTag battleTag, Mmr? mmr, Mmr? peakMmr, int? globalRank, int? regionRank, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates player game statistics.
    /// </summary>
    /// <param name="battleTag">The player's BattleTag.</param>
    /// <param name="totalGamesPlayed">Total games played all-time.</param>
    /// <param name="currentSeasonGames">Games played this season.</param>
    /// <param name="wins">Total wins.</param>
    /// <param name="losses">Total losses.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task UpdateStatisticsAsync(BattleTag battleTag, int? totalGamesPlayed, int? currentSeasonGames, int? wins, int? losses, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates player pro information.
    /// </summary>
    /// <param name="battleTag">The player's BattleTag.</param>
    /// <param name="isProPlayer">Whether the player is a pro.</param>
    /// <param name="proNickname">Pro nickname if applicable.</param>
    /// <param name="proTeam">Pro team if applicable.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task UpdateProInfoAsync(BattleTag battleTag, bool isProPlayer, string? proNickname, string? proTeam, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all profiles that need to be refreshed.
    /// </summary>
    /// <param name="maxAge">Maximum age before profile is considered stale.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Collection of stale profiles.</returns>
    Task<IReadOnlyList<PlayerProfile>> GetStaleProfilesAsync(TimeSpan maxAge, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the top players by MMR.
    /// </summary>
    /// <param name="count">Number of top players to retrieve.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Collection of top players.</returns>
    Task<IReadOnlyList<PlayerProfile>> GetTopPlayersAsync(int count = 100, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all pro players.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Collection of pro players.</returns>
    Task<IReadOnlyList<PlayerProfile>> GetProPlayersAsync(CancellationToken cancellationToken = default);
}
