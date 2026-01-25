using StreamCraft.Core.Bits;

namespace StreamCraft.Bits.Sc2;

public class Sc2BitState : IBitState
{
    // Tool state
    public string ToolState { get; set; } = "Disconnected"; // Disconnected|InMenus|LobbyDetected|InGame
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    // Player identity
    public string? UserBattleTag { get; set; }
    public string? UserName { get; set; }
    public string? OpponentBattleTag { get; set; }
    public string? OpponentName { get; set; }

    // Match info
    public string? Matchup { get; set; } // e.g. "TvZ"

    // Panel 1: Live Metric
    public int? HeartRate { get; set; } = 72;
    public DateTime? HeartRateTimestamp { get; set; } = DateTime.UtcNow;

    // Panel 2: Session Summary
    public string RankLabel { get; set; } = "#2210 of 30000";
    public int Wins { get; set; } = 12;
    public int Games { get; set; } = 20;
    public int Losses { get; set; } = 8;
    public List<MatchRecord> RecentMatches { get; set; } = new();

    // Panel 3: Entity Summary (Opponent)
    public string OpponentMMR { get; set; } = "4200 MMR";
    public string OpponentRank { get; set; } = "Master 1";
    public string OpponentRace { get; set; } = "Zerg";
    public string OpponentTodayRecord { get; set; } = "Today: 5-2";
    public string OpponentSeasonRecord { get; set; } = "Season: 123-89";
    public string OpponentLeague { get; set; } = "M1";
    public string OpponentWinRate { get; set; } = "58% WR";
    public string OpponentStreak { get; set; } = "W3";
    public string OpponentFavoriteMap { get; set; } = "Favorite: Goldenaura";
    public List<MatchRecord> OpponentHistory { get; set; } = new();

    // Panel 4: Reserved
    public string CurrentMap { get; set; } = "Goldenaura LE";
    public string MapWinRate { get; set; } = "65% Win Rate";
    public string? MapBadge { get; set; } = "Favorite";
}

public class MatchRecord
{
    public DateTime DateUtc { get; set; }
    public string Tag { get; set; } = string.Empty;
    public int? Delta { get; set; }
    public string? Duration { get; set; }
}
