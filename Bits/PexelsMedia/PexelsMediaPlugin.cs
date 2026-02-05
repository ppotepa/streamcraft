using Core.DataSources;
using Core.Media.Cache;
using Core.Media.Gateway;
using Core.Plugins;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Core.Runtime.Preview;

namespace StreamCraft.Bits.PexelsMedia;

public sealed class PexelsMediaPlugin : IStreamCraftBit
{
    public void ConfigureServices(IServiceCollection services, BitContext context)
    {
        services.AddSingleton<MediaCacheStore>();
        services.AddSingleton<PexelsClient>();
        services.AddSingleton<PexelsMediaService>();
        services.AddSingleton<IMediaProvider>(sp => sp.GetRequiredService<PexelsMediaService>());
        services.AddHostedService(sp =>
            new PexelsMediaBootstrapper(
                sp.GetRequiredService<IDataSourceRegistry>(),
                sp.GetRequiredService<IDataSourceProviderRegistry>(),
                sp.GetRequiredService<PexelsMediaService>()));
    }

    public void MapEndpoints(IEndpointRouteBuilder endpoints, BitContext context)
    {
        MediaGateway.MapEndpoints(endpoints);
    }
}


