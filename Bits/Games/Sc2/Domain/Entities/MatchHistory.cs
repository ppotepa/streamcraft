using Bits.Sc2.Domain.ValueObjects;
using Core.Diagnostics;

namespace Bits.Sc2.Domain.Entities;

/// <summary>
/// Entity representing a single StarCraft II match record.
/// </summary>
public class MatchRecord
{
    public DateTime DateUtc { get; private set; }
    public string MapName { get; private set; }
    public BattleTag? OpponentBattleTag { get; private set; }
    public string? OpponentName { get; private set; }
    public Race? OpponentRace { get; private set; }
    public Mmr? OpponentMmr { get; private set; }
    public bool Won { get; private set; }
    public int? RatingChange { get; private set; }
    public TimeSpan? Duration { get; private set; }

    private MatchRecord()
    {
        MapName = string.Empty; // Will be set by factory method
    }

    /// <summary>
    /// Creates a new match record.
    /// </summary>
    public static MatchRecord Create(
        DateTime dateUtc,
        string mapName,
        bool won,
        string? opponentName = null,
        Race? opponentRace = null)
    {
        if (string.IsNullOrWhiteSpace(mapName))
            throw ExceptionFactory.Argument("Map name cannot be empty", nameof(mapName));

        return new MatchRecord
        {
            DateUtc = dateUtc,
            MapName = mapName,
            Won = won,
            OpponentName = opponentName,
            OpponentRace = opponentRace
        };
    }

    /// <summary>
    /// Sets opponent battle tag.
    /// </summary>
    public void SetOpponentBattleTag(BattleTag battleTag)
    {
        OpponentBattleTag = battleTag;
    }

    /// <summary>
    /// Sets opponent MMR.
    /// </summary>
    public void SetOpponentMmr(Mmr mmr)
    {
        OpponentMmr = mmr;
    }

    /// <summary>
    /// Sets rating change from this match.
    /// </summary>
    public void SetRatingChange(int change)
    {
        RatingChange = change;
    }

    /// <summary>
    /// Sets match duration.
    /// </summary>
    public void SetDuration(TimeSpan duration)
    {
        Duration = duration;
    }

    /// <summary>
    /// Checks if this was a recent match.
    /// </summary>
    public bool IsRecent(TimeSpan maxAge)
    {
        return DateTime.UtcNow - DateUtc <= maxAge;
    }

    /// <summary>
    /// Gets the result as a string.
    /// </summary>
    public string GetResult() => Won ? "Win" : "Loss";

    /// <summary>
    /// Gets a short summary of the match.
    /// </summary>
    public string GetSummary()
    {
        var result = Won ? "W" : "L";
        var opponent = OpponentName ?? "Unknown";
        var race = OpponentRace?.Name ?? "?";

        return $"{result} vs {opponent} ({race}) on {MapName}";
    }
}

/// <summary>
/// Aggregate root representing a player's match history.
/// </summary>
public class MatchHistory
{
    private readonly List<MatchRecord> _matches = new();

    public IReadOnlyList<MatchRecord> Matches => _matches.AsReadOnly();
    public int TotalMatches => _matches.Count;
    public int Wins => _matches.Count(m => m.Won);
    public int Losses => _matches.Count(m => !m.Won);
    public double WinRate => TotalMatches > 0 ? Wins * 100.0 / TotalMatches : 0;

    /// <summary>
    /// Adds a match to the history.
    /// </summary>
    public void AddMatch(MatchRecord match)
    {
        if (match == null)
            throw ExceptionFactory.ArgumentNull(nameof(match));

        _matches.Add(match);
        _matches.Sort((a, b) => b.DateUtc.CompareTo(a.DateUtc)); // Most recent first
    }

    /// <summary>
    /// Gets matches from a specific time period.
    /// </summary>
    public IReadOnlyList<MatchRecord> GetRecentMatches(TimeSpan duration)
    {
        var cutoff = DateTime.UtcNow - duration;
        return _matches.Where(m => m.DateUtc >= cutoff).ToList();
    }

    /// <summary>
    /// Gets matches played on a specific map.
    /// </summary>
    public IReadOnlyList<MatchRecord> GetMatchesOnMap(string mapName)
    {
        return _matches
            .Where(m => m.MapName.Equals(mapName, StringComparison.OrdinalIgnoreCase))
            .ToList();
    }

    /// <summary>
    /// Gets matches against a specific race.
    /// </summary>
    public IReadOnlyList<MatchRecord> GetMatchesVsRace(Race race)
    {
        return _matches
            .Where(m => m.OpponentRace?.Type == race.Type)
            .ToList();
    }

    /// <summary>
    /// Calculates current win streak or loss streak.
    /// </summary>
    public (int count, bool isWinStreak) GetCurrentStreak()
    {
        if (!_matches.Any())
            return (0, false);

        var mostRecent = _matches.First();
        var isWinStreak = mostRecent.Won;
        var count = 1;

        for (int i = 1; i < _matches.Count; i++)
        {
            if (_matches[i].Won == isWinStreak)
                count++;
            else
                break;
        }

        return (count, isWinStreak);
    }

    /// <summary>
    /// Gets formatted streak string (e.g., "W5" or "L3").
    /// </summary>
    public string GetStreakString()
    {
        var (count, isWin) = GetCurrentStreak();
        return count > 0 ? $"{(isWin ? "W" : "L")}{count}" : "N/A";
    }

    /// <summary>
    /// Calculates win rate for a specific time period.
    /// </summary>
    public double GetWinRate(TimeSpan duration)
    {
        var recentMatches = GetRecentMatches(duration);
        if (!recentMatches.Any())
            return 0;

        var wins = recentMatches.Count(m => m.Won);
        return wins * 100.0 / recentMatches.Count;
    }

    /// <summary>
    /// Gets win rate against a specific race.
    /// </summary>
    public double GetWinRateVsRace(Race race)
    {
        var matchesVsRace = GetMatchesVsRace(race);
        if (!matchesVsRace.Any())
            return 0;

        var wins = matchesVsRace.Count(m => m.Won);
        return wins * 100.0 / matchesVsRace.Count;
    }

    /// <summary>
    /// Gets favorite map (most played).
    /// </summary>
    public string? GetFavoriteMap()
    {
        return _matches
            .GroupBy(m => m.MapName)
            .OrderByDescending(g => g.Count())
            .FirstOrDefault()
            ?.Key;
    }

    /// <summary>
    /// Gets win rate on a specific map.
    /// </summary>
    public double GetWinRateOnMap(string mapName)
    {
        var matchesOnMap = GetMatchesOnMap(mapName);
        if (!matchesOnMap.Any())
            return 0;

        var wins = matchesOnMap.Count(m => m.Won);
        return wins * 100.0 / matchesOnMap.Count;
    }
}
