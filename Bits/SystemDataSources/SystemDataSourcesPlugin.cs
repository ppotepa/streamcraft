using Core.DataSources;
using Core.Runtime.Preview;
using Core.Plugins;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Serilog;

namespace StreamCraft.Bits.SystemDataSources;

public sealed class SystemDataSourcesPlugin : IStreamCraftBit
{
    public void ConfigureServices(IServiceCollection services, BitContext context)
    {
        services.AddSingleton<SystemTelemetryService>();
        services.AddHostedService(sp => new SystemDataSourcesBootstrapper(
            sp.GetRequiredService<IDataSourceRegistry>(),
            sp.GetRequiredService<IDataSourceProviderRegistry>(),
            sp.GetRequiredService<SystemTelemetryService>(),
            context.Logger));
    }

    public void MapEndpoints(IEndpointRouteBuilder endpoints, BitContext context)
    {
    }
}


