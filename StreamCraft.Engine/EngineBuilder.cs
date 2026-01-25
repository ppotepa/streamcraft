using Serilog;
using StreamCraft.Hosting;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

namespace StreamCraft.Engine;

public class EngineBuilder
{
    private readonly EngineConfiguration _configuration = new();
    private ILogger? _logger;
    private string? _hostUrl;

    public EngineBuilder ConfigureLogger(ILogger logger)
    {
        _logger = logger;
        return this;
    }

    public EngineBuilder ConfigureBitsFolder(string bitsFolder)
    {
        _configuration.BitsFolder = bitsFolder;
        return this;
    }

    public EngineBuilder ConfigureHostUrl(string hostUrl)
    {
        _hostUrl = hostUrl;
        return this;
    }

    public StreamCraftEngine Build()
    {
        if (_logger == null)
        {
            throw new InvalidOperationException("Logger must be configured before building the engine. Call ConfigureLogger() first.");
        }

        // Build the application host
        var host = new ApplicationHostBuilder()
            .UseLogger(_logger)
            .UseUrl(_hostUrl ?? "http://localhost:5000")
            .ConfigureServices(services =>
            {
                // Services will be configured after engine is created
            })
            .Build();

        var engine = new StreamCraftEngine(_configuration, _logger, host);

        // First thing: discover plugins
        engine.DiscoverPlugins();

        // Configure host with bit routes
        ConfigureBitRoutes(host, engine);

        return engine;
    }

    private void ConfigureBitRoutes(IApplicationHostService host, StreamCraftEngine engine)
    {
        // This will be called when the host starts to register bit routes
        var hostType = host.GetType();
        var configureRoutesMethod = hostType.GetMethod("ConfigureRoutes", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);


        if (configureRoutesMethod != null)
        {
            Action<WebApplication> routeConfigurator = app =>
            {
                var registeredRoutes = new HashSet<string>();
                var allBits = engine.BitsRegistry.GetAllBits();

                foreach (var bit in allBits)
                {
                    var bitType = bit.GetType();
                    var routeProp = bitType.GetProperty("Route");
                    var handleMethod = bitType.GetMethod("HandleAsync");
                    var hasUIProp = bitType.GetProperty("HasUserInterface");
                    var handleUIMethod = bitType.GetMethod("HandleUIAsync");

                    if (routeProp != null && handleMethod != null)
                    {
                        var route = routeProp.GetValue(bit)?.ToString();
                        if (!string.IsNullOrEmpty(route))
                        {
                            // Register main route only if not already registered
                            if (!registeredRoutes.Contains(route))
                            {
                                registeredRoutes.Add(route);

                                app.MapGet(route, async (HttpContext context) =>
                                {
                                    await (Task)handleMethod.Invoke(bit, new object[] { context })!;
                                });

                                _logger?.Information("Registered route: {Route} for bit {BitType}", route, bitType.Name);
                            }

                            var configRoute = $"{route}/config";
                            if (!registeredRoutes.Contains(configRoute))
                            {
                                registeredRoutes.Add(configRoute);

                                app.MapMethods(configRoute, new[] { "GET", "POST" }, async (HttpContext context) =>
                                {
                                    await (Task)handleMethod.Invoke(bit, new object[] { context })!;
                                });

                                _logger?.Information("Registered config route: {ConfigRoute} for bit {BitType}", configRoute, bitType.Name);
                            }

                            var configWildcardRoute = $"{configRoute}/{{*path}}";
                            if (!registeredRoutes.Contains(configWildcardRoute))
                            {
                                registeredRoutes.Add(configWildcardRoute);

                                app.MapMethods(configWildcardRoute, new[] { "GET", "POST" }, async (HttpContext context) =>
                                {
                                    await (Task)handleMethod.Invoke(bit, new object[] { context })!;
                                });

                                _logger?.Information("Registered config assets route: {ConfigRoute} for bit {BitType}", configWildcardRoute, bitType.Name);
                            }

                            // Register UI route if bit has user interface
                            var hasUI = (bool)(hasUIProp?.GetValue(bit) ?? false);
                            if (hasUI && handleUIMethod != null)
                            {
                                var uiRoute = $"{route}/ui";

                                if (!registeredRoutes.Contains(uiRoute))
                                {
                                    registeredRoutes.Add(uiRoute);

                                    app.MapGet(uiRoute, async (HttpContext context) =>
                                    {
                                        await (Task)handleUIMethod.Invoke(bit, new object[] { context })!;
                                    });

                                    _logger?.Information("Registered UI route: {UIRoute} for bit {BitType}", uiRoute, bitType.Name);
                                }

                                // Register catch-all route for UI assets (under /ui)
                                var assetsRoute = $"{uiRoute}/{{*path}}";
                                if (!registeredRoutes.Contains(assetsRoute))
                                {
                                    registeredRoutes.Add(assetsRoute);

                                    app.MapGet(assetsRoute, async (HttpContext context) =>
                                    {
                                        await (Task)handleUIMethod.Invoke(bit, new object[] { context })!;
                                    });

                                    _logger?.Information("Registered assets route: {AssetsRoute} for bit {BitType}", assetsRoute, bitType.Name);
                                }
                            }
                        }
                    }
                }
            };

            configureRoutesMethod.Invoke(host, new object[] { routeConfigurator });
        }
    }
}
