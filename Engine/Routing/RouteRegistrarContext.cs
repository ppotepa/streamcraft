using Core.Diagnostics;
using Engine.Services;
using Hosting;
using Microsoft.AspNetCore.Builder;
using Serilog;
using System.Text.Json;

namespace Engine.Routing;

internal sealed class RouteRegistrarContext
{
    public RouteRegistrarContext(
        WebApplication app,
        StreamCraftEngine engine,
        IApplicationHostService host,
        IReadOnlyList<BitDescriptor> bits,
        ILogger logger,
        ISet<string> registeredRoutes,
        JsonSerializerOptions jsonOptions)
    {
        if (app == null) throw ExceptionFactory.ArgumentNull(nameof(app));
        if (engine == null) throw ExceptionFactory.ArgumentNull(nameof(engine));
        if (host == null) throw ExceptionFactory.ArgumentNull(nameof(host));
        if (bits == null) throw ExceptionFactory.ArgumentNull(nameof(bits));
        if (logger == null) throw ExceptionFactory.ArgumentNull(nameof(logger));
        if (registeredRoutes == null) throw ExceptionFactory.ArgumentNull(nameof(registeredRoutes));
        if (jsonOptions == null) throw ExceptionFactory.ArgumentNull(nameof(jsonOptions));
        App = app;
        Engine = engine;
        Host = host;
        Bits = bits;
        Logger = logger;
        RegisteredRoutes = registeredRoutes;
        JsonOptions = jsonOptions;
    }

    public WebApplication App { get; }
    public StreamCraftEngine Engine { get; }
    public IApplicationHostService Host { get; }
    public IReadOnlyList<BitDescriptor> Bits { get; }
    public ILogger Logger { get; }
    public ISet<string> RegisteredRoutes { get; }
    public JsonSerializerOptions JsonOptions { get; }
}

