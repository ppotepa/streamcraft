using Bits.Sc2.Messages;
using Core.Panels;

namespace Bits.Sc2.Panels;

public class SessionPanelState
{
    public string? UserBattleTag { get; set; }
    public string? UserName { get; set; }
    public string? OpponentName { get; set; }
    public string? RankLabel { get; set; }
    public int Wins { get; set; }
    public int Games { get; set; }
    public int Losses { get; set; }
    public List<MatchRecord> RecentMatches { get; set; } = new();

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
}

public class SessionPanel : Panel<SessionPanelState>
{
    public override string Type => "stats";

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

            UpdateLastModified();
        }
    }

    private void OnToolStateChanged(string toolState)
    {
        if (toolState == "Sc2ProcessNotFound" || toolState == "InMenus")
        {
            lock (StateLock)
            {
                State.UserBattleTag = null;
                State.UserName = null;
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
                contextTag = State.ClanTag != null ? $"[{State.ClanTag}] {State.UserBattleTag}" : State.UserBattleTag,
                opponentName = State.OpponentName,
                rankLabel = State.RankLabel ?? "Unranked",
                wins = State.Wins,
                games = State.Games,
                losses = State.Losses,
                recentItems = State.RecentMatches.Select(m => new
                {
                    dateUtc = m.DateUtc.ToString("O"),
                    tag = m.Tag,
                    delta = m.Delta,
                    duration = m.Duration
                }).ToArray(),
                altSlots = new
                {
                    stat1Label = "Win Rate",
                    stat1Value = State.WinRate.HasValue ? $"{State.WinRate.Value:F1}%" : (State.Games > 0 ? $"{(State.Wins * 100.0 / State.Games):F1}%" : "N/A"),
                    stat2Label = "MMR (24h)",
                    stat2Value = State.MMR.HasValue ? $"{State.MMR.Value}" + (State.RatingChange24h.HasValue ? $" ({State.RatingChange24h.Value:+#;-#;+0})" : "") : "N/A",
                    stat3Label = "Peak MMR",
                    stat3Value = State.PeakMMR?.ToString() ?? "N/A",
                    stat4Label = "Streak",
                    stat4Value = State.CurrentStreak ?? "N/A",
                    stat5Label = State.Race ?? "Race",
                    stat5Value = State.League ?? "Unranked",
                    stat6Label = "Global Rank",
                    stat6Value = State.GlobalRank.HasValue ? $"#{State.GlobalRank.Value}" : "N/A"
                }
            };
        }
    }
}
