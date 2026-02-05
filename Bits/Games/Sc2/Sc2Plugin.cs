using Bits.Sc2.Extensions;
using StreamCraft.Core.Plugins;
using Microsoft.Extensions.DependencyInjection;

namespace Bits.Sc2;

public sealed class Sc2Plugin : StreamCraftBitBase
{
    public override void ConfigureServices(IServiceCollection services, BitContext context)
    {
        services.AddSc2Services(context.Configuration);
    }
}




