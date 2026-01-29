namespace Bits.Sc2.Application.Services;

/// <summary>
/// Service that provides access to Sc2BitState for dependency injection.
/// Singleton service that holds a reference to the bit's state.
/// Uses static initialization pattern during migration phase.
/// </summary>
public class Sc2BitStateService : ISc2BitStateService
{
    private static Sc2BitState? _staticState;
    private readonly object _lock = new();

    public Sc2BitStateService()
    {
        // Constructor for DI - uses static state set by bit
    }

    /// <summary>
    /// Static initializer called by Sc2Bit during startup.
    /// TODO: Replace with proper DI when IBitContext includes IServiceProvider.
    /// </summary>
    public static void InitializeStatic(Sc2BitState state)
    {
        if (_staticState != null)
            throw new InvalidOperationException("Sc2BitStateService already initialized.");

        _staticState = state ?? throw new ArgumentNullException(nameof(state));
    }

    private Sc2BitState State
    {
        get
        {
            if (_staticState == null)
                throw new InvalidOperationException("Sc2BitStateService not initialized. Call InitializeStatic() first.");
            return _staticState;
        }
    }

    public int? HeartRate
    {
        get { lock (_lock) return State.HeartRate; }
        set { lock (_lock) State.HeartRate = value; }
    }

    public DateTime? HeartRateTimestamp
    {
        get { lock (_lock) return State.HeartRateTimestamp; }
        set { lock (_lock) State.HeartRateTimestamp = value; }
    }

    public bool HeartRateHasSignal
    {
        get { lock (_lock) return State.HeartRateHasSignal; }
        set { lock (_lock) State.HeartRateHasSignal = value; }
    }
}
