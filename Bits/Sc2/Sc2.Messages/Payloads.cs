namespace Bits.Sc2.Messages;

/// <summary>
/// Shared data structures used for SC2 message payloads.
/// </summary>

public class LobbyParsedData
{
    public string? UserBattleTag { get; set; }
    public string? UserName { get; set; }
    public string? OpponentBattleTag { get; set; }
    public string? OpponentName { get; set; }
}

public class MetricData
{
    public int Value { get; set; }
    public DateTime Timestamp { get; set; }
}

public class MatchRecord
{
    public DateTime DateUtc { get; set; }
    public string? Tag { get; set; }
    public string? Delta { get; set; }
    public string? Duration { get; set; }
}
