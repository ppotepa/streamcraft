using Bits.Sc2.Messages;
using Core.Panels;

namespace Bits.Sc2.Panels;

public class OpponentPanelState
{
    public bool IsLoading { get; set; } = true;
    public string LoadingStatus { get; set; } = "Waiting for match data";

    // Row 1: Name, BattleTag, MMR, Rank
    public string? OpponentBattleTag { get; set; }
    public string? OpponentName { get; set; }
    public string? OpponentMMR { get; set; }
    public string? OpponentRank { get; set; }

    // Matchup information
    public string? UserRace { get; set; }
    public string? OpponentRace { get; set; }
    public string? Matchup { get; set; }
    public double GameTime { get; set; }

    // Row 2: 24h Statistics  
    public string? MMRChange24h { get; set; }
    public string? GamesLast24h { get; set; }
    public string? WinsLast24h { get; set; }

    // Row 3: Season Statistics
    public string? CurrentSeasonGames { get; set; }
    public string? OpponentWinRate { get; set; }

    // Row 4: Race-specific Win Rates
    public string? WinRateVsTerran { get; set; }
    public string? WinRateVsProtoss { get; set; }
    public string? WinRateVsZerg { get; set; }

    // Legacy fields (for compatibility)
    public string? OpponentTodayRecord { get; set; }
    public string? OpponentSeasonRecord { get; set; }
    public string? OpponentLeague { get; set; }
    public string? OpponentStreak { get; set; }
    public string? OpponentFavoriteMap { get; set; }
    public List<DetailedMatchRecord> OpponentHistory { get; set; } = new();
    public List<MmrHistoryPoint> MmrHistory { get; set; } = new();
}

public class OpponentPanel : Panel<OpponentPanelState>
{

    public override string Type => "opponentPanel";

    protected override void RegisterHandlers()
    {
        MessageBus.Subscribe<LobbyParsedData>(Sc2MessageType.LobbyFileParsed, OnLobbyParsed);
        MessageBus.Subscribe<LobbyParsedData>(Sc2MessageType.GameDataReceived, OnGameDataReceived);
        MessageBus.Subscribe<OpponentData>(Sc2MessageType.OpponentDataReceived, OnOpponentDataReceived);
        MessageBus.Subscribe<ToolStateChanged>(Sc2MessageType.ToolStateChanged, OnToolStateChanged);
    }

    private void OnLobbyParsed(LobbyParsedData data)
    {
        lock (StateLock)
        {
            State.IsLoading = false;
            if (!string.IsNullOrWhiteSpace(data.OpponentBattleTag))
            {
                State.OpponentBattleTag = data.OpponentBattleTag;
            }

            if (!string.IsNullOrWhiteSpace(data.OpponentName))
            {
                State.OpponentName = data.OpponentName;
            }

            State.UserRace = data.UserRace;
            State.OpponentRace = data.OpponentRace;
            State.GameTime = data.GameTime;

            // Build matchup string (e.g., "TvZ", "PvT", "ZvP")
            if (!string.IsNullOrWhiteSpace(data.UserRace) && !string.IsNullOrWhiteSpace(data.OpponentRace))
            {
                var userShort = data.UserRace.Substring(0, 1).ToUpper();
                var oppShort = data.OpponentRace.Substring(0, 1).ToUpper();
                State.Matchup = $"{userShort}v{oppShort}";
            }

            UpdateLastModified();
        }

    }

    private void OnGameDataReceived(LobbyParsedData data)
    {
        lock (StateLock)
        {
            State.IsLoading = false;
            State.UserRace = data.UserRace;
            State.OpponentRace = data.OpponentRace;
            State.GameTime = data.GameTime;

            // Build matchup string (e.g., "TvZ", "PvT", "ZvP")
            if (!string.IsNullOrWhiteSpace(data.UserRace) && !string.IsNullOrWhiteSpace(data.OpponentRace))
            {
                var userShort = data.UserRace.Substring(0, 1).ToUpper();
                var oppShort = data.OpponentRace.Substring(0, 1).ToUpper();
                State.Matchup = $"{userShort}v{oppShort}";
            }

            UpdateLastModified();
        }
    }

    private void OnOpponentDataReceived(OpponentData data)
    {
        lock (StateLock)
        {
            State.IsLoading = false;

            // Row 1: Name, BattleTag, MMR, Rank
            State.OpponentBattleTag = data.BattleTag;
            State.OpponentName = data.Name;
            State.OpponentMMR = data.MMR?.ToString();
            State.OpponentRank = data.Rank;

            // Row 2: 24h Statistics
            State.MMRChange24h = data.RatingChange24h.HasValue ?
                (data.RatingChange24h > 0 ? $"+{data.RatingChange24h}" : data.RatingChange24h.ToString()) : "--";
            State.GamesLast24h = data.GamesLast24h?.ToString() ?? "0";
            State.WinsLast24h = data.WinsLast24h?.ToString() ?? "0";

            // Row 3: Season Statistics
            State.OpponentRace = data.Race;
            State.CurrentSeasonGames = data.CurrentSeasonGames?.ToString();
            State.OpponentWinRate = data.WinRate.HasValue ? $"{data.WinRate.Value:F1}%" : null;

            // Row 4: Race-specific Win Rates  
            State.WinRateVsTerran = data.WinRateVsTerran.HasValue ? $"{data.WinRateVsTerran.Value:F1}%" : "--";
            State.WinRateVsProtoss = data.WinRateVsProtoss.HasValue ? $"{data.WinRateVsProtoss.Value:F1}%" : "--";
            State.WinRateVsZerg = data.WinRateVsZerg.HasValue ? $"{data.WinRateVsZerg.Value:F1}%" : "--";

            // Legacy fields for compatibility
            State.OpponentLeague = data.League;
            if (data.Wins.HasValue && data.Losses.HasValue)
            {
                State.OpponentSeasonRecord = $"{data.Wins}W - {data.Losses}L";
            }

            // Calculate streak from recent matches
            if (data.RecentMatches.Any())
            {
                int streak = CalculateStreak(data.RecentMatches);
                State.OpponentStreak = streak > 0 ? $"+{streak}" : streak.ToString();
            }

            State.OpponentHistory = data.RecentMatches;

            // Copy MMR history
            if (data.MmrHistory != null && data.MmrHistory.Count > 0)
            {
                State.MmrHistory = data.MmrHistory.Select(h => new MmrHistoryPoint
                {
                    Timestamp = h.Timestamp,
                    Rating = h.Rating
                }).ToList();
            }

            UpdateLastModified();
        }
    }

    private int CalculateStreak(List<DetailedMatchRecord> matches)
    {
        if (!matches.Any()) return 0;

        var firstResult = matches[0].Won;
        int streak = 0;

        foreach (var match in matches)
        {
            if (match.Won == firstResult)
                streak += firstResult ? 1 : -1;
            else
                break;
        }

        return streak;
    }

    private void OnToolStateChanged(ToolStateChanged toolState)
    {
        if (toolState.State == Sc2ToolState.Sc2ProcessNotFound || toolState.State == Sc2ToolState.InMenus)
        {
            lock (StateLock)
            {
                State.IsLoading = true;
                State.LoadingStatus = toolState.State == Sc2ToolState.Sc2ProcessNotFound ? "Waiting for SC2 Process" : "Waiting for match data";
                State.OpponentBattleTag = null;
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

                // Matchup information
                matchup = State.Matchup,
                userRace = State.UserRace,
                opponentRace = State.OpponentRace,
                gameTime = State.GameTime,

                // Opponent information
                opponentInfo = new
                {
                    name = State.OpponentName,
                    battleTag = State.OpponentBattleTag,
                    mmr = State.OpponentMMR,
                    rank = State.OpponentRank
                },

                // 24-hour performance stats
                performance24h = new
                {
                    mmrChange = State.MMRChange24h,
                    games = State.GamesLast24h,
                    wins = State.WinsLast24h
                },

                // Season statistics
                seasonStats = new
                {
                    race = State.OpponentRace,
                    totalGames = State.CurrentSeasonGames,
                    winRate = State.OpponentWinRate
                },

                // Matchup win rates
                matchupWinRates = new
                {
                    vsTerran = State.WinRateVsTerran,
                    vsProtoss = State.WinRateVsProtoss,
                    vsZerg = State.WinRateVsZerg
                },

                // Enhanced match history format: [time ago] [vs Player] [vs Race] [Points +/-] [duration] [Win/Loss]
                matchHistory = State.OpponentHistory.Select(m => new
                {
                    timeAgo = m.TimeAgo,
                    vsPlayerName = m.OpponentName ?? "Unknown",
                    vsRace = m.OpponentRace ?? "?",
                    myRace = State.OpponentRace ?? null,
                    pointsChange = m.RatingChange.HasValue ?
                        (m.RatingChange > 0 ? $"+{m.RatingChange}" : m.RatingChange.ToString()) : "--",
                    duration = m.FormattedDuration ?? "--",
                    result = m.Won ? "WIN" : "LOSS",
                    mapName = m.MapName
                }).ToArray(),

                // MMR History
                mmrHistory = State.MmrHistory.Select(h => new
                {
                    timestamp = h.Timestamp,
                    rating = h.Rating
                }).ToArray(),

                // Legacy format for backward compatibility
                summaryLine1 = new[] { State.OpponentMMR, State.OpponentRank, State.OpponentRace },
                summaryLine2 = new[] { State.OpponentTodayRecord, State.OpponentSeasonRecord, State.OpponentLeague },
                summaryLine3 = new[] { State.OpponentWinRate, State.OpponentStreak, State.OpponentFavoriteMap }
            };
        }
    }
}
