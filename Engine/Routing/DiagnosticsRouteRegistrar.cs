using Core.Bits;
using Core.Diagnostics.StartupChecks;
using Core.Runners;
using Core.State;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using System.Text.Json;

namespace Engine.Routing;

internal sealed class DiagnosticsRouteRegistrar
{
    public void Register(RouteRegistrarContext context)
    {
        var app = context.App;
        var registeredRoutes = context.RegisteredRoutes;
        var engine = context.Engine;
        var plugins = context.Plugins;
        var jsonOptions = context.JsonOptions;
        var logger = context.Logger;

        var diagnosticsRoute = "/diagnostics";
        if (!registeredRoutes.Add(diagnosticsRoute))
        {
            return;
        }

        app.MapGet(diagnosticsRoute, async (HttpContext httpContext) =>
        {
            var runnerRegistry = httpContext.RequestServices.GetService<IRunnerRegistry>();
            var stateRegistry = httpContext.RequestServices.GetService<IBitStateStoreRegistry>();
            var messageBus = httpContext.RequestServices.GetService<Core.Messaging.IMessageBus>();
            var scheduler = httpContext.RequestServices.GetService<Core.Scheduling.IScheduler>();
            var configStore = httpContext.RequestServices.GetService<Core.Bits.IBitConfigStore>();

            var bits = engine.BitsRegistry.GetAllBits().Select(bit =>
            {
                var configured = IsBitConfigured(bit, configStore);
                var stateKey = BitRouteHelpers.GetStateKey(bit);
                object? snapshot = null;
                var hasState = false;
                var subscriberCount = 0;
                long pendingUpdates = 0;
                DateTime? lastUpdatedUtc = null;

                if (stateRegistry != null && stateRegistry.TryGet(stateKey, out var store))
                {
                    hasState = true;
                    snapshot = store.GetSnapshot();

                    if (store is IBitStateStoreDiagnostics diagnostics)
                    {
                        subscriberCount = diagnostics.SubscriberCount;
                        pendingUpdates = diagnostics.PendingUpdates;
                        lastUpdatedUtc = diagnostics.LastUpdatedUtc == DateTime.MinValue
                            ? null
                            : diagnostics.LastUpdatedUtc;
                    }
                }

                return new
                {
                    name = bit.Name,
                    route = bit.Route,
                    description = bit.Description,
                    type = bit.GetType().FullName,
                    hasUi = bit.HasUserInterface,
                    hasDebug = bit is IBitDebugProvider,
                    configured,
                    stateKey,
                    hasState,
                    state = snapshot,
                    stateDiagnostics = new
                    {
                        subscriberCount,
                        pendingUpdates,
                        lastUpdatedUtc
                    }
                };
            }).ToList();

            var runners = runnerRegistry?.GetAllRunners()
                .Select(runner => (object)new
                {
                    name = runner.Name,
                    isRunning = runner.IsRunning,
                    type = runner.GetType().FullName
                })
                .ToList() ?? new List<object>();

            var pluginList = plugins.Select(plugin => new
            {
                id = plugin.PluginId,
                directory = plugin.PluginDirectory,
                entryAssembly = plugin.AssemblyPath,
                bitCount = plugin.BitTypes.Count,
                entrypointCount = plugin.Entrypoints.Count
            }).ToList();

            object? messageBusDiagnostics = null;
            if (messageBus is Core.Messaging.IMessageBusDiagnostics busDiagnostics)
            {
                messageBusDiagnostics = new
                {
                    pendingMessages = busDiagnostics.PendingMessages,
                    subscriptionCount = busDiagnostics.SubscriptionCount,
                    lastPublishedUtc = busDiagnostics.LastPublishedUtc == DateTime.MinValue
                        ? (DateTime?)null
                        : busDiagnostics.LastPublishedUtc
                };
            }

            object? schedulerDiagnostics = null;
            if (scheduler is Core.Scheduling.ISchedulerDiagnostics schedulerDiag)
            {
                schedulerDiagnostics = new
                {
                    taskCount = schedulerDiag.TaskCount,
                    isStopping = schedulerDiag.IsStopping
                };
            }

            var payload = new
            {
                timestampUtc = DateTime.UtcNow,
                engine = new
                {
                    runId = Core.Logging.LoggerFactory.CurrentRunId,
                    environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production"
                },
                bits,
                runners,
                plugins = pluginList,
                messageBus = messageBusDiagnostics,
                scheduler = schedulerDiagnostics
            };

            httpContext.Response.ContentType = "application/json";
            await httpContext.Response.WriteAsync(JsonSerializer.Serialize(payload, jsonOptions));
        });

        var startupRoute = "/diagnostics/startup";
        if (registeredRoutes.Add(startupRoute))
        {
            app.MapGet(startupRoute, async (HttpContext httpContext) =>
            {
                var registry = httpContext.RequestServices.GetService<IStartupCheckRegistry>();
                if (registry == null)
                {
                    httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
                    await httpContext.Response.WriteAsync("Startup check registry not available.");
                    return;
                }

                var report = registry.GetLastReport();
                if (report == null)
                {
                    httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
                    await httpContext.Response.WriteAsync("Startup checks have not been run.");
                    return;
                }

                httpContext.Response.ContentType = "application/json";
                await httpContext.Response.WriteAsync(JsonSerializer.Serialize(report, jsonOptions));
            });
        }

        logger?.Information("Registered diagnostics route: {DiagnosticsRoute}", diagnosticsRoute);
    }

    private static bool IsBitConfigured(IBit bit, Core.Bits.IBitConfigStore? configStore)
    {
        var requires = bit.GetType().GetCustomAttributes(typeof(Core.Bits.RequiresConfigurationAttribute), false).Any();
        if (!requires)
        {
            return true;
        }

        if (configStore == null)
        {
            return false;
        }

        var name = bit.GetType().Name;
        if (name.EndsWith("Bit", StringComparison.OrdinalIgnoreCase))
        {
            name = name[..^3];
        }

        var key = name.ToLowerInvariant();
        return configStore.Exists(key);
    }
}
