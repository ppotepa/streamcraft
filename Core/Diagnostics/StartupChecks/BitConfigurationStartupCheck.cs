using Core.Bits;
using System.Reflection;

namespace Core.Diagnostics.StartupChecks;

public sealed class BitConfigurationStartupCheck : IStartupCheck
{
    private readonly IReadOnlyList<Type> _bitTypes;
    private readonly IBitConfigStore _configStore;

    public BitConfigurationStartupCheck(IEnumerable<Type> bitTypes, IBitConfigStore configStore)
    {
        _bitTypes = bitTypes?.ToList() ?? new List<Type>();
        _configStore = configStore ?? throw ExceptionFactory.ArgumentNull(nameof(configStore));
    }

    public string Name => "BitConfiguration";
    public bool IsCritical => true;
    public StartupCheckStage Stage => StartupCheckStage.PostMigrations;

    public Task<StartupCheckResult> RunAsync(StartupCheckContext context, CancellationToken cancellationToken = default)
    {
        if (_bitTypes.Count == 0)
        {
            return Task.FromResult(StartupCheckResult.Ok(Name, "No bits discovered."));
        }

        var missing = new List<(string BitId, string? Route)>();
        foreach (var bitType in _bitTypes)
        {
            if (!RequiresConfiguration(bitType))
            {
                continue;
            }

            var bitId = GetBitConfigKey(bitType);
            if (string.IsNullOrWhiteSpace(bitId))
            {
                continue;
            }

            if (_configStore.Exists(bitId))
            {
                continue;
            }

            missing.Add((bitId, TryGetRoute(bitType)));
        }

        if (missing.Count == 0)
        {
            return Task.FromResult(StartupCheckResult.Ok(Name, "All required bit configurations are present."));
        }

        var details = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
        foreach (var (bitId, route) in missing)
        {
            details[bitId] = string.IsNullOrWhiteSpace(route) ? "missing" : $"missing (route {route})";
        }

        var message = $"Missing configuration for: {string.Join(", ", missing.Select(entry => entry.BitId))}";
        return Task.FromResult(StartupCheckResult.Fail(Name, message, details));
    }

    private static bool RequiresConfiguration(Type bitType)
    {
        return bitType.GetCustomAttribute<RequiresConfigurationAttribute>() != null;
    }

    private static string GetBitConfigKey(Type bitType)
    {
        var name = bitType.Name;
        if (name.EndsWith("Bit", StringComparison.OrdinalIgnoreCase))
        {
            name = name[..^3];
        }

        return name.ToLowerInvariant();
    }

    private static string? TryGetRoute(MemberInfo bitType)
    {
        var route = bitType.GetCustomAttribute<BitRouteAttribute>();
        return route?.Route;
    }
}
