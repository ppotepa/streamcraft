using Microsoft.AspNetCore.Http;
using StreamCraft.Core.Bits;
using System.Text.Json;

namespace StreamCraft.Bits.Sc2;

[BitRoute("/sc2")]
[HasUserInterface]
public class Sc2Bit : StreamBit<Sc2BitState>
{
    public override string Name => "SC2";
    public override string Description => "StarCraft II overlay and statistics";

    public override async Task HandleAsync(HttpContext httpContext)
    {
        var stateSnapshot = new
        {
            // Panel 1: Live Metric (Heart Rate)
            metric = new
            {
                value = State.HeartRate,
                timestampUtc = State.HeartRateTimestamp?.ToString("O"),
                units = "bpm"
            },

            // Panel 2: Session Summary
            session = new
            {
                contextTag = State.Matchup,
                opponentName = State.OpponentName,
                rankLabel = State.RankLabel,
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
                    stat1Value = State.Games > 0 ? $"{(State.Wins * 100 / State.Games)}%" : "N/A",
                    stat2Label = "Avg Duration",
                    stat2Value = "12:34",
                    stat3Label = "Peak MMR",
                    stat3Value = "4500"
                }
            },

            // Panel 3: Entity Summary (Opponent)
            entity = new
            {
                summaryLine1 = new[] { State.OpponentMMR, State.OpponentRank, State.OpponentRace },
                summaryLine2 = new[] { State.OpponentTodayRecord, State.OpponentSeasonRecord, State.OpponentLeague },
                summaryLine3 = new[] { State.OpponentWinRate, State.OpponentStreak, State.OpponentFavoriteMap },
                recentItems = State.OpponentHistory.Select(m => new
                {
                    dateUtc = m.DateUtc.ToString("O"),
                    tag = m.Tag,
                    delta = m.Delta,
                    duration = m.Duration
                }).ToArray()
            },

            // Panel 4: Reserved
            panel4 = new
            {
                title = "Map",
                lines = new[] { State.CurrentMap, State.MapWinRate },
                badge = State.MapBadge
            },

            timestamp = DateTime.UtcNow
        };

        httpContext.Response.ContentType = "application/json";
        await httpContext.Response.WriteAsync(JsonSerializer.Serialize(stateSnapshot, new JsonSerializerOptions { WriteIndented = true }));
    }

    public override async Task HandleUIAsync(HttpContext httpContext)
    {
        var assemblyLocation = Path.GetDirectoryName(GetType().Assembly.Location);
        var uiPath = Path.Combine(assemblyLocation!, "ui", "index.html");

        if (File.Exists(uiPath))
        {
            httpContext.Response.ContentType = "text/html";
            await httpContext.Response.SendFileAsync(uiPath);
        }
        else
        {
            httpContext.Response.StatusCode = 404;
            await httpContext.Response.WriteAsync($"UI file not found at: {uiPath}");
        }
    }
}
