using StreamCraft.Core.Bits;
using StreamCraft.Core.Diagnostics.ShutdownChecks;
using StreamCraft.Core.Diagnostics.StartupChecks;
using StreamCraft.Core.Runners;
using StreamCraft.Core.State;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using System.Text.Json;

namespace StreamCraft.Engine.Routing;

internal sealed class DiagnosticsRouteRegistrar
{
    public void Register(RouteRegistrarContext context)
    {
        var app = context.App;
        var registeredRoutes = context.RegisteredRoutes;
        var engine = context.Engine;
        var bits = context.Bits;
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
            var messageBus = httpContext.RequestServices.GetService<StreamCraft.Core.Messaging.IMessageBus>();
            var scheduler = httpContext.RequestServices.GetService<StreamCraft.Core.Scheduling.IScheduler>();
            var configStore = httpContext.RequestServices.GetService<StreamCraft.Core.Bits.IBitConfigStore>();

            var registeredBits = engine.BitsRegistry.GetAllBits().Select(bit =>
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

            var bitAssemblies = context.Bits.Select(bit => new
            {
                id = bit.BitId,
                directory = bit.BitDirectory,
                entryAssembly = bit.AssemblyPath,
                bitCount = bit.BitTypes.Count,
                entrypointCount = bit.Entrypoints.Count
            }).ToList();

            object? messageBusDiagnostics = null;
            if (messageBus is StreamCraft.Core.Messaging.IMessageBusDiagnostics busDiagnostics)
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
            if (scheduler is StreamCraft.Core.Scheduling.ISchedulerDiagnostics schedulerDiag)
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
                    runId = StreamCraft.Core.Logging.LoggerFactory.CurrentRunId,
                    environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production"
                },
                bits = registeredBits,
                runners,
                bitAssemblies,
                plugins = bitAssemblies,
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

        var shutdownRoute = "/diagnostics/shutdown";
        if (registeredRoutes.Add(shutdownRoute))
        {
            app.MapGet(shutdownRoute, async (HttpContext httpContext) =>
            {
                var registry = httpContext.RequestServices.GetService<IShutdownCheckRegistry>();
                if (registry == null)
                {
                    httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
                    await httpContext.Response.WriteAsync("Shutdown check registry not available.");
                    return;
                }

                var report = registry.GetLastReport();
                if (report == null)
                {
                    httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
                    await httpContext.Response.WriteAsync("Shutdown checks have not been run.");
                    return;
                }

                httpContext.Response.ContentType = "application/json";
                await httpContext.Response.WriteAsync(JsonSerializer.Serialize(report, jsonOptions));
            });
        }

        logger?.Information("Registered diagnostics route: {DiagnosticsRoute}", diagnosticsRoute);
    }

    private static bool IsBitConfigured(IBit bit, StreamCraft.Core.Bits.IBitConfigStore? configStore)
    {
        var requires = bit.GetType().GetCustomAttributes(typeof(StreamCraft.Core.Bits.RequiresConfigurationAttribute), false).Any();
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
