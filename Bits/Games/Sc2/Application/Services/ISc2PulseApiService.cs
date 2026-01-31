using Bits.Sc2.Domain.Entities;
using Bits.Sc2.Domain.ValueObjects;

namespace Bits.Sc2.Application.Services;

/// <summary>
/// Application service interface for interacting with SC2 Pulse API.
/// Abstracts the external API and provides domain-focused methods.
/// </summary>
public interface ISc2PulseApiService
{
    /// <summary>
    /// Searches for a player by their BattleTag.
    /// </summary>
    /// <param name="battleTag">The player's BattleTag.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Character ID if found, null otherwise.</returns>
    Task<long?> FindCharacterIdAsync(BattleTag battleTag, CancellationToken cancellationToken = default);

    /// <summary>
    /// Fetches comprehensive player data from SC2 Pulse API.
    /// </summary>
    /// <param name="battleTag">The player's BattleTag.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Player profile with complete data, or null if not found.</returns>
    Task<PlayerProfile?> FetchPlayerDataAsync(BattleTag battleTag, CancellationToken cancellationToken = default);

    /// <summary>
    /// Fetches player data by character ID.
    /// </summary>
    /// <param name="characterId">The SC2 Pulse character ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Player profile with complete data, or null if not found.</returns>
    Task<PlayerProfile?> FetchPlayerDataByIdAsync(long characterId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Fetches MMR history for a player.
    /// </summary>
    /// <param name="characterId">The SC2 character ID.</param>
    /// <param name="race">The player's race (optional, used for history lookup).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>List of MMR history points with timestamps.</returns>
    Task<List<MmrHistoryPoint>> FetchMmrHistoryAsync(
        long characterId,
        Domain.ValueObjects.Race? race,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Fetches match history for a player.
    /// </summary>
    /// <param name="characterId">The SC2 Pulse character ID.</param>
    /// <param name="limit">Maximum number of matches to fetch.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Match history aggregate.</returns>
    Task<MatchHistory?> FetchMatchHistoryAsync(
        long characterId,
        int limit = 25,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Represents a point in MMR history.
/// </summary>
public record MmrHistoryPoint(
    DateTime Timestamp,
    Mmr Mmr,
    int Games);
