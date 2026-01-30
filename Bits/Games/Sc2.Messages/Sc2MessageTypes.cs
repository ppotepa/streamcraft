namespace Sc2.Messages;

/// <summary>
/// Message type constants for SC2 bit communication.
/// Other bits can subscribe to these messages to react to SC2 events.
/// </summary>
public static class Sc2MessageTypes
{
    /// <summary>
    /// Published when player stats are fetched from SC2 Pulse API.
    /// Payload: PlayerStatsPayload
    /// </summary>
    public const string PlayerStatsUpdated = "sc2.player.stats.updated";

    /// <summary>
    /// Published when lobby file is parsed and opponent detected.
    /// Payload: LobbyParsedPayload
    /// </summary>
    public const string LobbyParsed = "sc2.lobby.parsed";

    /// <summary>
    /// Published when opponent stats are fetched.
    /// Payload: OpponentStatsPayload
    /// </summary>
    public const string OpponentStatsUpdated = "sc2.opponent.stats.updated";

    /// <summary>
    /// Published when session state changes (wins/losses).
    /// Payload: SessionStatePayload
    /// </summary>
    public const string SessionStateUpdated = "sc2.session.state.updated";
}
