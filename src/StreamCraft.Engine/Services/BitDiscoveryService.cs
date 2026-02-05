using StreamCraft.Core.Plugins;
using Serilog;
using System.Reflection;
using System.Runtime.Loader;
using System.Text.Json;

namespace StreamCraft.Engine.Services;

internal sealed class BitDiscoveryResult
{
    public BitDiscoveryResult(IReadOnlyList<BitDescriptor> bits, IReadOnlyList<Type> bitTypes)
    {
        Bits = bits;
        BitTypes = bitTypes;
    }

    public IReadOnlyList<BitDescriptor> Bits { get; }
    public IReadOnlyList<Type> BitTypes { get; }
}

internal sealed class BitDescriptor
{
    public BitDescriptor(
        string bitId,
        string assemblyPath,
        Assembly assembly,
        string bitDirectory,
        IReadOnlyList<Type> bitTypes,
        IReadOnlyList<IStreamCraftBit> entrypoints,
        AssemblyLoadContext loadContext)
    {
        BitId = bitId;
        AssemblyPath = assemblyPath;
        Assembly = assembly;
        BitDirectory = bitDirectory;
        BitTypes = bitTypes;
        Entrypoints = entrypoints;
        LoadContext = loadContext;
    }

    public string BitId { get; }
    public string AssemblyPath { get; }
    public Assembly Assembly { get; }
    public string BitDirectory { get; }
    public IReadOnlyList<Type> BitTypes { get; }
    public IReadOnlyList<IStreamCraftBit> Entrypoints { get; }
    public AssemblyLoadContext LoadContext { get; }
}

internal sealed class BitDiscoveryService
{
    private readonly ILogger _logger;
    private static readonly string[] SharedAssemblies =
    [
        "Core",
        "StreamCraft.Core",
        "Messaging.Shared",
        "Hosting",
        "StreamCraft.Hosting",
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

    public BitDiscoveryService(ILogger logger)
    {
        _logger = logger;
    }

    public BitDiscoveryResult Discover(string bitsFolder)
    {
        if (string.IsNullOrWhiteSpace(bitsFolder))
        {
            _logger.Warning("Bits folder not configured.");
            return new BitDiscoveryResult(Array.Empty<BitDescriptor>(), Array.Empty<Type>());
        }

        var bitsPath = Path.GetFullPath(bitsFolder);

        if (!Directory.Exists(bitsPath))
        {
            _logger.Warning("Bits folder does not exist: {BitsPath}", bitsPath);
            Directory.CreateDirectory(bitsPath);
            _logger.Information("Created bits folder: {BitsPath}", bitsPath);
        }

        _logger.Information("Discovering bits in: {BitsPath}", bitsPath);

        var bits = new List<BitDescriptor>();
        var bitTypes = new List<Type>();

        var bitDirectories = Directory.GetDirectories(bitsPath);
        foreach (var bitDirectory in bitDirectories)
        {
            try
            {
                var manifest = LoadManifest(bitDirectory);
                var bitId = manifest?.Id ?? Path.GetFileName(bitDirectory);
                var entryAssemblyPath = ResolveEntryAssemblyPath(bitDirectory, bitId, manifest?.EntryAssembly);
                if (entryAssemblyPath == null)
                {
                    _logger.Warning("Skipping bit directory {BitDirectory}: no entry assembly found.", bitDirectory);
                    continue;
                }

                var loadContext = new BitLoadContext(entryAssemblyPath, SharedAssemblies);
                var assembly = loadContext.LoadFromAssemblyPath(entryAssemblyPath);
                var discoveredBitTypes = assembly.GetTypes()
                    .Where(t => t.IsClass && !t.IsAbstract && IsBitType(t))
                    .Where(t => IsAllowedByManifest(t, manifest))
                    .ToList();

                var entrypointTypes = assembly.GetTypes()
                    .Where(t => t.IsClass && !t.IsAbstract && typeof(IStreamCraftBit).IsAssignableFrom(t))
                    .ToList();

                var entrypoints = new List<IStreamCraftBit>();
                foreach (var entrypointType in entrypointTypes)
                {
                    try
                    {
                        if (Activator.CreateInstance(entrypointType) is IStreamCraftBit entrypoint)
                        {
                            entrypoints.Add(entrypoint);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.Error(ex, "Failed to instantiate bit entrypoint {EntrypointType}", entrypointType.FullName);
                    }
                }

                if (discoveredBitTypes.Count == 0 && entrypoints.Count == 0)
                {
                    continue;
                }

                bitTypes.AddRange(discoveredBitTypes);

                bits.Add(new BitDescriptor(
                    bitId,
                    entryAssemblyPath,
                    assembly,
                    bitDirectory,
                    discoveredBitTypes,
                    entrypoints,
                    loadContext));

                _logger.Information(
                    "Discovered bit assembly: {BitId} (Bits: {BitCount}, Entrypoints: {EntrypointCount})",
                    bitId,
                    discoveredBitTypes.Count,
                    entrypoints.Count);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to load bit from {BitDirectory}", bitDirectory);
            }
        }

        _logger.Information("Total Bits discovered: {BitCount}", bitTypes.Count);

        return new BitDiscoveryResult(bits, bitTypes);
    }

    private BitManifest? LoadManifest(string bitDirectory)
    {
        var manifestPath = Path.Combine(bitDirectory, "bit.json");
        if (!File.Exists(manifestPath))
        {
            return null;
        }

        try
        {
            var json = File.ReadAllText(manifestPath);
            return JsonSerializer.Deserialize<BitManifest>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Failed to parse bit manifest in {BitDirectory}", bitDirectory);
            return null;
        }
    }

    private string? ResolveEntryAssemblyPath(string bitDirectory, string bitId, string? entryAssembly)
    {
        if (!string.IsNullOrWhiteSpace(entryAssembly))
        {
            var manifestPath = Path.Combine(bitDirectory, entryAssembly);
            if (File.Exists(manifestPath))
            {
                return manifestPath;
            }

            _logger.Warning("Manifest entry assembly not found: {EntryAssembly}", manifestPath);
        }

        var defaultEntry = Path.Combine(bitDirectory, $"{bitId}.dll");
        if (File.Exists(defaultEntry))
        {
            return defaultEntry;
        }

        var candidates = Directory.GetFiles(bitDirectory, "*.dll", SearchOption.TopDirectoryOnly)
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

    private bool IsAllowedByManifest(Type type, BitManifest? manifest)
    {
        if (!typeof(StreamCraft.Core.Bits.IBuiltInFeature).IsAssignableFrom(type))
        {
            return true;
        }

        if (manifest?.Internal == true)
        {
            return true;
        }

        _logger.Warning("Skipping built-in feature {BitType} because bit manifest is not marked internal.", type.FullName);
        return false;
    }
}

