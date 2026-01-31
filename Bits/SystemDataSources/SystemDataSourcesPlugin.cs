using Core.Designer;
using Core.Plugins;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Serilog;

namespace StreamCraft.Bits.SystemDataSources;

public sealed class SystemDataSourcesPlugin : IStreamCraftPlugin
{
    public void ConfigureServices(IServiceCollection services, PluginContext context)
    {
        services.AddHostedService(sp => new SystemDataSourcesBootstrapper(
            sp.GetRequiredService<IDataSourceRegistry>(),
            sp.GetRequiredService<IDataSourceProviderRegistry>(),
            context.Logger));
    }

    public void MapEndpoints(IEndpointRouteBuilder endpoints, PluginContext context)
    {
    }
}
