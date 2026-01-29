using Bits.Sc2.Messages;
using Core.Panels;

namespace Bits.Sc2.Panels;

public class MmrHistoryPoint
{
    public long Timestamp { get; set; }
    public int Rating { get; set; }
}

public class SessionPanelState
{
    public bool IsLoading { get; set; } = false;
    public string LoadingStatus { get; set; } = "Initializing SC2 Console";
    public string? UserBattleTag { get; set; }
    public string? UserName { get; set; }
    public string? OpponentName { get; set; }
    public string? RankLabel { get; set; }
    public int Wins { get; set; }
    public int Games { get; set; }
    public int Losses { get; set; }
    public List<MatchRecord> RecentMatches { get; set; } = new();
    public List<DetailedMatchRecord> DetailedMatches { get; set; } = new();

    // Enhanced player stats from SC2 Pulse
    public int? MMR { get; set; }
    public int? PeakMMR { get; set; }
    public string? Race { get; set; }
    public string? League { get; set; }
    public int? GlobalRank { get; set; }
    public int? RegionRank { get; set; }
    public double? WinRate { get; set; }
    public string? CurrentStreak { get; set; }
    public int? RatingChange24h { get; set; }
    public int? GamesLast24h { get; set; }
    public string? ClanTag { get; set; }
    public List<MmrHistoryPoint> MmrHistory { get; set; } = new();
}

public class SessionPanel : Panel<SessionPanelState>
{
    public override string Type => "sessionPanel";

    protected override void RegisterHandlers()
    {
        MessageBus.Subscribe<LobbyParsedData>(Sc2MessageType.LobbyFileParsed, OnLobbyParsed);
        MessageBus.Subscribe<PlayerData>(Sc2MessageType.PlayerDataReceived, OnPlayerDataReceived);
        MessageBus.Subscribe<string>(Sc2MessageType.ToolStateChanged, OnToolStateChanged);
    }

    private void OnLobbyParsed(LobbyParsedData data)
    {
        lock (StateLock)
        {
            if (!string.IsNullOrWhiteSpace(data.UserBattleTag))
            {
                State.UserBattleTag = data.UserBattleTag;
            }

            if (!string.IsNullOrWhiteSpace(data.UserName))
            {
                State.UserName = data.UserName;
            }

            if (!string.IsNullOrWhiteSpace(data.OpponentName))
            {
                State.OpponentName = data.OpponentName;
            }

            UpdateLastModified();
        }

    }

    private void OnPlayerDataReceived(PlayerData data)
    {
        lock (StateLock)
        {
            Console.WriteLine($"[SessionPanel] Received PlayerData: MMR={data.MMR}, Race={data.Race}, Wins={data.Wins}, Losses={data.Losses}");

            State.IsLoading = false;
            State.MMR = data.MMR;
            State.PeakMMR = data.PeakMMR;
            State.Race = data.Race;
            State.League = data.League;
            State.GlobalRank = data.GlobalRank;
            State.RegionRank = data.RegionRank;
            State.WinRate = data.WinRate;
            State.CurrentStreak = data.CurrentStreak;
            State.RatingChange24h = data.RatingChange24h;
            State.GamesLast24h = data.GamesLast24h;
            State.ClanTag = data.ClanTag;

            // Copy MMR history
            if (data.MmrHistory != null && data.MmrHistory.Count > 0)
            {
                State.MmrHistory = data.MmrHistory.Select(h => new MmrHistoryPoint
                {
                    Timestamp = h.Timestamp,
                    Rating = h.Rating
                }).ToList();
            }

            if (data.Wins.HasValue)
                State.Wins = data.Wins.Value;

            if (data.Losses.HasValue)
                State.Losses = data.Losses.Value;

            State.Games = State.Wins + State.Losses;

            // Update rank label with detailed info
            if (data.GlobalRank.HasValue && data.League != null)
            {
                State.RankLabel = $"{data.League} #{data.GlobalRank.Value}";
            }
            else if (data.League != null)
            {
                State.RankLabel = data.League;
            }

            // Convert recent matches
            State.RecentMatches = data.RecentMatches?.Take(10).Select(m => new MatchRecord
            {
                DateUtc = m.DateUtc,
                Tag = m.Won ? "W" : "L",
                Delta = m.RatingChange.HasValue ? (m.RatingChange.Value >= 0 ? $"+{m.RatingChange.Value}" : m.RatingChange.Value.ToString()) : "--",
                Duration = m.FormattedDuration ?? "--:--"
            }).ToList() ?? new List<MatchRecord>();

            // Store detailed matches for match history screen
            State.DetailedMatches = data.RecentMatches?.Take(10).ToList() ?? new List<DetailedMatchRecord>();

            UpdateLastModified();
        }
    }

    private void OnToolStateChanged(string toolState)
    {
        if (toolState == "Sc2ProcessNotFound" || toolState == "InMenus")
        {
            lock (StateLock)
            {
                // Don't set IsLoading to true - we want to keep showing player stats
                // Only clear current match-specific data
                State.OpponentName = null;
                UpdateLastModified();
            }
        }
    }

    public override object GetStateSnapshot()
    {
        lock (StateLock)
        {
            return new
            {
                isLoading = State.IsLoading,
                loadingStatus = State.LoadingStatus,
                sessionContextTag = State.ClanTag != null ? $"[{State.ClanTag}]" : null,
                sessionOpponentName = State.OpponentName,
                sessionRankLabel = State.RankLabel ?? "Unranked",
                wins = State.Wins,
                games = State.Games,
                losses = State.Losses,

                // Player information
                playerInfo = new
                {
                    name = State.UserName ?? State.UserBattleTag ?? "Player",
                    battleTag = State.UserBattleTag ?? "--",
                    mmr = State.MMR.HasValue ? $"MMR: {State.MMR.Value}" : "--",
                    rank = State.RankLabel ?? "Unranked"
                },

                // 24-hour performance stats
                performance24h = new
                {
                    ratingChange = State.RatingChange24h.HasValue ? $"24h: {State.RatingChange24h.Value:+#;-#;+0}" : "--",
                    games = State.GamesLast24h.HasValue ? $"Games: {State.GamesLast24h.Value}" : "--",
                    wins = State.Wins > 0 ? $"Wins: {State.Wins}" : "--"
                },

                // Season statistics
                seasonStats = new
                {
                    race = State.Race ?? "Random",
                    totalGames = State.Games > 0 ? $"Total: {State.Games}" : "--",
                    winRate = State.WinRate.HasValue ? $"{State.WinRate.Value:F1}% WR" : (State.Games > 0 ? $"{(State.Wins * 100.0 / State.Games):F1}% WR" : "--")
                },

                // Career achievements
                careerStats = new
                {
                    league = State.League ?? "--",
                    peakMMR = State.PeakMMR.HasValue ? $"Peak: {State.PeakMMR.Value}" : "--",
                    currentStreak = State.CurrentStreak ?? "--"
                },

                recentItems = State.DetailedMatches.Select(m => new
                {
                    timeAgo = GetTimeAgo(m.DateUtc),
                    vsPlayerName = m.OpponentName ?? "Unknown",
                    vsRace = m.OpponentRace ?? "?",
                    pointsChange = m.RatingChange.HasValue ? (m.RatingChange.Value >= 0 ? $"+{m.RatingChange.Value}" : m.RatingChange.Value.ToString()) : "--",
                    duration = m.FormattedDuration ?? "--:--",
                    result = m.Won ? "Win" : "Loss"
                }).ToArray(),
                userMatchHistory = State.DetailedMatches.Select(m => new
                {
                    timeAgo = GetTimeAgo(m.DateUtc),
                    vsPlayerName = m.OpponentName ?? "Unknown",
                    vsRace = m.OpponentRace ?? "?",
                    myRace = State.Race ?? null,
                    pointsChange = m.RatingChange.HasValue ? (m.RatingChange.Value >= 0 ? $"+{m.RatingChange.Value}" : m.RatingChange.Value.ToString()) : "--",
                    duration = m.FormattedDuration ?? "--:--",
                    result = m.Won ? "Win" : "Loss"
                }).ToArray(),
                mmrHistory = State.MmrHistory.Select(h => new
                {
                    timestamp = h.Timestamp,
                    rating = h.Rating
                }).ToArray(),
                altSlots = new[]
                {
                    new { label = "Win Rate", value = State.WinRate.HasValue ? $"{State.WinRate.Value:F1}%" : (State.Games > 0 ? $"{(State.Wins * 100.0 / State.Games):F1}%" : "N/A") },
                    new { label = "MMR (24h)", value = State.MMR.HasValue ? $"{State.MMR.Value}" + (State.RatingChange24h.HasValue ? $" ({State.RatingChange24h.Value:+#;-#;+0})" : "") : "N/A" },
                    new { label = "Peak MMR", value = State.PeakMMR?.ToString() ?? "N/A" },
                    new { label = "Streak", value = State.CurrentStreak ?? "N/A" },
                    new { label = State.Race ?? "Race", value = State.League ?? "Unranked" },
                    new { label = "Global Rank", value = State.GlobalRank.HasValue ? $"#{State.GlobalRank.Value}" : "N/A" }
                }
            };
        }
    }

    private static string GetTimeAgo(DateTime dateUtc)
    {
        var timeAgo = DateTime.UtcNow - dateUtc;

        if (timeAgo.TotalMinutes < 60)
            return $"{(int)timeAgo.TotalMinutes}m";
        else if (timeAgo.TotalHours < 24)
            return $"{(int)timeAgo.TotalHours}h";
        else
            return $"{(int)timeAgo.TotalDays}d";
    }
}
