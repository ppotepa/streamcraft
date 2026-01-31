using System.Text.Json;
using Hosting;
using Microsoft.AspNetCore.Builder;
using Serilog;
using Engine.Services;

namespace Engine.Routing;

internal sealed class RouteRegistrarContext
{
    public RouteRegistrarContext(
        WebApplication app,
        StreamCraftEngine engine,
        IApplicationHostService host,
        IReadOnlyList<PluginDescriptor> plugins,
        ILogger logger,
        ISet<string> registeredRoutes,
        JsonSerializerOptions jsonOptions)
    {
        App = app ?? throw new ArgumentNullException(nameof(app));
        Engine = engine ?? throw new ArgumentNullException(nameof(engine));
        Host = host ?? throw new ArgumentNullException(nameof(host));
        Plugins = plugins ?? throw new ArgumentNullException(nameof(plugins));
        Logger = logger ?? throw new ArgumentNullException(nameof(logger));
        RegisteredRoutes = registeredRoutes ?? throw new ArgumentNullException(nameof(registeredRoutes));
        JsonOptions = jsonOptions ?? throw new ArgumentNullException(nameof(jsonOptions));
    }

    public WebApplication App { get; }
    public StreamCraftEngine Engine { get; }
    public IApplicationHostService Host { get; }
    public IReadOnlyList<PluginDescriptor> Plugins { get; }
    public ILogger Logger { get; }
    public ISet<string> RegisteredRoutes { get; }
    public JsonSerializerOptions JsonOptions { get; }
}
