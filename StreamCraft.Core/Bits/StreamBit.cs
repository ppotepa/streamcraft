using Microsoft.AspNetCore.Http;

namespace StreamCraft.Core.Bits;

public abstract class StreamBit<TState> where TState : IBitState, new()
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

    internal void Initialize(IBitContext context)
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
}

public interface IBitsRegistry
{
    IReadOnlyList<object> GetAllBits();
    T? GetBit<T>() where T : class;
    object? GetBitByRoute(string route);
}

public interface IEngineState
{
    DateTime StartTime { get; }
    int DiscoveredBitsCount { get; }
}