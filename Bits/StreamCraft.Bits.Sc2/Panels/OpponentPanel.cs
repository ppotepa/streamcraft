using StreamCraft.Bits.Sc2.Messaging;
using StreamCraft.Core.Panels;

namespace StreamCraft.Bits.Sc2.Panels;

public class OpponentPanelState
{
    public string? OpponentBattleTag { get; set; }
    public string? OpponentName { get; set; }
    public string? OpponentMMR { get; set; }
    public string? OpponentRank { get; set; }
    public string? OpponentRace { get; set; }
    public string? OpponentTodayRecord { get; set; }
    public string? OpponentSeasonRecord { get; set; }
    public string? OpponentLeague { get; set; }
    public string? OpponentWinRate { get; set; }
    public string? OpponentStreak { get; set; }
    public string? OpponentFavoriteMap { get; set; }
    public List<MatchRecord> OpponentHistory { get; set; } = new();
}

public class OpponentPanel : Panel<OpponentPanelState, Sc2MessageType>
{

    public override string Type => "intel";

    protected override void RegisterHandlers()
    {
        MessageBus.Subscribe<LobbyParsedData>(Sc2MessageType.LobbyFileParsed, OnLobbyParsed);
        MessageBus.Subscribe<string>(Sc2MessageType.ToolStateChanged, OnToolStateChanged);
    }

    private void OnLobbyParsed(LobbyParsedData data)
    {
        lock (StateLock)
        {
            if (!string.IsNullOrWhiteSpace(data.OpponentBattleTag))
            {
                State.OpponentBattleTag = data.OpponentBattleTag;
            }

            if (!string.IsNullOrWhiteSpace(data.OpponentName))
            {
                State.OpponentName = data.OpponentName;
            }

            UpdateLastModified();
        }

        // Emit derived event for downstream panels
        if (!string.IsNullOrWhiteSpace(data.OpponentBattleTag))
        {
            MessageBus.Publish(Sc2MessageType.OpponentIdentified, data.OpponentBattleTag);
        }
    }

    private void OnToolStateChanged(string toolState)
    {
        if (toolState == "Disconnected")
        {
            lock (StateLock)
            {
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
            };
        }
    }
}
