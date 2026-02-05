using StreamCraft.Core.DataSources;
using StreamCraft.Core.Runtime.Preview;
using Microsoft.Extensions.Hosting;

namespace StreamCraft.Bits.PexelsMedia;

public sealed class PexelsMediaBootstrapper : IHostedService
{
    private readonly IDataSourceRegistry _registry;
    private readonly IDataSourceProviderRegistry _providerRegistry;
    private readonly PexelsMediaService _service;

    public PexelsMediaBootstrapper(
        IDataSourceRegistry registry,
        IDataSourceProviderRegistry providerRegistry,
        PexelsMediaService service)
    {
        _registry = registry;
        _providerRegistry = providerRegistry;
        _service = service;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _registry.Register(new PexelsImagesSource());
        _registry.Register(new PexelsVideosSource());
        _providerRegistry.Register(new PexelsMediaProvider(_service, "pexels-images"));
        _providerRegistry.Register(new PexelsMediaProvider(_service, "pexels-videos"));
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}




