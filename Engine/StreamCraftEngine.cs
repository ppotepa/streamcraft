using Serilog;
using Core.Bits;
using Hosting;
using System.Reflection;

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

    internal StreamCraftEngine(
        EngineConfiguration configuration,
        ILogger logger,
        IApplicationHostService host,
        Microsoft.Extensions.Configuration.IConfiguration appConfiguration,
        IServiceProvider? serviceProvider,
        Core.Messaging.IMessageBus sharedMessageBus)
    {
        _configuration = configuration;
        _logger = logger;
        _host = host;
        _startTime = DateTime.UtcNow;
        _bitsRegistry = new BitsRegistry();
        _appConfiguration = appConfiguration;
        _serviceProvider = serviceProvider;
        _sharedMessageBus = sharedMessageBus;
        _templateRegistry = new Core.Bits.Templates.BitTemplateRegistry();
        _definitionStore = new Core.Bits.Templates.BitDefinitionStore();

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
    }

    internal async Task DiscoverPluginsAsync()
    {
        if (string.IsNullOrWhiteSpace(_configuration.BitsFolder))
        {
            _logger.Warning("Bits folder not configured.");
            return;
        }

        var bitsPath = Path.GetFullPath(_configuration.BitsFolder);

        if (!Directory.Exists(bitsPath))
        {
            _logger.Warning("Bits folder does not exist: {BitsPath}", bitsPath);
            Directory.CreateDirectory(bitsPath);
            _logger.Information("Created bits folder: {BitsPath}", bitsPath);
        }

        _logger.Information("Discovering plugins in: {BitsPath}", bitsPath);

        var dllFiles = Directory.GetFiles(bitsPath, "*.dll", SearchOption.AllDirectories)
            .Where(f => !f.Contains("\\ref\\") && !f.Contains("\\refint\\") && !f.Contains("\\obj\\"))
            .ToList();

        var loadedAssemblies = new HashSet<string>();

        foreach (var dllFile in dllFiles)
        {
            try
            {
                var assemblyName = AssemblyName.GetAssemblyName(dllFile);
                var fullName = assemblyName.FullName;

                // Skip if already loaded
                if (loadedAssemblies.Contains(fullName))
                {
                    _logger.Debug("Skipping already loaded assembly: {AssemblyName}", assemblyName.Name);
                    continue;
                }

                loadedAssemblies.Add(fullName);

                var assembly = Assembly.LoadFrom(dllFile);
                var bitTypes = assembly.GetTypes()
                    .Where(t => t.IsClass && !t.IsAbstract && IsBitType(t));

                foreach (var bitType in bitTypes)
                {
                    _discoveredBits.Add(bitType);

                    // Try to instantiate and register the bit
                    try
                    {
                        var bitInstance = Activator.CreateInstance(bitType);
                        if (bitInstance is IBit bit)
                        {
                            // Don't initialize yet - will be done after host starts
                            _bitsRegistry.RegisterBit(bit);
                            _logger.Information("Discovered and registered Bit: {BitType}", bitType.FullName);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.Error(ex, "Failed to instantiate bit {BitType}", bitType.FullName);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to load assembly {DllFile}", dllFile);
            }
        }

        _logger.Information("Total Bits discovered: {BitCount}", _discoveredBits.Count);
        _logger.Information("Total Bits registered: {RegisteredCount}", _bitsRegistry.GetAllBits().Count);

        // Also discover dynamic bits from definitions
        await DiscoverDynamicBitsAsync();
    }

    private void RegisterBuiltInTemplates()
    {
        _templateRegistry.RegisterTemplate(new Engine.Templates.ApiExplorerTemplate());
        _templateRegistry.RegisterTemplate(new Engine.Templates.SystemMonitorTemplate());
        _logger.Information("Registered {Count} built-in bit templates", _templateRegistry.GetAllTemplates().Count);
    }

    private async Task DiscoverDynamicBitsAsync()
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

    private void InitializeBit(IBit bit)
    {
        var bitContext = new BitContext(this, _appConfiguration, _serviceProvider ?? throw new InvalidOperationException("Service provider not initialized"), _logger, _sharedMessageBus);
        bit.Initialize(bitContext);
    }

    private bool IsBitType(Type type)
    {
        var baseType = type.BaseType;
        while (baseType != null)
        {
            if (baseType.IsGenericType && baseType.Name.StartsWith("StreamBit"))
            {
                return true;
            }
            baseType = baseType.BaseType;
        }
        return false;
    }
}
