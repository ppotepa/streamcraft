using Messaging.Shared;

namespace Bits.Sc2.Messages;

/// <summary>
/// SC2-specific message types for bit communication.
/// </summary>
public static class Sc2MessageType
{
    private const string Category = "Sc2";

    // Lobby file parsing
    public static readonly MessageType LobbyFileParsed = MessageType.Create(Category, nameof(LobbyFileParsed));

    // Data updates
    public static readonly MessageType MetricDataReceived = MessageType.Create(Category, nameof(MetricDataReceived));
    public static readonly MessageType PlayerDataReceived = MessageType.Create(Category, nameof(PlayerDataReceived));
    public static readonly MessageType OpponentDataReceived = MessageType.Create(Category, nameof(OpponentDataReceived));

    // State changes
    public static readonly MessageType ToolStateChanged = MessageType.Create(Category, nameof(ToolStateChanged));
}
