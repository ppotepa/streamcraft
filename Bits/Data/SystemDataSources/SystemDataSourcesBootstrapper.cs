using StreamCraft.Core.DataSources;
using StreamCraft.Core.Runtime.Preview;
using Microsoft.Extensions.Hosting;
using Serilog;

namespace StreamCraft.Bits.SystemDataSources;

public sealed class SystemDataSourcesBootstrapper : IHostedService
{
    private readonly IDataSourceRegistry _sourceRegistry;
    private readonly IDataSourceProviderRegistry _providerRegistry;
    private readonly SystemTelemetryService _telemetry;
    private readonly ILogger _logger;

    public SystemDataSourcesBootstrapper(
        IDataSourceRegistry sourceRegistry,
        IDataSourceProviderRegistry providerRegistry,
        SystemTelemetryService telemetry,
        ILogger logger)
    {
        _sourceRegistry = sourceRegistry;
        _providerRegistry = providerRegistry;
        _telemetry = telemetry;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        var sources = SystemSources.Build();
        var providers = SystemSources.BuildProviders(_telemetry);
        _sourceRegistry.RegisterRange(sources);
        _providerRegistry.RegisterRange(providers);
        _logger.Information("SystemDataSources loaded: {Count}", sources.Count);
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}




