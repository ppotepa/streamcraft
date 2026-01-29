namespace Bits.Sc2.Application.Services;

/// <summary>
/// Service interface for accessing and updating Sc2BitState.
/// Provides thread-safe access to shared bit state.
/// </summary>
public interface ISc2BitStateService
{
    int? HeartRate { get; set; }
    DateTime? HeartRateTimestamp { get; set; }
    bool HeartRateHasSignal { get; set; }
}
