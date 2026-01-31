using Bits.Sc2.Domain.Entities;
using Bits.Sc2.Domain.Repositories;
using Bits.Sc2.Domain.ValueObjects;
using System.Collections.Concurrent;

namespace Bits.Sc2.Infrastructure.Repositories;

/// <summary>
/// In-memory implementation of IMatchHistoryRepository for development and testing.
/// TODO: Replace with persistent storage implementation (e.g., SQLite, PostgreSQL).
/// </summary>
public class InMemoryMatchHistoryRepository : IMatchHistoryRepository
{
    private readonly ConcurrentDictionary<string, MatchHistory> _historiesByBattleTag = new();

    public Task<MatchHistory?> GetByBattleTagAsync(BattleTag battleTag, CancellationToken cancellationToken = default)
    {
        _historiesByBattleTag.TryGetValue(battleTag.ToString(), out var history);
        return Task.FromResult(history);
    }

    public Task SaveAsync(BattleTag battleTag, MatchHistory matchHistory, CancellationToken cancellationToken = default)
    {
        var key = battleTag.ToString();
        _historiesByBattleTag[key] = matchHistory;
        return Task.CompletedTask;
    }

    public async Task AddMatchAsync(BattleTag battleTag, MatchRecord match, CancellationToken cancellationToken = default)
    {
        var history = await GetByBattleTagAsync(battleTag, cancellationToken);

        if (history == null)
        {
            history = new MatchHistory();
        }

        history.AddMatch(match);
        await SaveAsync(battleTag, history, cancellationToken);
    }

    public Task<IReadOnlyList<MatchRecord>> GetRecentMatchesAsync(TimeSpan duration, CancellationToken cancellationToken = default)
    {
        var cutoffTime = DateTime.UtcNow - duration;

        var recentMatches = _historiesByBattleTag.Values
            .SelectMany(h => h.Matches)
            .Where(m => m.DateUtc >= cutoffTime)
            .OrderByDescending(m => m.DateUtc)
            .ToList();

        return Task.FromResult<IReadOnlyList<MatchRecord>>(recentMatches);
    }

    public Task<IReadOnlyList<MatchRecord>> GetMatchesByMapAsync(string mapName, CancellationToken cancellationToken = default)
    {
        var matchesOnMap = _historiesByBattleTag.Values
            .SelectMany(h => h.Matches)
            .Where(m => m.MapName.Equals(mapName, StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(m => m.DateUtc)
            .ToList();

        return Task.FromResult<IReadOnlyList<MatchRecord>>(matchesOnMap);
    }

    public Task<bool> ExistsAsync(BattleTag battleTag, CancellationToken cancellationToken = default)
    {
        var exists = _historiesByBattleTag.ContainsKey(battleTag.ToString());
        return Task.FromResult(exists);
    }

    public Task DeleteAsync(BattleTag battleTag, CancellationToken cancellationToken = default)
    {
        _historiesByBattleTag.TryRemove(battleTag.ToString(), out _);
        return Task.CompletedTask;
    }
}
