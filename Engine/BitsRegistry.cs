using Core.Bits;

namespace Engine;

internal class BitsRegistry : IBitsRegistry
{
    private readonly List<IBit> _bits = new();
    private readonly Dictionary<string, IBit> _bitsByRoute = new();

    public void RegisterBit(IBit bit)
    {
        _bits.Add(bit);

        // Get the route from the interface
        var route = bit.Route;
        if (!string.IsNullOrEmpty(route))
        {
            _bitsByRoute[route] = bit;
        }
    }

    public IReadOnlyList<IBit> GetAllBits() => _bits.AsReadOnly();

    public T? GetBit<T>() where T : class
    {
        return _bits.OfType<T>().FirstOrDefault();
    }

    public IBit? GetBitByRoute(string route)
    {
        _bitsByRoute.TryGetValue(route, out var bit);
        return bit;
    }
}

internal class BitContext : IBitContext
{
    private readonly StreamCraftEngine _engine;
    private readonly Microsoft.Extensions.Configuration.IConfiguration _configuration;
    private readonly IServiceProvider _serviceProvider;
    private readonly Serilog.ILogger _logger;
    private readonly Core.Messaging.IMessageBus _messageBus;

    public BitContext(
        StreamCraftEngine engine,
        Microsoft.Extensions.Configuration.IConfiguration configuration,
        IServiceProvider serviceProvider,
        Serilog.ILogger logger,
        Core.Messaging.IMessageBus messageBus)
    {
        _engine = engine;
        _configuration = configuration;
        _serviceProvider = serviceProvider;
        _logger = logger;
        _messageBus = messageBus;
    }

    public IBitsRegistry BitsRegistry => _engine.BitsRegistry;
    public IEngineState EngineState => _engine;
    public Microsoft.Extensions.Configuration.IConfiguration Configuration => _configuration;
    public IServiceProvider ServiceProvider => _serviceProvider;
    public Serilog.ILogger Logger => _logger;
    public Core.Messaging.IMessageBus MessageBus => _messageBus;
}