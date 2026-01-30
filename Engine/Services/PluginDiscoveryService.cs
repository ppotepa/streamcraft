using System.Reflection;
using System.Runtime.Loader;
using System.Text.Json;
using Core.Bits;
using Core.Plugins;
using Serilog;

namespace Engine.Services;

internal sealed class PluginDiscoveryResult
{
    public PluginDiscoveryResult(IReadOnlyList<PluginDescriptor> plugins, IReadOnlyList<Type> bitTypes)
    {
        Plugins = plugins;
        BitTypes = bitTypes;
    }

    public IReadOnlyList<PluginDescriptor> Plugins { get; }
    public IReadOnlyList<Type> BitTypes { get; }
}

internal sealed class PluginDescriptor
{
    public PluginDescriptor(
        string pluginId,
        string assemblyPath,
        Assembly assembly,
        string pluginDirectory,
        IReadOnlyList<Type> bitTypes,
        IReadOnlyList<IStreamCraftPlugin> entrypoints,
        AssemblyLoadContext loadContext)
    {
        PluginId = pluginId;
        AssemblyPath = assemblyPath;
        Assembly = assembly;
        PluginDirectory = pluginDirectory;
        BitTypes = bitTypes;
        Entrypoints = entrypoints;
        LoadContext = loadContext;
    }

    public string PluginId { get; }
    public string AssemblyPath { get; }
    public Assembly Assembly { get; }
    public string PluginDirectory { get; }
    public IReadOnlyList<Type> BitTypes { get; }
    public IReadOnlyList<IStreamCraftPlugin> Entrypoints { get; }
    public AssemblyLoadContext LoadContext { get; }
}

internal sealed class PluginDiscoveryService
{
    private readonly ILogger _logger;
    private static readonly string[] SharedAssemblies =
    [
        "Core",
        "Messaging.Shared",
        "Hosting",
        "Serilog",
        "Serilog.Sinks.Console",
        "Serilog.Sinks.File",
        "Serilog.Formatting.Compact",
        "Microsoft.Extensions.Logging",
        "Microsoft.Extensions.Logging.Abstractions",
        "Microsoft.Extensions.Configuration",
        "Microsoft.Extensions.Configuration.Abstractions",
        "Microsoft.Extensions.Hosting",
        "Microsoft.Extensions.Hosting.Abstractions",
        "Microsoft.Extensions.DependencyInjection",
        "Microsoft.Extensions.DependencyInjection.Abstractions"
    ];

    public PluginDiscoveryService(ILogger logger)
    {
        _logger = logger;
    }

    public PluginDiscoveryResult Discover(string bitsFolder)
    {
        if (string.IsNullOrWhiteSpace(bitsFolder))
        {
            _logger.Warning("Bits folder not configured.");
            return new PluginDiscoveryResult(Array.Empty<PluginDescriptor>(), Array.Empty<Type>());
        }

        var bitsPath = Path.GetFullPath(bitsFolder);

        if (!Directory.Exists(bitsPath))
        {
            _logger.Warning("Bits folder does not exist: {BitsPath}", bitsPath);
            Directory.CreateDirectory(bitsPath);
            _logger.Information("Created bits folder: {BitsPath}", bitsPath);
        }

        _logger.Information("Discovering plugins in: {BitsPath}", bitsPath);

        var plugins = new List<PluginDescriptor>();
        var bitTypes = new List<Type>();

        var pluginDirectories = Directory.GetDirectories(bitsPath);
        foreach (var pluginDirectory in pluginDirectories)
        {
            try
            {
                var manifest = LoadManifest(pluginDirectory);
                var pluginId = manifest?.Id ?? Path.GetFileName(pluginDirectory);
                var entryAssemblyPath = ResolveEntryAssemblyPath(pluginDirectory, pluginId, manifest?.EntryAssembly);
                if (entryAssemblyPath == null)
                {
                    _logger.Warning("Skipping plugin directory {PluginDirectory}: no entry assembly found.", pluginDirectory);
                    continue;
                }

                var loadContext = new PluginLoadContext(entryAssemblyPath, SharedAssemblies);
                var assembly = loadContext.LoadFromAssemblyPath(entryAssemblyPath);
                var discoveredBitTypes = assembly.GetTypes()
                    .Where(t => t.IsClass && !t.IsAbstract && IsBitType(t))
                    .ToList();

                var pluginEntrypointTypes = assembly.GetTypes()
                    .Where(t => t.IsClass && !t.IsAbstract && typeof(IStreamCraftPlugin).IsAssignableFrom(t))
                    .ToList();

                var entrypoints = new List<IStreamCraftPlugin>();
                foreach (var entrypointType in pluginEntrypointTypes)
                {
                    try
                    {
                        if (Activator.CreateInstance(entrypointType) is IStreamCraftPlugin plugin)
                        {
                            entrypoints.Add(plugin);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.Error(ex, "Failed to instantiate plugin entrypoint {EntrypointType}", entrypointType.FullName);
                    }
                }

                if (discoveredBitTypes.Count == 0 && entrypoints.Count == 0)
                {
                    continue;
                }

                bitTypes.AddRange(discoveredBitTypes);

                plugins.Add(new PluginDescriptor(
                    pluginId,
                    entryAssemblyPath,
                    assembly,
                    pluginDirectory,
                    discoveredBitTypes,
                    entrypoints,
                    loadContext));

                _logger.Information(
                    "Discovered plugin assembly: {PluginId} (Bits: {BitCount}, Entrypoints: {EntrypointCount})",
                    pluginId,
                    discoveredBitTypes.Count,
                    entrypoints.Count);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to load plugin from {PluginDirectory}", pluginDirectory);
            }
        }

        _logger.Information("Total Bits discovered: {BitCount}", bitTypes.Count);

        return new PluginDiscoveryResult(plugins, bitTypes);
    }

    private PluginManifest? LoadManifest(string pluginDirectory)
    {
        var manifestPath = Path.Combine(pluginDirectory, "plugin.json");
        if (!File.Exists(manifestPath))
        {
            return null;
        }

        try
        {
            var json = File.ReadAllText(manifestPath);
            return JsonSerializer.Deserialize<PluginManifest>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Failed to parse plugin manifest in {PluginDirectory}", pluginDirectory);
            return null;
        }
    }

    private string? ResolveEntryAssemblyPath(string pluginDirectory, string pluginId, string? entryAssembly)
    {
        if (!string.IsNullOrWhiteSpace(entryAssembly))
        {
            var manifestPath = Path.Combine(pluginDirectory, entryAssembly);
            if (File.Exists(manifestPath))
            {
                return manifestPath;
            }

            _logger.Warning("Manifest entry assembly not found: {EntryAssembly}", manifestPath);
        }

        var defaultEntry = Path.Combine(pluginDirectory, $"{pluginId}.dll");
        if (File.Exists(defaultEntry))
        {
            return defaultEntry;
        }

        var candidates = Directory.GetFiles(pluginDirectory, "*.dll", SearchOption.TopDirectoryOnly)
            .Where(f => !f.Contains("\\ref\\") && !f.Contains("\\refint\\") && !f.Contains("\\obj\\"))
            .ToList();

        return candidates.FirstOrDefault();
    }

    private static bool IsBitType(Type type)
    {
        var baseType = type.BaseType;
        while (baseType != null)
        {
            if (baseType.IsGenericType && baseType.Name.StartsWith("StreamBit", StringComparison.Ordinal))
            {
                return true;
            }
            baseType = baseType.BaseType;
        }
        return false;
    }
}
