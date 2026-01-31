using Core.Designer;
using System.Diagnostics;

namespace StreamCraft.Bits.SystemDataSources;

public static class SystemSources
{
    public static IReadOnlyList<IDataSource> Build()
    {
        return new List<IDataSource>
        {
            new SystemDataSource
            {
                Id = "system-processes",
                Name = "Running Processes",
                Description = "Process list and memory usage",
                Kind = "system"
            },
            new SystemDataSource
            {
                Id = "system-memory",
                Name = "Memory Snapshot",
                Description = "Managed/working set memory snapshot",
                Kind = "system"
            },
            new SystemDataSource
            {
                Id = "system-uptime",
                Name = "System Uptime",
                Description = "Current uptime in milliseconds",
                Kind = "system"
            }
        };
    }

    public static IReadOnlyList<IDataSourceProvider> BuildProviders()
    {
        return new List<IDataSourceProvider>
        {
            new ProcessPreviewProvider(),
            new MemoryPreviewProvider(),
            new UptimePreviewProvider()
        };
    }
}

public sealed class SystemDataSource : IDataSource
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string Kind { get; init; } = "system";
}

public sealed class ProcessPreviewProvider : IDataSourceProvider
{
    public string SourceId => "system-processes";

    public Task<object?> GetPreviewAsync(CancellationToken cancellationToken)
    {
        var processes = Process.GetProcesses()
            .OrderByDescending(p =>
            {
                try { return p.WorkingSet64; } catch { return 0; }
            })
            .Take(8)
            .Select(p =>
            {
                long memory = 0;
                try { memory = p.WorkingSet64; } catch { }
                return new
                {
                    p.Id,
                    p.ProcessName,
                    MemoryMb = Math.Round(memory / 1024d / 1024d, 2)
                };
            })
            .ToArray();

        var payload = new
        {
            TimestampUtc = DateTime.UtcNow,
            TotalProcesses = processes.Length,
            TopProcesses = processes
        };

        return Task.FromResult<object?>(payload);
    }
}

public sealed class MemoryPreviewProvider : IDataSourceProvider
{
    public string SourceId => "system-memory";

    public Task<object?> GetPreviewAsync(CancellationToken cancellationToken)
    {
        var process = Process.GetCurrentProcess();
        var payload = new
        {
            TimestampUtc = DateTime.UtcNow,
            ManagedMemoryBytes = GC.GetTotalMemory(false),
            WorkingSetBytes = process.WorkingSet64,
            PrivateMemoryBytes = process.PrivateMemorySize64
        };

        return Task.FromResult<object?>(payload);
    }
}

public sealed class UptimePreviewProvider : IDataSourceProvider
{
    public string SourceId => "system-uptime";

    public Task<object?> GetPreviewAsync(CancellationToken cancellationToken)
    {
        var payload = new
        {
            TimestampUtc = DateTime.UtcNow,
            UptimeMilliseconds = Environment.TickCount64
        };

        return Task.FromResult<object?>(payload);
    }
}
