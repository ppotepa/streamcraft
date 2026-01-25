using StreamCraft.Bits.Sc2.Messaging;
using StreamCraft.Core.Panels;

namespace StreamCraft.Bits.Sc2.Panels;

public class MapPanelState
{
    public string? CurrentMap { get; set; }
    public string? MapWinRate { get; set; }
    public string? MapBadge { get; set; }
}

public class MapPanel : Panel<MapPanelState, Sc2MessageType>
{

    public override string Type => "context";

    protected override void RegisterHandlers()
    {
        MessageBus.Subscribe<string>(Sc2MessageType.ToolStateChanged, OnToolStateChanged);
    }

    private void OnToolStateChanged(string toolState)
    {
        if (toolState == "Disconnected")
        {
            lock (StateLock)
            {
                State.CurrentMap = null;
                State.MapWinRate = null;
                State.MapBadge = null;
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
                title = "Map",
                lines = new[] { State.CurrentMap, State.MapWinRate },
                badge = State.MapBadge
            };
        }
    }
}
