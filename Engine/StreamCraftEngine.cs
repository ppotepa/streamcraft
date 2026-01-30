using Serilog;
using Core.Bits;
using Hosting;

namespace Engine;

public class StreamCraftEngine : IEngineState
{
    private readonly EngineConfiguration _configuration;
    private readonly List<Type> _discoveredBits = new();
    private readonly ILogger _logger;
    private readonly IApplicationHostService _host;
    private readonly BitsRegistry _bitsRegistry;
    private readonly DateTime _startTime;
    private readonly Microsoft.Extensions.Configuration.IConfiguration _appConfiguration;
    private IServiceProvider? _serviceProvider;
    private readonly Core.Messaging.IMessageBus _sharedMessageBus;
    private readonly Core.Bits.Templates.BitTemplateRegistry _templateRegistry;
    private readonly Core.Bits.Templates.BitDefinitionStore _definitionStore;
    private bool _isInitialized;

    internal StreamCraftEngine(
        EngineConfiguration configuration,
        ILogger logger,
        IApplicationHostService host,
        Microsoft.Extensions.Configuration.IConfiguration appConfiguration,
        IServiceProvider? serviceProvider,
        Core.Messaging.IMessageBus sharedMessageBus,
        Core.Bits.Templates.BitTemplateRegistry templateRegistry,
        Core.Bits.Templates.BitDefinitionStore definitionStore)
    {
        _configuration = configuration;
        _logger = logger;
        _host = host;
        _startTime = DateTime.UtcNow;
        _bitsRegistry = new BitsRegistry();
        _appConfiguration = appConfiguration;
        _serviceProvider = serviceProvider;
        _sharedMessageBus = sharedMessageBus;
        _templateRegistry = templateRegistry;
        _definitionStore = definitionStore;

        // Register built-in templates
        RegisterBuiltInTemplates();
    }

    // Public properties for external access
    public IReadOnlyList<Type> DiscoveredBits => _discoveredBits.AsReadOnly();
    public IApplicationHostService Host => _host;
    public IBitsRegistry BitsRegistry => _bitsRegistry;
    public Core.Bits.Templates.BitTemplateRegistry TemplateRegistry => _templateRegistry;
    public Core.Bits.Templates.BitDefinitionStore DefinitionStore => _definitionStore;

    // IEngineState implementation
    public DateTime StartTime => _startTime;
    public int DiscoveredBitsCount => _bitsRegistry.GetAllBits().Count;

    /// <summary>
    /// Called after host has started to provide actual service provider and initialize all bits
    /// </summary>
    public void StartEngine()
    {
        if (_isInitialized)
        {
            _logger.Warning("Engine initialization already completed.");
            return;
        }

        _serviceProvider = _host.Services;

        // Initialize all discovered bits now that we have the service provider
        _logger.Information("Initializing {Count} bits with service provider...", _bitsRegistry.GetAllBits().Count);
        foreach (var bit in _bitsRegistry.GetAllBits())
        {
            try
            {
                InitializeBit(bit);
                _logger.Debug("Initialized bit: {BitName}", bit.Name);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to initialize bit {BitName}", bit.Name);
            }
        }
        _logger.Information("All bits initialized.");
        _isInitialized = true;
    }

    internal void RegisterDiscoveredBits(IEnumerable<Type> bitTypes)
    {
        var discovered = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var bitType in bitTypes)
        {
            var fullName = bitType.FullName ?? bitType.Name;
            if (!discovered.Add(fullName))
            {
                continue;
            }

            _discoveredBits.Add(bitType);
            _logger.Information("Discovered bit type: {BitType}", bitType.FullName);
        }

        _logger.Information("Total Bit types discovered: {BitCount}", _discoveredBits.Count);
    }

    private void RegisterBuiltInTemplates()
    {
        _templateRegistry.RegisterTemplate(new Engine.Templates.ApiExplorerTemplate());
        _templateRegistry.RegisterTemplate(new Engine.Templates.SystemMonitorTemplate());
        _logger.Information("Registered {Count} built-in bit templates", _templateRegistry.GetAllTemplates().Count);
    }

    internal async Task DiscoverDynamicBitsAsync()
    {
        try
        {
            var definitions = await _definitionStore.LoadAllAsync();
            var enabledDefinitions = definitions.Where(d => d.IsEnabled).ToList();

            _logger.Information("Discovering dynamic bits from {Count} definitions...", enabledDefinitions.Count);

            foreach (var definition in enabledDefinitions)
            {
                try
                {
                    var template = _templateRegistry.GetTemplate(definition.TemplateId);
                    if (template == null)
                    {
                        _logger.Warning("Template '{TemplateId}' not found for bit '{BitName}'", definition.TemplateId, definition.Name);
                        continue;
                    }

                    var validation = template.Validate(definition);
                    if (!validation.IsValid)
                    {
                        _logger.Warning("Invalid bit definition '{BitName}': {Errors}", definition.Name, string.Join(", ", validation.Errors));
                        continue;
                    }

                    var dynamicBit = template.CreateBit(definition);
                    _bitsRegistry.RegisterBit(dynamicBit);
                    _logger.Information("Discovered and registered Dynamic Bit: {BitName} (template: {TemplateId})", definition.Name, definition.TemplateId);
                }
                catch (Exception ex)
                {
                    _logger.Error(ex, "Failed to create dynamic bit from definition '{BitId}'", definition.Id);
                }
            }

            _logger.Information("Total dynamic bits registered: {Count}", enabledDefinitions.Count);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Failed to discover dynamic bits");
        }
    }

    internal void InitializeDiscoveredBits(IServiceProvider serviceProvider)
    {
        var existingTypes = new HashSet<Type>(_bitsRegistry.GetAllBits().Select(bit => bit.GetType()));

        foreach (var bitType in _discoveredBits)
        {
            if (existingTypes.Contains(bitType))
            {
                continue;
            }

            try
            {
                var bitInstance = Microsoft.Extensions.DependencyInjection.ActivatorUtilities.CreateInstance(serviceProvider, bitType);
                if (bitInstance is IBit bit)
                {
                    _bitsRegistry.RegisterBit(bit);
                    _logger.Information("Registered Bit via DI: {BitType}", bitType.FullName);
                }
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to instantiate bit {BitType}", bitType.FullName);
            }
        }

        _logger.Information("Total Bits registered: {RegisteredCount}", _bitsRegistry.GetAllBits().Count);
    }

    private void InitializeBit(IBit bit)
    {
        var bitContext = new BitContext(
            this,
            _appConfiguration,
            _serviceProvider ?? throw new InvalidOperationException("Service provider not initialized"),
            _logger,
            _sharedMessageBus,
            bit);
        bit.Initialize(bitContext);
    }

    
}
