using Core.Plugins;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace StreamCraft.Bits.Designer;

public sealed class DesignerPlugin : IStreamCraftBit
{
    public void ConfigureServices(IServiceCollection services, BitContext context)
    {
        services.AddSingleton<DesignerLayoutStore>();
        services.AddSingleton<DesignerAutosaveStore>();
    }

    public void MapEndpoints(IEndpointRouteBuilder endpoints, BitContext context)
    {
    }
}

