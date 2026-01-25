using StreamCraft.Bits.Sc2.Messaging;
using StreamCraft.Core.Panels;

namespace StreamCraft.Bits.Sc2.Panels;

public class SessionPanelState
{
    public string? UserBattleTag { get; set; }
    public string? UserName { get; set; }
    public string? RankLabel { get; set; }
    public int Wins { get; set; }
    public int Games { get; set; }
    public int Losses { get; set; }
    public List<MatchRecord> RecentMatches { get; set; } = new();
}

public class SessionPanel : Panel<SessionPanelState, Sc2MessageType>
{
    public override string Type => "stats";

    protected override void RegisterHandlers()
    {
        MessageBus.Subscribe<LobbyParsedData>(Sc2MessageType.LobbyFileParsed, OnLobbyParsed);
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

            UpdateLastModified();
        }

        // Emit derived event
        if (!string.IsNullOrWhiteSpace(data.UserBattleTag))
        {
            MessageBus.Publish(Sc2MessageType.UserIdentified, data.UserBattleTag);
        }
    }

    private void OnToolStateChanged(string toolState)
    {
        if (toolState == "Disconnected")
        {
            lock (StateLock)
            {
                State.UserBattleTag = null;
                State.UserName = null;
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
                contextTag = State.UserBattleTag,
                opponentName = State.UserName,
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
            };
        }
    }
}
