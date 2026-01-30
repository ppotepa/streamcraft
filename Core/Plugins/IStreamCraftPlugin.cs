using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace Core.Plugins;

public interface IStreamCraftPlugin
{
    void ConfigureServices(IServiceCollection services, PluginContext context);
    void MapEndpoints(IEndpointRouteBuilder endpoints, PluginContext context);
}

public abstract class StreamCraftPluginBase : IStreamCraftPlugin
{
    public virtual void ConfigureServices(IServiceCollection services, PluginContext context) { }
    public virtual void MapEndpoints(IEndpointRouteBuilder endpoints, PluginContext context) { }
}
