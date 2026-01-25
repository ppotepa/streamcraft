using StreamCraft.Bits.Sc2.Messaging;
using StreamCraft.Core.Panels;

namespace StreamCraft.Bits.Sc2.Panels;

public class MatchupPanelState
{
    public string? Matchup { get; set; }
    public string? OpponentName { get; set; }
}

public class MatchupPanel : Panel<MatchupPanelState, Sc2MessageType>
{

    public override string Type => "context";

    protected override void RegisterHandlers()
    {
        MessageBus.Subscribe<GameSnapshotData>(Sc2MessageType.GameSnapshotReceived, OnGameSnapshotReceived);
        MessageBus.Subscribe<LobbyParsedData>(Sc2MessageType.LobbyFileParsed, OnLobbyParsed);
        MessageBus.Subscribe<string>(Sc2MessageType.ToolStateChanged, OnToolStateChanged);
    }

    private void OnGameSnapshotReceived(GameSnapshotData data)
    {
        if (data.IsInGame && data.Players?.Count == 2)
        {
            var p1 = data.Players[0];
            var p2 = data.Players[1];

            if (!string.IsNullOrWhiteSpace(p1.Race) && !string.IsNullOrWhiteSpace(p2.Race))
            {
                lock (StateLock)
                {
                    State.Matchup = $"{p1.Race[0]}v{p2.Race[0]}";
                    UpdateLastModified();
                }

                MessageBus.Publish(Sc2MessageType.MatchupCalculated, State.Matchup);
            }
        }
    }

    private void OnLobbyParsed(LobbyParsedData data)
    {
        lock (StateLock)
        {
            if (!string.IsNullOrWhiteSpace(data.OpponentName))
            {
                State.OpponentName = data.OpponentName;
                UpdateLastModified();
            }
        }
    }

    private void OnToolStateChanged(string toolState)
    {
        if (toolState == "Disconnected")
        {
            lock (StateLock)
            {
                State.Matchup = null;
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
                matchup = State.Matchup,
                opponentName = State.OpponentName
            };
        }
    }
}
