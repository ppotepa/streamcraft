using Core.Bits;
using Core.State;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using System.Text.Json;

namespace Engine.Routing;

internal sealed class BitRouteRegistrar
{
    public void Register(RouteRegistrarContext context)
    {
        var app = context.App;
        var engine = context.Engine;
        var registeredRoutes = context.RegisteredRoutes;
        var jsonOptions = context.JsonOptions;
        var logger = context.Logger;

        var configPagePath = Path.Combine(context.Host.StaticAssetsRoot, "config", "index.html");
        var allBits = engine.BitsRegistry.GetAllBits();

        foreach (var bit in allBits)
        {
            var route = bit.Route;

            if (string.IsNullOrEmpty(route))
            {
                continue;
            }

            // Register main route
            if (registeredRoutes.Add(route))
            {
                app.MapGet(route, async (HttpContext httpContext) => await bit.HandleAsync(httpContext));
                logger?.Information("Registered route: {Route} for bit {BitType}", route, bit.Name);
            }

            // Register config shell route
            var configRoute = $"{route}/config";
            if (registeredRoutes.Add(configRoute))
            {
                app.MapGet(configRoute, async (HttpContext httpContext) =>
                {
                    if (!File.Exists(configPagePath))
                    {
                        httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
                        await httpContext.Response.WriteAsync("Shared configuration shell is missing.");
                        return;
                    }
                    httpContext.Response.ContentType = "text/html";
                    await httpContext.Response.SendFileAsync(configPagePath);
                });
                logger?.Information("Registered config shell route: {ConfigRoute} for bit {BitType}", configRoute, bit.Name);
            }

            // Register config schema route
            var configSchemaRoute = $"{configRoute}/schema";
            if (registeredRoutes.Add(configSchemaRoute))
            {
                app.MapGet(configSchemaRoute, async (HttpContext httpContext) => await bit.HandleAsync(httpContext));
                logger?.Information("Registered config schema route: {ConfigRoute} for bit {BitType}", configSchemaRoute, bit.Name);
            }

            // Register config value route
            var configValueRoute = $"{configRoute}/value";
            if (registeredRoutes.Add(configValueRoute))
            {
                app.MapMethods(configValueRoute, new[] { "GET", "POST" }, async (HttpContext httpContext) => await bit.HandleAsync(httpContext));
                logger?.Information("Registered config value route: {ConfigRoute} for bit {BitType}", configValueRoute, bit.Name);
            }

            // Register state snapshot route
            var stateRoute = $"{route}/state";
            if (registeredRoutes.Add(stateRoute))
            {
                app.MapGet(stateRoute, async (HttpContext httpContext) =>
                {
                    var registry = httpContext.RequestServices.GetService<IBitStateStoreRegistry>();
                    if (registry == null || !registry.TryGet(BitRouteHelpers.GetStateKey(bit), out var store))
                    {
                        httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
                        await httpContext.Response.WriteAsync("State store not found.");
                        return;
                    }

                    httpContext.Response.ContentType = "application/json";
                    var snapshot = store.GetSnapshot();
                    await httpContext.Response.WriteAsync(JsonSerializer.Serialize(snapshot, jsonOptions));
                });
                logger?.Information("Registered state route: {StateRoute} for bit {BitType}", stateRoute, bit.Name);
            }

            // Register state SSE stream route
            var streamRoute = $"{stateRoute}/stream";
            if (registeredRoutes.Add(streamRoute))
            {
                app.MapGet(streamRoute, async (HttpContext httpContext) =>
                {
                    var registry = httpContext.RequestServices.GetService<IBitStateStoreRegistry>();
                    if (registry == null || !registry.TryGet(BitRouteHelpers.GetStateKey(bit), out var store))
                    {
                        httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
                        await httpContext.Response.WriteAsync("State store not found.");
                        return;
                    }

                    httpContext.Response.Headers.Append("Content-Type", "text/event-stream");
                    httpContext.Response.Headers.Append("Cache-Control", "no-cache");
                    httpContext.Response.Headers.Append("Connection", "keep-alive");
                    await httpContext.Response.WriteAsync("retry: 1000\n\n");

                    try
                    {
                        await foreach (var snapshot in store.WatchAsync(httpContext.RequestAborted))
                        {
                            var payload = JsonSerializer.Serialize(snapshot, jsonOptions);
                            await httpContext.Response.WriteAsync($"data: {payload}\n\n");
                            await httpContext.Response.Body.FlushAsync();
                        }
                    }
                    catch (OperationCanceledException)
                    {
                        // Client disconnected
                    }
                });
                logger?.Information("Registered state stream route: {StreamRoute} for bit {BitType}", streamRoute, bit.Name);
            }

            // Register debug routes (static by convention, optional provider)
            var debugRoute = $"{route}/debug";
            var debugRoot = BitRouteHelpers.TryResolveDebugRoot(bit);
            var debugProvider = bit as IBitDebugProvider;

            if (!string.IsNullOrWhiteSpace(debugRoot))
            {
                registeredRoutes.Add(debugRoute);

                var debugFileProvider = new PhysicalFileProvider(debugRoot);
                app.UseDefaultFiles(new DefaultFilesOptions
                {
                    FileProvider = debugFileProvider,
                    RequestPath = debugRoute
                });

                app.UseStaticFiles(new StaticFileOptions
                {
                    FileProvider = debugFileProvider,
                    RequestPath = debugRoute
                });

                if (debugProvider != null)
                {
                    var debugDataRoute = $"{debugRoute}/data";
                    if (registeredRoutes.Add(debugDataRoute))
                    {
                        app.MapGet(debugDataRoute, debugProvider.HandleDebugAsync);
                        logger?.Information("Registered debug data route: {DebugRoute} for bit {BitType}", debugDataRoute, bit.Name);
                    }
                }

                var debugIndexPath = Path.Combine(debugRoot, "index.html");
                if (File.Exists(debugIndexPath))
                {
                    var debugFallbackRoute = $"{debugRoute}/{{*path}}";
                    if (registeredRoutes.Add(debugFallbackRoute))
                    {
                        app.MapGet(debugFallbackRoute, async (HttpContext httpContext) =>
                        {
                            if (debugProvider != null &&
                                httpContext.Request.Path.Value?.EndsWith("/data", StringComparison.OrdinalIgnoreCase) == true)
                            {
                                await debugProvider.HandleDebugAsync(httpContext);
                                return;
                            }

                            if (!Path.HasExtension(httpContext.Request.Path.Value ?? string.Empty))
                            {
                                httpContext.Response.ContentType = "text/html";
                                await httpContext.Response.SendFileAsync(debugIndexPath);
                                return;
                            }

                            httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
                            await httpContext.Response.WriteAsync("Debug file not found.");
                        });
                    }
                }

                logger?.Information("Registered debug static files: {DebugRoute} → {DebugRoot} for bit {BitType}", debugRoute, debugRoot, bit.Name);
            }
            else if (debugProvider != null)
            {
                if (registeredRoutes.Add(debugRoute))
                {
                    app.MapGet(debugRoute, debugProvider.HandleDebugAsync);
                    logger?.Information("Registered debug route: {DebugRoute} for bit {BitType}", debugRoute, bit.Name);
                }
            }

            // Register UI routes if bit has user interface
            if (bit.HasUserInterface)
            {
                var uiRoute = $"{route}/ui";
                if (registeredRoutes.Add(uiRoute))
                {
                    var uiRoot = BitRouteHelpers.TryResolveUiRoot(bit);

                    if (!string.IsNullOrWhiteSpace(uiRoot))
                    {
                        registeredRoutes.Add($"{uiRoute}/{{*path}}");
                        app.Map(uiRoute, uiApp => BitRouteHelpers.ConfigureUiStaticFiles(uiApp, uiRoot));
                        logger?.Information("Registered UI static files: {UIRoute} → {UiRoot} for bit {BitType}", uiRoute, uiRoot, bit.Name);
                    }
                    else
                    {
                        app.MapGet(uiRoute, async (HttpContext httpContext) => await bit.HandleUIAsync(httpContext));
                        logger?.Information("Registered UI route: {UIRoute} for bit {BitType}", uiRoute, bit.Name);

                        var assetsRoute = $"{uiRoute}/{{*path}}";
                        if (registeredRoutes.Add(assetsRoute))
                        {
                            app.MapGet(assetsRoute, async (HttpContext httpContext) => await bit.HandleUIAsync(httpContext));
                            logger?.Information("Registered assets route: {AssetsRoute} for bit {BitType}", assetsRoute, bit.Name);
                        }
                    }
                }
            }

            if (bit is IBitEndpointContributor contributor)
            {
                contributor.MapEndpoints(app);
            }
        }
    }
}
