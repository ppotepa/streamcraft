using Core.Diagnostics;
using Core.Messaging;
using Messaging.Shared;

namespace Bits.Sc2.Messages;

/// <summary>
/// Strongly-typed message for lobby parsing events.
/// Inherits from abstract Message class with composition.
/// </summary>
public class LobbyParsedMessage : Message<LobbyParsedData>
{
    public override MessageType Type => Sc2MessageType.LobbyFileParsed;

    public LobbyParsedMessage(LobbyParsedData payload) : base(payload)
    {
        // Validation in constructor
        if (string.IsNullOrWhiteSpace(payload.UserBattleTag) &&
            string.IsNullOrWhiteSpace(payload.OpponentBattleTag))
        {
            throw ExceptionFactory.InvalidOperation(
                "LobbyParsedMessage must have at least one battle tag.");
        }

        Metadata = MessageMetadata.Create("Sc2.SessionRunner");
    }

    /// <summary>
    /// Helper: Check if this is a mirror match (same user as opponent).
    /// </summary>
    public bool IsMirrorMatch() =>
        !string.IsNullOrEmpty(Payload.UserBattleTag) &&
        string.Equals(Payload.UserBattleTag, Payload.OpponentBattleTag,
            StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Helper: Check if opponent information is available.
    /// </summary>
    public bool HasOpponent() =>
        !string.IsNullOrWhiteSpace(Payload.OpponentBattleTag) ||
        !string.IsNullOrWhiteSpace(Payload.OpponentName);
}

/// <summary>
/// Strongly-typed message for metric data.
/// Simple class inheriting from abstract Message class.
/// </summary>
public class MetricDataMessage : Message<MetricData>
{
    public override MessageType Type => Sc2MessageType.MetricDataReceived;

    public MetricDataMessage(MetricData payload) : base(payload)
    {
        Metadata = MessageMetadata.Create("Sc2.MetricRunner");
    }

    /// <summary>
    /// Helper: Check if metric data is recent (within last 5 seconds).
    /// </summary>
    public bool IsRecent() =>
        (DateTime.UtcNow - Metadata.Timestamp).TotalSeconds < 5;

    /// <summary>
    /// Helper: Check if metric indicates elevated heart rate.
    /// </summary>
    public bool IsElevated() => Payload.Value > 100;
}
