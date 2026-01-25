using StreamCraft.Core.Bits;

namespace StreamCraft.Engine;

internal class BitsRegistry : IBitsRegistry
{
    private readonly List<object> _bits = new();
    private readonly Dictionary<string, object> _bitsByRoute = new();

    public void RegisterBit(object bit)
    {
        _bits.Add(bit);

        // Try to get the route
        var routeProp = bit.GetType().GetProperty("Route");
        if (routeProp != null)
        {
            var route = routeProp.GetValue(bit)?.ToString();
            if (!string.IsNullOrEmpty(route))
            {
                _bitsByRoute[route] = bit;
            }
        }
    }

    public IReadOnlyList<object> GetAllBits() => _bits.AsReadOnly();

    public T? GetBit<T>() where T : class
    {
        return _bits.OfType<T>().FirstOrDefault();
    }

    public object? GetBitByRoute(string route)
    {
        _bitsByRoute.TryGetValue(route, out var bit);
        return bit;
    }
}

internal class BitContext : IBitContext
{
    private readonly StreamCraftEngine _engine;
    private readonly Microsoft.Extensions.Configuration.IConfiguration _configuration;

    public BitContext(StreamCraftEngine engine, Microsoft.Extensions.Configuration.IConfiguration configuration)
    {
        _engine = engine;
        _configuration = configuration;
    }

    public IBitsRegistry BitsRegistry => _engine.BitsRegistry;
    public IEngineState EngineState => _engine;
    public Microsoft.Extensions.Configuration.IConfiguration Configuration => _configuration;
}