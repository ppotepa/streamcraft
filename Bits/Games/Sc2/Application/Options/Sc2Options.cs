namespace Bits.Sc2.Application.Options;

/// <summary>
/// Configuration options for Sc2 background services.
/// </summary>
public class Sc2Options
{
    /// <summary>
    /// Battle tag for the user (e.g., Player#1234).
    /// </summary>
    public string? BattleTag { get; set; }

    /// <summary>
    /// Poll interval in milliseconds for lobby file monitoring.
    /// </summary>
    public int PollIntervalMs { get; set; } = 250;
}
