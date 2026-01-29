using Bits.Sc2.Domain.Entities;
using Bits.Sc2.Domain.ValueObjects;

namespace Bits.Sc2.Domain.Repositories;

/// <summary>
/// Repository interface for persisting and retrieving player profile data.
/// </summary>
public interface IPlayerProfileRepository
{
    /// <summary>
    /// Gets a player profile by their BattleTag.
    /// </summary>
    /// <param name="battleTag">The player's BattleTag.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The player profile if found, null otherwise.</returns>
    Task<PlayerProfile?> GetByBattleTagAsync(BattleTag battleTag, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a player profile by their character ID.
    /// </summary>
    /// <param name="characterId">The character ID from SC2 Pulse API.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The player profile if found, null otherwise.</returns>
    Task<PlayerProfile?> GetByCharacterIdAsync(long characterId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Saves or updates a player profile.
    /// </summary>
    /// <param name="profile">The player profile to save.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task SaveAsync(PlayerProfile profile, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all player profiles that haven't been updated within the specified timespan.
    /// </summary>
    /// <param name="maxAge">Maximum age before considered stale.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Collection of stale player profiles.</returns>
    Task<IReadOnlyList<PlayerProfile>> GetStaleProfilesAsync(TimeSpan maxAge, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the top N players by MMR.
    /// </summary>
    /// <param name="count">Number of top players to retrieve.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Collection of top players ordered by MMR descending.</returns>
    Task<IReadOnlyList<PlayerProfile>> GetTopPlayersByMmrAsync(int count, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets players in a specific MMR range.
    /// </summary>
    /// <param name="minMmr">Minimum MMR (inclusive).</param>
    /// <param name="maxMmr">Maximum MMR (inclusive).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Collection of players in the MMR range.</returns>
    Task<IReadOnlyList<PlayerProfile>> GetPlayersByMmrRangeAsync(int minMmr, int maxMmr, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all pro players.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Collection of pro players.</returns>
    Task<IReadOnlyList<PlayerProfile>> GetProPlayersAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks if a player profile exists for the given BattleTag.
    /// </summary>
    /// <param name="battleTag">The player's BattleTag.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>True if profile exists, false otherwise.</returns>
    Task<bool> ExistsAsync(BattleTag battleTag, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes a player profile.
    /// </summary>
    /// <param name="battleTag">The player's BattleTag.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task DeleteAsync(BattleTag battleTag, CancellationToken cancellationToken = default);
}
