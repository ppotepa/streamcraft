using StreamCraft.Core.DataSources;
using StreamCraft.Core.Runtime.Preview;
using System.Linq;

namespace StreamCraft.Bits.SystemDataSources;

public static class SystemSources
{
    private static readonly IReadOnlyList<SystemDataSourceDefinition> SystemSourceDefinitions =
    [
        new("system-cpu", "CPU Usage", "Overall CPU usage", "system", "system-performance"),
        new("system-memory", "Memory", "Memory usage snapshot", "system", "system-performance"),
        new("system-disk-usage", "Disk Usage", "Disk usage per drive", "system", "system-storage"),
        new("system-network", "Network Throughput", "Network upload/download throughput", "system", "system-network"),
        new("system-uptime", "System Uptime", "Current uptime in milliseconds", "system", "system-time"),
        new("system-time", "Current Time", "Local and UTC time", "system", "system-time"),
        new("system-timezone", "Timezone", "Local timezone info", "system", "system-time"),
        new("system-processes", "Top Processes (Memory)", "Top processes by memory", "system", "system-apps"),
        new("system-processes-cpu", "Top Processes (CPU)", "Top processes by CPU time", "system", "system-apps"),
        new("system-user", "Logged-in User", "Current user info", "system", "system-os"),
        new("system-host", "Hostname", "Machine name", "system", "system-os"),
        new("system-os", "OS Version", "Operating system version/build", "system", "system-os")
    ];

    private static readonly IReadOnlyList<ObsDataSourceDefinition> ObsSourceDefinitions = [];

    public static IReadOnlyList<IDataSource> Build()
    {
        return SystemSourceDefinitions
            .Cast<IDataSource>()
            .Concat(ObsSourceDefinitions)
            .ToList();
    }

    public static IReadOnlyList<IDataSourceProvider> BuildProviders(SystemTelemetryService telemetry)
    {
        var providers = new List<IDataSourceProvider>
        {
            new OnDemandPreviewProvider("system-cpu", _ => Task.FromResult<object?>(telemetry.GetCpuSnapshot())),
            new OnDemandPreviewProvider("system-memory", _ => Task.FromResult<object?>(telemetry.GetMemorySnapshot())),
            new OnDemandPreviewProvider("system-disk-usage", _ => Task.FromResult<object?>(telemetry.GetDiskUsageSnapshot())),
            new OnDemandPreviewProvider("system-network", _ => Task.FromResult<object?>(telemetry.GetNetworkSnapshot())),
            new OnDemandPreviewProvider("system-uptime", _ => Task.FromResult<object?>(telemetry.GetUptimeSnapshot())),
            new OnDemandPreviewProvider("system-time", _ => Task.FromResult<object?>(telemetry.GetTimeSnapshot())),
            new OnDemandPreviewProvider("system-timezone", _ => Task.FromResult<object?>(telemetry.GetTimezoneSnapshot())),
            new OnDemandPreviewProvider("system-processes", _ => Task.FromResult<object?>(telemetry.GetTopProcessesByMemory())),
            new OnDemandPreviewProvider("system-processes-cpu", _ => Task.FromResult<object?>(telemetry.GetTopProcessesByCpu())),
            new OnDemandPreviewProvider("system-user", _ => Task.FromResult<object?>(telemetry.GetUserSnapshot())),
            new OnDemandPreviewProvider("system-host", _ => Task.FromResult<object?>(telemetry.GetHostSnapshot())),
            new OnDemandPreviewProvider("system-os", _ => Task.FromResult<object?>(telemetry.GetOsSnapshot()))
        };

        return providers;
    }
}

public abstract record SystemDataSourceBase : ISystemDataSource
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string Kind { get; init; } = "system";
    public string? CategoryId { get; init; }
}

public sealed record SystemDataSourceDefinition : SystemDataSourceBase
{
    public SystemDataSourceDefinition(string id, string name, string description, string kind, string? categoryId)
    {
        Id = id;
        Name = name;
        Description = description;
        Kind = kind;
        CategoryId = categoryId;
    }
}

public sealed record ObsDataSourceDefinition : SystemDataSourceBase, IOBSDataSource
{
    public ObsDataSourceDefinition(string id, string name, string description, string kind, string? categoryId)
    {
        Id = id;
        Name = name;
        Description = description;
        Kind = kind;
        CategoryId = categoryId;
    }
}




