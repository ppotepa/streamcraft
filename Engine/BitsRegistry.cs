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
        Core.Messaging.IMessageBus messageBus,
        IBit bit)
    {
        _engine = engine;
        _configuration = configuration;
        _serviceProvider = serviceProvider;
        _logger = logger
            .ForContext("BitName", bit.Name)
            .ForContext("BitRoute", bit.Route)
            .ForContext("BitType", bit.GetType().FullName ?? bit.GetType().Name);
        _messageBus = new BitMessageBus(messageBus, bit);
    }

    public IBitsRegistry BitsRegistry => _engine.BitsRegistry;
    public IEngineState EngineState => _engine;
    public Microsoft.Extensions.Configuration.IConfiguration Configuration => _configuration;
    public IServiceProvider ServiceProvider => _serviceProvider;
    public Serilog.ILogger Logger => _logger;
    public Core.Messaging.IMessageBus MessageBus => _messageBus;
}

internal sealed class BitMessageBus : Core.Messaging.IMessageBus
{
    private readonly Core.Messaging.IMessageBus _inner;
    private readonly string _source;

    public BitMessageBus(Core.Messaging.IMessageBus inner, IBit bit)
    {
        _inner = inner;
        _source = bit.Route?.Trim('/') ?? bit.Name;
    }

    public void Publish<TPayload>(Messaging.Shared.MessageType messageType, TPayload payload, Core.Messaging.MessageMetadata? metadata = null)
    {
        _inner.Publish(messageType, payload, EnsureSource(metadata));
    }

    public Task PublishAsync<TPayload>(Messaging.Shared.MessageType messageType, TPayload payload, Core.Messaging.MessageMetadata? metadata = null, CancellationToken cancellationToken = default)
    {
        return _inner.PublishAsync(messageType, payload, EnsureSource(metadata), cancellationToken);
    }

    public Guid Subscribe<TPayload>(Messaging.Shared.MessageType messageType, Action<TPayload> handler)
        => _inner.Subscribe(messageType, handler);

    public void Unsubscribe(Guid subscriptionId)
        => _inner.Unsubscribe(subscriptionId);

    public void Clear()
        => _inner.Clear();

    private Core.Messaging.MessageMetadata EnsureSource(Core.Messaging.MessageMetadata? metadata)
    {
        if (metadata == null)
        {
            return Core.Messaging.MessageMetadata.Create(source: _source);
        }

        if (!string.IsNullOrWhiteSpace(metadata.Source))
        {
            return metadata;
        }

        return new Core.Messaging.MessageMetadata
        {
            Timestamp = metadata.Timestamp,
            MessageId = metadata.MessageId,
            CorrelationId = metadata.CorrelationId,
            Source = _source
        };
    }
}
