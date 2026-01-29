using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Serilog;
using Hosting;
using Engine.Services;

namespace Engine;

public class EngineBuilder
{
    private readonly EngineConfiguration _configuration = new();
    private ILogger? _logger;
    private string? _hostUrl;
    private Microsoft.Extensions.Configuration.IConfiguration? _appConfiguration;

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

    public EngineBuilder ConfigureAppSettings(Microsoft.Extensions.Configuration.IConfiguration configuration)
    {
        _appConfiguration = configuration;
        return this;
    }

    public async Task<StreamCraftEngine> BuildAsync()
    {
        if (_logger == null)
        {
            throw new InvalidOperationException("Logger must be configured before building the engine. Call ConfigureLogger() first.");
        }

        if (_appConfiguration == null)
        {
            throw new InvalidOperationException("AppSettings configuration must be provided. Call ConfigureAppSettings() first.");
        }

        // Create controller discovery service once
        var controllerDiscovery = new ControllerDiscoveryService(_logger);
        controllerDiscovery.DiscoverControllers();

        // Create shared message bus for inter-bit communication
        var sharedMessageBus = new Core.Messaging.MessageBus();

        // Build the application host
        var host = new ApplicationHostBuilder()
            .UseLogger(_logger)
            .UseUrl(_hostUrl ?? "http://localhost:5000")
            .ConfigureServices(services =>
            {
                // Register shared infrastructure
                services.AddSingleton<Core.Messaging.IMessageBus>(sharedMessageBus);
                services.AddSingleton<Serilog.ILogger>(_logger);

                // Register controller services
                controllerDiscovery.RegisterControllerServices(services);
            })
            .ConfigureMiddleware(app =>
            {
                // Discover and register static file paths
                var staticFileService = new StaticFileService(_logger);
                staticFileService.DiscoverStaticPaths();
                staticFileService.RegisterStaticFiles(app);

                // Register controller routes (using same discovery instance)
                controllerDiscovery.RegisterRoutes(app);
            })
            .Build();

        // Create engine - it will get proper IServiceProvider after host starts
        var engine = new StreamCraftEngine(
            _configuration,
            _logger,
            host,
            _appConfiguration,
            null!, // Will be set after host starts
            sharedMessageBus);

        // First thing: discover plugins (both compiled and dynamic)
        await engine.DiscoverPluginsAsync();

        // Configure host with bit routes
        ConfigureBitRoutes(host, engine);

        return engine;
    }

    private void ConfigureBitRoutes(IApplicationHostService host, StreamCraftEngine engine)
    {
        // This will be called when the host starts to register bit routes
        {
            var configPagePath = Path.Combine(host.StaticAssetsRoot, "config", "index.html");
            Action<WebApplication> routeConfigurator = app =>
            {
                var registeredRoutes = new HashSet<string>();
                var allBits = engine.BitsRegistry.GetAllBits();

                foreach (var bit in allBits)
                {
                    var route = bit.Route;

                    if (!string.IsNullOrEmpty(route))
                    {
                        // Register main route
                        if (!registeredRoutes.Contains(route))
                        {
                            registeredRoutes.Add(route);
                            app.MapGet(route, async (HttpContext context) => await bit.HandleAsync(context));
                            _logger?.Information("Registered route: {Route} for bit {BitType}", route, bit.Name);
                        }

                        // Register config shell route
                        var configRoute = $"{route}/config";
                        if (!registeredRoutes.Contains(configRoute))
                        {
                            registeredRoutes.Add(configRoute);
                            app.MapGet(configRoute, async (HttpContext context) =>
                            {
                                if (!File.Exists(configPagePath))
                                {
                                    context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                                    await context.Response.WriteAsync("Shared configuration shell is missing.");
                                    return;
                                }
                                context.Response.ContentType = "text/html";
                                await context.Response.SendFileAsync(configPagePath);
                            });
                            _logger?.Information("Registered config shell route: {ConfigRoute} for bit {BitType}", configRoute, bit.Name);
                        }

                        // Register config schema route
                        var configSchemaRoute = $"{configRoute}/schema";
                        if (!registeredRoutes.Contains(configSchemaRoute))
                        {
                            registeredRoutes.Add(configSchemaRoute);
                            app.MapGet(configSchemaRoute, async (HttpContext context) => await bit.HandleAsync(context));
                            _logger?.Information("Registered config schema route: {ConfigRoute} for bit {BitType}", configSchemaRoute, bit.Name);
                        }

                        // Register config value route
                        var configValueRoute = $"{configRoute}/value";
                        if (!registeredRoutes.Contains(configValueRoute))
                        {
                            registeredRoutes.Add(configValueRoute);
                            app.MapMethods(configValueRoute, new[] { "GET", "POST" }, async (HttpContext context) => await bit.HandleAsync(context));
                            _logger?.Information("Registered config value route: {ConfigRoute} for bit {BitType}", configValueRoute, bit.Name);
                        }

                        // Register UI routes if bit has user interface
                        if (bit.HasUserInterface)
                        {
                            var uiRoute = $"{route}/ui";
                            if (!registeredRoutes.Contains(uiRoute))
                            {
                                registeredRoutes.Add(uiRoute);
                                app.MapGet(uiRoute, async (HttpContext context) => await bit.HandleUIAsync(context));
                                _logger?.Information("Registered UI route: {UIRoute} for bit {BitType}", uiRoute, bit.Name);
                            }

                            // Register catch-all route for UI assets
                            var assetsRoute = $"{uiRoute}/{{*path}}";
                            if (!registeredRoutes.Contains(assetsRoute))
                            {
                                registeredRoutes.Add(assetsRoute);
                                app.MapGet(assetsRoute, async (HttpContext context) => await bit.HandleUIAsync(context));
                                _logger?.Information("Registered assets route: {AssetsRoute} for bit {BitType}", assetsRoute, bit.Name);
                            }
                        }
                    }
                }
            };

            host.ConfigureRoutes(routeConfigurator);
        }
    }
}
