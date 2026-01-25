namespace StreamCraft.Bits.Sc2.Messaging;

public enum Sc2MessageType
{
    // Scanner/Process events
    Sc2ProcessStarted,
    Sc2ProcessStopped,

    // Lobby file lifecycle
    LobbyFileDetected,
    LobbyFileRead,
    LobbyFileParsed,

    // Game state events
    GameSnapshotReceived,
    GameStarted,
    GameEnded,
    LobbyEntered,
    MenusEntered,

    // Entity identification
    UserIdentified,
    OpponentIdentified,
    OpponentChanged,

    // Match events
    MatchStarted,
    MatchEnded,
    MatchupCalculated,

    // Data updates
    MapDataLoaded,
    SessionStatsUpdated,
    MetricDataReceived,

    // State changes
    ToolStateChanged
}
