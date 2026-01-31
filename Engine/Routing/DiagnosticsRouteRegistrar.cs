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

            var bits = engine.BitsRegistry.GetAllBits().Select(bit =>
            {
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
                bits,
                runners,
                plugins = pluginList,
                messageBus = messageBusDiagnostics,
                scheduler = schedulerDiagnostics
            };

            httpContext.Response.ContentType = "application/json";
            await httpContext.Response.WriteAsync(JsonSerializer.Serialize(payload, jsonOptions));
        });

        logger?.Information("Registered diagnostics route: {DiagnosticsRoute}", diagnosticsRoute);
    }
}
