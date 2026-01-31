using Core.Designer;
using Microsoft.Extensions.Hosting;
using Serilog;

namespace StreamCraft.Bits.PublicApiSources;

public sealed class PublicApiSourcesBootstrapper : IHostedService
{
    private readonly IApiSourceRegistry _registry;
    private readonly PublicApiSourceLoader _loader;
    private readonly ILogger _logger;

    public PublicApiSourcesBootstrapper(IApiSourceRegistry registry, PublicApiSourceLoader loader, ILogger logger)
    {
        _registry = registry;
        _loader = loader;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        var sources = _loader.LoadAll();
        _registry.RegisterRange(sources);
        _logger.Information("PublicApiSources loaded: {Count}", sources.Count);
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}
