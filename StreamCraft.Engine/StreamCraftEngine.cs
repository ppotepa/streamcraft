using Serilog;
using StreamCraft.Hosting;
using StreamCraft.Core.Bits;
using System.Reflection;

namespace StreamCraft.Engine;

public class StreamCraftEngine : IEngineState
{
    private readonly EngineConfiguration _configuration;
    private readonly List<Type> _discoveredBits = new();
    private readonly ILogger _logger;
    private readonly IApplicationHostService _host;
    private readonly BitsRegistry _bitsRegistry;
    private readonly DateTime _startTime;

    internal StreamCraftEngine(EngineConfiguration configuration, ILogger logger, IApplicationHostService host)
    {
        _configuration = configuration;
        _logger = logger;
        _host = host;
        _startTime = DateTime.UtcNow;
        _bitsRegistry = new BitsRegistry();
    }

    public IReadOnlyList<Type> DiscoveredBits => _discoveredBits.AsReadOnly();
    public IApplicationHostService Host => _host;
    public IBitsRegistry BitsRegistry => _bitsRegistry;

    // IEngineState implementation
    public DateTime StartTime => _startTime;
    public int DiscoveredBitsCount => _bitsRegistry.GetAllBits().Count;

    internal void DiscoverPlugins()
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
                        if (bitInstance != null)
                        {
                            InitializeBit(bitInstance);
                            _bitsRegistry.RegisterBit(bitInstance);
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
    }

    private void InitializeBit(object bit)
    {
        var bitContext = new BitContext(this);
        var initMethod = bit.GetType().GetMethod("Initialize", BindingFlags.NonPublic | BindingFlags.Instance);
        initMethod?.Invoke(bit, new object[] { bitContext });
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
