using Bits.Sc2.Extensions;
using Core.Plugins;
using Microsoft.Extensions.DependencyInjection;

namespace Bits.Sc2;

public sealed class Sc2Plugin : StreamCraftPluginBase
{
    public override void ConfigureServices(IServiceCollection services, PluginContext context)
    {
        services.AddSc2Services(context.Configuration);
    }
}
