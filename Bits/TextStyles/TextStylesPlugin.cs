using Core.Designer;
using Core.Plugins;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace StreamCraft.Bits.TextStyles;

public sealed class TextStylesPlugin : IStreamCraftPlugin
{
    public void ConfigureServices(IServiceCollection services, PluginContext context)
    {
        services.AddHostedService<TextStylesBootstrapper>();
    }

    public void MapEndpoints(IEndpointRouteBuilder endpoints, PluginContext context)
    {
    }
}

internal sealed class TextStylesBootstrapper : Microsoft.Extensions.Hosting.IHostedService
{
    private readonly IDesignerUiExtensionRegistry _registry;

    public TextStylesBootstrapper(IDesignerUiExtensionRegistry registry)
    {
        _registry = registry;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _registry.RegisterRange(TextStylesCatalog.BuildExtensions());
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
