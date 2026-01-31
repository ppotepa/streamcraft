namespace Bits.Sc2.Configuration;

public sealed class Sc2RuntimeOptions
{
    public string[] ProcessNames { get; init; } = ["SC2", "SC2_x64"];
    public string LobbyRoot { get; init; } = "%LOCALAPPDATA%\\Temp\\Starcraft II";
    public string LobbySubdirectory { get; init; } = "TempWriteReplayP1";
    public string LobbyFileName { get; init; } = "replay.server.battlelobby";
    public int PollIntervalMs { get; init; } = 250;
    public string WatcherMode { get; init; } = "hybrid";
}
