using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.FileProviders;
using Serilog;
using Hosting;

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

    public StreamCraftEngine Build()
    {
        if (_logger == null)
        {
            throw new InvalidOperationException("Logger must be configured before building the engine. Call ConfigureLogger() first.");
        }

        if (_appConfiguration == null)
        {
            throw new InvalidOperationException("AppSettings configuration must be provided. Call ConfigureAppSettings() first.");
        }

        // Build the application host
        var host = new ApplicationHostBuilder()
            .UseLogger(_logger)
            .UseUrl(_hostUrl ?? "http://localhost:5000")
            .ConfigureServices(services =>
            {
                // Services will be configured after engine is created
            })
            .ConfigureMiddleware(app =>
            {
                // Add /styles route for themes.html
                app.MapGet("/styles", async (HttpContext context) =>
                {
                    var themesPath = Path.Combine(AppContext.BaseDirectory, "themes.html");
                    if (!File.Exists(themesPath))
                    {
                        context.Response.StatusCode = StatusCodes.Status404NotFound;
                        await context.Response.WriteAsync("themes.html not found.");
                        return;
                    }

                    context.Response.ContentType = "text/html";
                    await context.Response.SendFileAsync(themesPath);
                });


                // Redirect root to screens
                app.MapGet("/", async (HttpContext context) =>
                {
                    context.Response.Redirect("/sc2/ui/screens");
                    await Task.CompletedTask;
                });

                // Serve SC2 static assets
                var sc2UiDistPath = Path.Combine(AppContext.BaseDirectory, "bits", "Sc2", "ui", "dist");
                if (Directory.Exists(sc2UiDistPath))
                {
                    app.UseStaticFiles(new StaticFileOptions
                    {
                        FileProvider = new PhysicalFileProvider(sc2UiDistPath),
                        RequestPath = "/sc2/ui"
                    });
                }

                // Add /sc2/ui/screens route for screens preview
                app.MapGet("/sc2/ui/screens", async (HttpContext context) =>
                {
                    var screensPath = Path.Combine(AppContext.BaseDirectory, "bits", "Sc2", "ui", "dist", "screens.html");
                    if (!File.Exists(screensPath))
                    {
                        context.Response.StatusCode = StatusCodes.Status404NotFound;
                        await context.Response.WriteAsync($"screens.html not found. Checked: {screensPath}");
                        return;
                    }

                    context.Response.ContentType = "text/html";
                    await context.Response.SendFileAsync(screensPath);
                });
            })
            .Build();

        var engine = new StreamCraftEngine(_configuration, _logger, host, _appConfiguration);

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
            var configPagePath = Path.Combine(host.StaticAssetsRoot, "config", "index.html");
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

                                _logger?.Information("Registered config shell route: {ConfigRoute} for bit {BitType}", configRoute, bitType.Name);
                            }

                            var configSchemaRoute = $"{configRoute}/schema";
                            if (!registeredRoutes.Contains(configSchemaRoute))
                            {
                                registeredRoutes.Add(configSchemaRoute);

                                app.MapGet(configSchemaRoute, async (HttpContext context) =>
                                {
                                    await (Task)handleMethod.Invoke(bit, new object[] { context })!;
                                });

                                _logger?.Information("Registered config schema route: {ConfigRoute} for bit {BitType}", configSchemaRoute, bitType.Name);
                            }

                            var configValueRoute = $"{configRoute}/value";
                            if (!registeredRoutes.Contains(configValueRoute))
                            {
                                registeredRoutes.Add(configValueRoute);

                                app.MapMethods(configValueRoute, new[] { "GET", "POST" }, async (HttpContext context) =>
                                {
                                    await (Task)handleMethod.Invoke(bit, new object[] { context })!;
                                });

                                _logger?.Information("Registered config value route: {ConfigRoute} for bit {BitType}", configValueRoute, bitType.Name);
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
