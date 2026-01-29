using Bits.Sc2.Domain.ValueObjects;

namespace Bits.Sc2.Domain.Entities;

/// <summary>
/// Aggregate root representing a player's profile with statistics and history.
/// </summary>
public class PlayerProfile
{
    public BattleTag BattleTag { get; private set; }
    public string? DisplayName { get; private set; }
    public long? CharacterId { get; private set; }
    public Race? PrimaryRace { get; private set; }
    public Mmr? CurrentMmr { get; private set; }
    public Mmr? PeakMmr { get; private set; }
    public int? GlobalRank { get; private set; }
    public int? RegionRank { get; private set; }
    public int TotalGamesPlayed { get; private set; }
    public int CurrentSeasonGames { get; private set; }
    public int? Wins { get; private set; }
    public int? Losses { get; private set; }
    public double? WinRate { get; private set; }
    public bool IsProPlayer { get; private set; }
    public string? ProNickname { get; private set; }
    public string? ProTeam { get; private set; }
    public string? ClanTag { get; private set; }
    public string? ClanName { get; private set; }
    public DateTime? LastPlayedUtc { get; private set; }
    public DateTime CreatedUtc { get; private set; }
    public DateTime UpdatedUtc { get; private set; }

    private PlayerProfile()
    {
        CreatedUtc = DateTime.UtcNow;
        UpdatedUtc = DateTime.UtcNow;
        BattleTag = null!; // Will be set by factory method
    }

    /// <summary>
    /// Creates a new player profile.
    /// </summary>
    public static PlayerProfile Create(BattleTag battleTag, string? displayName = null)
    {
        if (battleTag == null)
            throw new ArgumentNullException(nameof(battleTag));

        return new PlayerProfile
        {
            BattleTag = battleTag,
            DisplayName = displayName ?? battleTag.GetDisplayName()
        };
    }

    /// <summary>
    /// Updates basic player information.
    /// </summary>
    public void UpdateBasicInfo(long? characterId, Race? primaryRace)
    {
        CharacterId = characterId;
        PrimaryRace = primaryRace;
        UpdatedUtc = DateTime.UtcNow;
    }

    /// <summary>
    /// Updates MMR and ranking information.
    /// </summary>
    public void UpdateRanking(Mmr? currentMmr, Mmr? peakMmr, int? globalRank, int? regionRank)
    {
        CurrentMmr = currentMmr;

        if (peakMmr != null && (PeakMmr == null || peakMmr > PeakMmr))
        {
            PeakMmr = peakMmr;
        }

        GlobalRank = globalRank;
        RegionRank = regionRank;
        UpdatedUtc = DateTime.UtcNow;
    }

    /// <summary>
    /// Updates game statistics.
    /// </summary>
    public void UpdateStatistics(int totalGames, int currentSeasonGames, int? wins, int? losses)
    {
        TotalGamesPlayed = totalGames;
        CurrentSeasonGames = currentSeasonGames;
        Wins = wins;
        Losses = losses;

        if (wins.HasValue && losses.HasValue)
        {
            var total = wins.Value + losses.Value;
            WinRate = total > 0 ? wins.Value * 100.0 / total : null;
        }

        UpdatedUtc = DateTime.UtcNow;
    }

    /// <summary>
    /// Updates pro player information.
    /// </summary>
    public void UpdateProInfo(bool isProPlayer, string? proNickname = null, string? proTeam = null)
    {
        IsProPlayer = isProPlayer;
        ProNickname = proNickname;
        ProTeam = proTeam;
        UpdatedUtc = DateTime.UtcNow;
    }

    /// <summary>
    /// Updates clan information.
    /// </summary>
    public void UpdateClanInfo(string? clanTag, string? clanName)
    {
        ClanTag = clanTag;
        ClanName = clanName;
        UpdatedUtc = DateTime.UtcNow;
    }

    /// <summary>
    /// Records when the player last played.
    /// </summary>
    public void UpdateLastPlayed(DateTime lastPlayedUtc)
    {
        LastPlayedUtc = lastPlayedUtc;
        UpdatedUtc = DateTime.UtcNow;
    }

    /// <summary>
    /// Checks if the profile data is stale and needs refreshing.
    /// </summary>
    public bool IsStale(TimeSpan maxAge)
    {
        return DateTime.UtcNow - UpdatedUtc > maxAge;
    }

    /// <summary>
    /// Gets a summary string of the player's current standing.
    /// </summary>
    public string GetSummary()
    {
        var parts = new List<string>();

        if (CurrentMmr != null)
        {
            parts.Add($"{CurrentMmr.GetFormattedLeague()} ({CurrentMmr.Rating} MMR)");
        }

        if (GlobalRank.HasValue)
        {
            parts.Add($"Rank #{GlobalRank}");
        }

        if (WinRate.HasValue)
        {
            parts.Add($"{WinRate:F1}% WR");
        }

        return parts.Any() ? string.Join(" | ", parts) : "Unranked";
    }

    /// <summary>
    /// Checks if this player is ranked higher than another player.
    /// </summary>
    public bool IsRankedHigherThan(PlayerProfile other)
    {
        if (CurrentMmr == null || other.CurrentMmr == null)
            return false;

        return CurrentMmr > other.CurrentMmr;
    }
}
