using Core.Designer;
using Core.Plugins;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Serilog;

namespace StreamCraft.Bits.PublicApiSources;

public sealed class PublicApiSourcesPlugin : IStreamCraftPlugin
{
    public void ConfigureServices(IServiceCollection services, PluginContext context)
    {
        services.AddSingleton<PublicApiSourceLoader>();
        services.AddHostedService(sp =>
            new PublicApiSourcesBootstrapper(
                sp.GetRequiredService<IApiSourceRegistry>(),
                sp.GetRequiredService<PublicApiSourceLoader>(),
                context.Logger));
    }

    public void MapEndpoints(IEndpointRouteBuilder endpoints, PluginContext context)
    {
    }
}
