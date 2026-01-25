namespace StreamCraft.Bits.Sc2.Panels;

// Shared data structures used by panels

public class LobbyParsedData
{
    public string? UserBattleTag { get; set; }
    public string? UserName { get; set; }
    public string? OpponentBattleTag { get; set; }
    public string? OpponentName { get; set; }
}

public class GameSnapshotData
{
    public bool IsInGame { get; set; }
    public List<GamePlayerData>? Players { get; set; }
}

public class GamePlayerData
{
    public string? Name { get; set; }
    public string? Race { get; set; }
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
