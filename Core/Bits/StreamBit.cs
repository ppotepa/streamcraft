using Microsoft.AspNetCore.Http;

namespace Core.Bits;

/// <summary>
/// Base interface for all bits, providing core metadata and behavior
/// </summary>
public interface IBit
{
    /// <summary>
    /// The HTTP route for this bit (e.g., "/sc2", "/debug")
    /// </summary>
    string Route { get; }

    /// <summary>
    /// The display name of this bit
    /// </summary>
    string Name { get; }

    /// <summary>
    /// A description of what this bit does
    /// </summary>
    string Description { get; }

    /// <summary>
    /// Whether this bit has a user interface
    /// </summary>
    bool HasUserInterface { get; }

    /// <summary>
    /// Handles HTTP requests to this bit's route
    /// </summary>
    Task HandleAsync(HttpContext httpContext);

    /// <summary>
    /// Handles HTTP requests to this bit's UI route
    /// </summary>
    Task HandleUIAsync(HttpContext httpContext);

    /// <summary>
    /// Internal initialization method called by the engine
    /// </summary>
    void Initialize(IBitContext context);
}

public abstract class StreamBit<TState> : IBit where TState : IBitState, new()
{
    protected TState State { get; } = new TState();
    protected IBitContext? Context { get; private set; }

    public virtual string Route
    {
        get
        {
            // Check for BitRoute attribute first
            var bitRouteAttr = GetType().GetCustomAttributes(typeof(BitRouteAttribute), false)
                .FirstOrDefault() as BitRouteAttribute;

            if (bitRouteAttr != null)
            {
                return bitRouteAttr.Route;
            }

            // Fallback to default route based on class name
            return $"/{GetType().Name.Replace("Bit", "").ToLowerInvariant()}";
        }
    }

    public virtual string Name => GetType().Name;
    public virtual string Description => "No description provided";

    public bool HasUserInterface => GetType().GetCustomAttributes(typeof(HasUserInterfaceAttribute), false).Any();

    public void Initialize(IBitContext context)
    {
        Context = context;
        OnInitialize();
    }

    protected virtual void OnInitialize() { }

    public abstract Task HandleAsync(HttpContext httpContext);

    public virtual Task HandleUIAsync(HttpContext httpContext)
    {
        // Default UI implementation - can be overridden
        httpContext.Response.ContentType = "text/html";
        return httpContext.Response.WriteAsync($@"
<!DOCTYPE html>
<html>
<head>
    <title>{Name} - UI</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 40px; }}
        h1 {{ color: #333; }}
        .info {{ background: #f0f0f0; padding: 20px; border-radius: 5px; }}
    </style>
</head>
<body>
    <h1>{Name}</h1>
    <div class='info'>
        <p><strong>Description:</strong> {Description}</p>
        <p><strong>Route:</strong> {Route}</p>
        <p>This is the default UI. Override HandleUIAsync() to customize.</p>
    </div>
</body>
</html>");
    }
}

public interface IBitState
{

}

public interface IBitContext
{
    IBitsRegistry BitsRegistry { get; }
    IEngineState EngineState { get; }
    Microsoft.Extensions.Configuration.IConfiguration Configuration { get; }
    IServiceProvider ServiceProvider { get; }
    Serilog.ILogger Logger { get; }
    Core.Messaging.IMessageBus MessageBus { get; }
}

public interface IBitsRegistry
{
    IReadOnlyList<IBit> GetAllBits();
    T? GetBit<T>() where T : class;
    IBit? GetBitByRoute(string route);
}

public interface IEngineState
{
    DateTime StartTime { get; }
    int DiscoveredBitsCount { get; }
}