using Core.Messaging;
using Messaging.Shared;

namespace Bits.Sc2.Messages;

/// <summary>
/// Message containing enriched player data from SC2 Pulse API.
/// </summary>
public class PlayerDataMessage : Message<PlayerData>
{
    public override MessageType Type => Sc2MessageType.PlayerDataReceived;

    public PlayerDataMessage(PlayerData payload) : base(payload)
    {
        Metadata = MessageMetadata.Create("Sc2.PlayerDataRunner");
    }
}

/// <summary>
/// Enriched player information retrieved from SC2 Pulse.
/// </summary>
public class PlayerData
{
    public string? BattleTag { get; set; }
    public string? Name { get; set; }
    public long? CharacterId { get; set; }

    // Current Season Stats
    public int? MMR { get; set; }
    public int? PeakMMR { get; set; }
    public string? Rank { get; set; }
    public string? Race { get; set; }
    public string? League { get; set; }
    public int? LeagueType { get; set; }
    public int? GlobalRank { get; set; }
    public int? RegionRank { get; set; }

    // Games and Win Rate
    public int? Wins { get; set; }
    public int? Losses { get; set; }
    public int? TotalGamesPlayed { get; set; }
    public int? CurrentSeasonGames { get; set; }
    public double? WinRate { get; set; }

    // Pro Player Info
    public bool IsProPlayer { get; set; }
    public string? ProNickname { get; set; }
    public string? ProTeam { get; set; }

    // Clan Info
    public string? ClanTag { get; set; }
    public string? ClanName { get; set; }

    // Recent Performance
    public List<DetailedMatchRecord> RecentMatches { get; set; } = new();
    public string? FavoriteMap { get; set; }
    public double? FavoriteMapWinRate { get; set; }
    public string? CurrentStreak { get; set; }
    public int? StreakCount { get; set; }

    // 24 Hour Statistics  
    public DateTime? LastPlayedUtc { get; set; }
    public int? RatingChange24h { get; set; }
    public int? GamesLast24h { get; set; }
    public int? WinsLast24h { get; set; }

    // Race-specific Win Rates
    public double? WinRateVsTerran { get; set; }
    public double? WinRateVsProtoss { get; set; }
    public double? WinRateVsZerg { get; set; }
}

/// <summary>
/// Message containing enriched opponent data from SC2 Pulse API.
/// </summary>
public class OpponentDataMessage : Message<OpponentData>
{
    public override MessageType Type => Sc2MessageType.OpponentDataReceived;

    public OpponentDataMessage(OpponentData payload) : base(payload)
    {
        Metadata = MessageMetadata.Create("Sc2.OpponentDataRunner");
    }
}

/// <summary>
/// Enriched opponent information retrieved from SC2 Pulse.
/// </summary>
public class OpponentData
{
    public string? BattleTag { get; set; }
    public string? Name { get; set; }
    public long? CharacterId { get; set; }

    // Current Season Stats
    public int? MMR { get; set; }
    public int? PeakMMR { get; set; }
    public string? Rank { get; set; }
    public string? Race { get; set; }
    public string? League { get; set; }
    public int? LeagueType { get; set; }
    public int? GlobalRank { get; set; }
    public int? RegionRank { get; set; }

    // Games and Win Rate
    public int? Wins { get; set; }
    public int? Losses { get; set; }
    public int? TotalGamesPlayed { get; set; }
    public int? CurrentSeasonGames { get; set; }
    public double? WinRate { get; set; }

    // Pro Player Info
    public bool IsProPlayer { get; set; }
    public string? ProNickname { get; set; }
    public string? ProTeam { get; set; }

    // Clan Info
    public string? ClanTag { get; set; }
    public string? ClanName { get; set; }

    // Recent Performance
    public List<DetailedMatchRecord> RecentMatches { get; set; } = new();
    public string? FavoriteMap { get; set; }
    public double? FavoriteMapWinRate { get; set; }
    public string? CurrentStreak { get; set; }
    public int? StreakCount { get; set; }

    // 24 Hour Statistics  
    public DateTime? LastPlayedUtc { get; set; }
    public int? RatingChange24h { get; set; }
    public int? GamesLast24h { get; set; }
    public int? WinsLast24h { get; set; }

    // Race-specific Win Rates
    public double? WinRateVsTerran { get; set; }
    public double? WinRateVsProtoss { get; set; }
    public double? WinRateVsZerg { get; set; }
}

public class DetailedMatchRecord
{
    public DateTime DateUtc { get; set; }
    public string? MapName { get; set; }
    public string? OpponentName { get; set; }
    public string? OpponentRace { get; set; }
    public int? OpponentRating { get; set; }
    public bool Won { get; set; }
    public int? RatingChange { get; set; }
    public int? Duration { get; set; } // in seconds
    public string? FormattedDuration => Duration.HasValue ? FormatDuration(Duration.Value) : "--";
    public string TimeAgo => FormatTimeAgo(DateUtc);

    private static string FormatDuration(int seconds)
    {
        var span = TimeSpan.FromSeconds(seconds);
        return $"{span.Minutes:D2}:{span.Seconds:D2}";
    }

    private static string FormatTimeAgo(DateTime dateUtc)
    {
        var timeAgo = DateTime.UtcNow - dateUtc;

        if (timeAgo.TotalMinutes < 60)
            return $"{(int)timeAgo.TotalMinutes}m";
        else if (timeAgo.TotalHours < 24)
            return $"{(int)timeAgo.TotalHours}h";
        else if (timeAgo.TotalDays < 7)
            return $"{(int)timeAgo.TotalDays}d";
        else
            return dateUtc.ToString("MMM dd");
    }
}
