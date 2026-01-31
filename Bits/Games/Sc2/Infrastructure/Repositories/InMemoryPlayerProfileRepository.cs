using Bits.Sc2.Domain.Entities;
using Bits.Sc2.Domain.Repositories;
using Bits.Sc2.Domain.ValueObjects;
using System.Collections.Concurrent;

namespace Bits.Sc2.Infrastructure.Repositories;

/// <summary>
/// In-memory implementation of IPlayerProfileRepository for development and testing.
/// TODO: Replace with persistent storage implementation (e.g., SQLite, PostgreSQL).
/// </summary>
public class InMemoryPlayerProfileRepository : IPlayerProfileRepository
{
    private readonly ConcurrentDictionary<string, PlayerProfile> _profilesByBattleTag = new();
    private readonly ConcurrentDictionary<long, PlayerProfile> _profilesByCharacterId = new();

    public Task<PlayerProfile?> GetByBattleTagAsync(BattleTag battleTag, CancellationToken cancellationToken = default)
    {
        _profilesByBattleTag.TryGetValue(battleTag.ToString(), out var profile);
        return Task.FromResult(profile);
    }

    public Task<PlayerProfile?> GetByCharacterIdAsync(long characterId, CancellationToken cancellationToken = default)
    {
        _profilesByCharacterId.TryGetValue(characterId, out var profile);
        return Task.FromResult(profile);
    }

    public Task SaveAsync(PlayerProfile profile, CancellationToken cancellationToken = default)
    {
        var key = profile.BattleTag.ToString();
        _profilesByBattleTag[key] = profile;

        if (profile.CharacterId.HasValue)
        {
            _profilesByCharacterId[profile.CharacterId.Value] = profile;
        }

        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<PlayerProfile>> GetStaleProfilesAsync(TimeSpan maxAge, CancellationToken cancellationToken = default)
    {
        var staleProfiles = _profilesByBattleTag.Values
            .Where(p => p.IsStale(maxAge))
            .ToList();

        return Task.FromResult<IReadOnlyList<PlayerProfile>>(staleProfiles);
    }

    public Task<IReadOnlyList<PlayerProfile>> GetTopPlayersByMmrAsync(int count, CancellationToken cancellationToken = default)
    {
        var topPlayers = _profilesByBattleTag.Values
            .Where(p => p.CurrentMmr != null)
            .OrderByDescending(p => p.CurrentMmr!.Rating)
            .Take(count)
            .ToList();

        return Task.FromResult<IReadOnlyList<PlayerProfile>>(topPlayers);
    }

    public Task<IReadOnlyList<PlayerProfile>> GetPlayersByMmrRangeAsync(int minMmr, int maxMmr, CancellationToken cancellationToken = default)
    {
        var playersInRange = _profilesByBattleTag.Values
            .Where(p => p.CurrentMmr != null &&
                       p.CurrentMmr.Rating >= minMmr &&
                       p.CurrentMmr.Rating <= maxMmr)
            .OrderByDescending(p => p.CurrentMmr!.Rating)
            .ToList();

        return Task.FromResult<IReadOnlyList<PlayerProfile>>(playersInRange);
    }

    public Task<IReadOnlyList<PlayerProfile>> GetProPlayersAsync(CancellationToken cancellationToken = default)
    {
        var proPlayers = _profilesByBattleTag.Values
            .Where(p => p.IsProPlayer)
            .OrderBy(p => p.ProNickname)
            .ToList();

        return Task.FromResult<IReadOnlyList<PlayerProfile>>(proPlayers);
    }

    public Task<bool> ExistsAsync(BattleTag battleTag, CancellationToken cancellationToken = default)
    {
        var exists = _profilesByBattleTag.ContainsKey(battleTag.ToString());
        return Task.FromResult(exists);
    }

    public Task DeleteAsync(BattleTag battleTag, CancellationToken cancellationToken = default)
    {
        var key = battleTag.ToString();
        if (_profilesByBattleTag.TryRemove(key, out var profile) && profile.CharacterId.HasValue)
        {
            _profilesByCharacterId.TryRemove(profile.CharacterId.Value, out _);
        }

        return Task.CompletedTask;
    }
}
