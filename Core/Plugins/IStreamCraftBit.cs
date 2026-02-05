using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace Core.Plugins;

public interface IStreamCraftBit
{
    void ConfigureServices(IServiceCollection services, BitContext context);
    void MapEndpoints(IEndpointRouteBuilder endpoints, BitContext context);
}

public abstract class StreamCraftBitBase : IStreamCraftBit
{
    public virtual void ConfigureServices(IServiceCollection services, BitContext context) { }
    public virtual void MapEndpoints(IEndpointRouteBuilder endpoints, BitContext context) { }
}
