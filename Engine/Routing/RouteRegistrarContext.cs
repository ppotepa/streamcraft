using System.Text.Json;
using Hosting;
using Microsoft.AspNetCore.Builder;
using Serilog;
using Engine.Services;
using Core.Diagnostics;

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
        if (app == null) throw ExceptionFactory.ArgumentNull(nameof(app));
        if (engine == null) throw ExceptionFactory.ArgumentNull(nameof(engine));
        if (host == null) throw ExceptionFactory.ArgumentNull(nameof(host));
        if (plugins == null) throw ExceptionFactory.ArgumentNull(nameof(plugins));
        if (logger == null) throw ExceptionFactory.ArgumentNull(nameof(logger));
        if (registeredRoutes == null) throw ExceptionFactory.ArgumentNull(nameof(registeredRoutes));
        if (jsonOptions == null) throw ExceptionFactory.ArgumentNull(nameof(jsonOptions));
        App = app;
        Engine = engine;
        Host = host;
        Plugins = plugins;
        Logger = logger;
        RegisteredRoutes = registeredRoutes;
        JsonOptions = jsonOptions;
    }

    public WebApplication App { get; }
    public StreamCraftEngine Engine { get; }
    public IApplicationHostService Host { get; }
    public IReadOnlyList<PluginDescriptor> Plugins { get; }
    public ILogger Logger { get; }
    public ISet<string> RegisteredRoutes { get; }
    public JsonSerializerOptions JsonOptions { get; }
}
