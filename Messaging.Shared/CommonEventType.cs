namespace Messaging.Shared;

/// <summary>
/// Defines common event types that can be used across all bits for cross-bit communication.
/// Provides static MessageType instances for standardized events.
/// </summary>
public static class CommonEventType
{
    private const string Category = "Common";

    // Application lifecycle
    public static readonly MessageType ApplicationStarted = MessageType.Create(Category, nameof(ApplicationStarted));
    public static readonly MessageType ApplicationStopped = MessageType.Create(Category, nameof(ApplicationStopped));

    // User identification and presence
    public static readonly MessageType UserIdentified = MessageType.Create(Category, nameof(UserIdentified));
    public static readonly MessageType UserPresenceChanged = MessageType.Create(Category, nameof(UserPresenceChanged));

    // Match/game lifecycle
    public static readonly MessageType MatchStarted = MessageType.Create(Category, nameof(MatchStarted));
    public static readonly MessageType MatchEnded = MessageType.Create(Category, nameof(MatchEnded));
    public static readonly MessageType MatchDataUpdated = MessageType.Create(Category, nameof(MatchDataUpdated));

    // Tool/integration state
    public static readonly MessageType ToolConnected = MessageType.Create(Category, nameof(ToolConnected));
    public static readonly MessageType ToolDisconnected = MessageType.Create(Category, nameof(ToolDisconnected));
    public static readonly MessageType ToolStateChanged = MessageType.Create(Category, nameof(ToolStateChanged));

    // Data flow events
    public static readonly MessageType DataReceived = MessageType.Create(Category, nameof(DataReceived));
    public static readonly MessageType DataParsed = MessageType.Create(Category, nameof(DataParsed));
    public static readonly MessageType ParsingError = MessageType.Create(Category, nameof(ParsingError));

    // UI events
    public static readonly MessageType UIOpened = MessageType.Create(Category, nameof(UIOpened));
    public static readonly MessageType UIInteraction = MessageType.Create(Category, nameof(UIInteraction));
    public static readonly MessageType ConfigurationChanged = MessageType.Create(Category, nameof(ConfigurationChanged));

    // System events
    public static readonly MessageType ErrorOccurred = MessageType.Create(Category, nameof(ErrorOccurred));
    public static readonly MessageType WarningIssued = MessageType.Create(Category, nameof(WarningIssued));
}
