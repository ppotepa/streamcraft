using Messaging.Shared;

namespace Bits.Sc2.Messages;

public class VitalsData
{
    public int? HeartRate { get; set; }
    public DateTime? TimestampUtc { get; set; }
    public bool HasSignal { get; set; }
}

public enum Sc2ToolState
{
    Sc2ProcessNotFound,
    InMenus,
    LobbyDetected
}

public sealed class ToolStateChanged
{
    public ToolStateChanged(Sc2ToolState state)
    {
        State = state;
        TimestampUtc = DateTime.UtcNow;
    }

    public Sc2ToolState State { get; }
    public DateTime TimestampUtc { get; }
}

/// <summary>
/// SC2-specific message types for bit communication.
/// </summary>
public static class Sc2MessageType
{
    private const string Category = "Sc2";

    // Lobby file parsing
    public static readonly MessageType LobbyFileParsed = MessageType.Create(Category, nameof(LobbyFileParsed));
    public static readonly MessageType GameDataReceived = MessageType.Create(Category, nameof(GameDataReceived));

    // Data updates
    public static readonly MessageType MetricDataReceived = MessageType.Create(Category, nameof(MetricDataReceived));
    public static readonly MessageType PlayerDataReceived = MessageType.Create(Category, nameof(PlayerDataReceived));
    public static readonly MessageType OpponentDataReceived = MessageType.Create(Category, nameof(OpponentDataReceived));

    // State changes
    public static readonly MessageType ToolStateChanged = MessageType.Create(Category, nameof(ToolStateChanged));

    // ISS tracking
    public static readonly MessageType ISSPositionUpdated = MessageType.Create(Category, nameof(ISSPositionUpdated));
    public static readonly MessageType ISSCrewUpdated = MessageType.Create(Category, nameof(ISSCrewUpdated));

    // Vitals/Health data
    public static readonly MessageType VitalsDataReceived = MessageType.Create(Category, nameof(VitalsDataReceived));
}
