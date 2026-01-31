using Core.Designer;
using Microsoft.Extensions.Hosting;
using Serilog;

namespace StreamCraft.Bits.SystemDataSources;

public sealed class SystemDataSourcesBootstrapper : IHostedService
{
    private readonly IDataSourceRegistry _sourceRegistry;
    private readonly IDataSourceProviderRegistry _providerRegistry;
    private readonly ILogger _logger;

    public SystemDataSourcesBootstrapper(
        IDataSourceRegistry sourceRegistry,
        IDataSourceProviderRegistry providerRegistry,
        ILogger logger)
    {
        _sourceRegistry = sourceRegistry;
        _providerRegistry = providerRegistry;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        var sources = SystemSources.Build();
        var providers = SystemSources.BuildProviders();
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
