using Bits.Sc2.Domain.Entities;
using Bits.Sc2.Domain.ValueObjects;

namespace Bits.Sc2.Domain.Repositories;

/// <summary>
/// Repository interface for persisting and retrieving match history data.
/// </summary>
public interface IMatchHistoryRepository
{
    /// <summary>
    /// Gets the match history for a player by their BattleTag.
    /// </summary>
    /// <param name="battleTag">The player's BattleTag.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The match history if found, null otherwise.</returns>
    Task<MatchHistory?> GetByBattleTagAsync(BattleTag battleTag, CancellationToken cancellationToken = default);

    /// <summary>
    /// Saves or updates a player's match history.
    /// </summary>
    /// <param name="battleTag">The player's BattleTag.</param>
    /// <param name="matchHistory">The match history to save.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task SaveAsync(BattleTag battleTag, MatchHistory matchHistory, CancellationToken cancellationToken = default);

    /// <summary>
    /// Adds a single match to a player's history.
    /// </summary>
    /// <param name="battleTag">The player's BattleTag.</param>
    /// <param name="match">The match to add.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task AddMatchAsync(BattleTag battleTag, MatchRecord match, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets recent matches across all players within the specified timespan.
    /// </summary>
    /// <param name="duration">How far back to look for matches.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Collection of recent matches.</returns>
    Task<IReadOnlyList<MatchRecord>> GetRecentMatchesAsync(TimeSpan duration, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all matches played on a specific map.
    /// </summary>
    /// <param name="mapName">The map name.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Collection of matches on the map.</returns>
    Task<IReadOnlyList<MatchRecord>> GetMatchesByMapAsync(string mapName, CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks if match history exists for the given BattleTag.
    /// </summary>
    /// <param name="battleTag">The player's BattleTag.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>True if history exists, false otherwise.</returns>
    Task<bool> ExistsAsync(BattleTag battleTag, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes a player's match history.
    /// </summary>
    /// <param name="battleTag">The player's BattleTag.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task DeleteAsync(BattleTag battleTag, CancellationToken cancellationToken = default);
}
