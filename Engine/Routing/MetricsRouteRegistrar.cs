using System.Globalization;
using System.Text;
using System.Text.Json;
using Core.Bits;
using Core.Runners;
using Core.State;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

namespace Engine.Routing;

internal sealed class MetricsRouteRegistrar
{
    public void Register(RouteRegistrarContext context)
    {
        RegisterJsonMetrics(context);
        RegisterPrometheusMetrics(context);
    }

    private static void RegisterJsonMetrics(RouteRegistrarContext context)
    {
        var app = context.App;
        var registeredRoutes = context.RegisteredRoutes;
        var engine = context.Engine;
        var plugins = context.Plugins;
        var jsonOptions = context.JsonOptions;
        var logger = context.Logger;

        var metricsRoute = "/metrics";
        if (!registeredRoutes.Add(metricsRoute))
        {
            return;
        }

        app.MapGet(metricsRoute, async (HttpContext httpContext) =>
        {
            var runnerRegistry = httpContext.RequestServices.GetService<IRunnerRegistry>();
            var stateRegistry = httpContext.RequestServices.GetService<IBitStateStoreRegistry>();
            var messageBus = httpContext.RequestServices.GetService<Core.Messaging.IMessageBus>();
            var scheduler = httpContext.RequestServices.GetService<Core.Scheduling.IScheduler>();

            var bitsList = engine.BitsRegistry.GetAllBits().ToList();
            var runnersList = runnerRegistry?.GetAllRunners() ?? Array.Empty<IRunner>();

            var stateStoreCount = 0;
            var sseSubscriberCount = 0;
            long pendingUpdates = 0;
            if (stateRegistry != null)
            {
                foreach (var bit in bitsList)
                {
                    if (stateRegistry.TryGet(BitRouteHelpers.GetStateKey(bit), out var store))
                    {
                        stateStoreCount++;
                        if (store is IBitStateStoreDiagnostics diagnostics)
                        {
                            sseSubscriberCount += diagnostics.SubscriberCount;
                            pendingUpdates += diagnostics.PendingUpdates;
                        }
                    }
                }
            }

            var payload = new
            {
                timestampUtc = DateTime.UtcNow,
                uptimeSeconds = (DateTime.UtcNow - engine.StartTime).TotalSeconds,
                bits = new
                {
                    total = bitsList.Count,
                    withUi = bitsList.Count(bit => bit.HasUserInterface),
                    withState = stateStoreCount
                },
                runners = new
                {
                    total = runnersList.Count,
                    running = runnersList.Count(runner => runner.IsRunning)
                },
                plugins = new
                {
                    total = plugins.Count,
                    bits = plugins.Sum(plugin => plugin.BitTypes.Count),
                    entrypoints = plugins.Sum(plugin => plugin.Entrypoints.Count)
                },
                stateStores = new
                {
                    sseSubscribers = sseSubscriberCount,
                    pendingUpdates = pendingUpdates
                },
                messageBus = messageBus is Core.Messaging.IMessageBusDiagnostics busDiagnostics
                    ? new
                    {
                        pendingMessages = busDiagnostics.PendingMessages,
                        subscriptionCount = busDiagnostics.SubscriptionCount,
                        lastPublishedUtc = busDiagnostics.LastPublishedUtc == DateTime.MinValue
                            ? (DateTime?)null
                            : busDiagnostics.LastPublishedUtc
                    }
                    : null,
                scheduler = scheduler is Core.Scheduling.ISchedulerDiagnostics schedulerDiag
                    ? new
                    {
                        taskCount = schedulerDiag.TaskCount,
                        isStopping = schedulerDiag.IsStopping
                    }
                    : null
            };

            httpContext.Response.ContentType = "application/json";
            await httpContext.Response.WriteAsync(JsonSerializer.Serialize(payload, jsonOptions));
        });

        logger?.Information("Registered metrics route: {MetricsRoute}", metricsRoute);
    }

    private static void RegisterPrometheusMetrics(RouteRegistrarContext context)
    {
        var app = context.App;
        var registeredRoutes = context.RegisteredRoutes;
        var engine = context.Engine;
        var plugins = context.Plugins;
        var logger = context.Logger;

        var promMetricsRoute = "/metrics/prometheus";
        if (!registeredRoutes.Add(promMetricsRoute))
        {
            return;
        }

        app.MapGet(promMetricsRoute, async (HttpContext httpContext) =>
        {
            var runnerRegistry = httpContext.RequestServices.GetService<IRunnerRegistry>();
            var stateRegistry = httpContext.RequestServices.GetService<IBitStateStoreRegistry>();
            var messageBus = httpContext.RequestServices.GetService<Core.Messaging.IMessageBus>();
            var scheduler = httpContext.RequestServices.GetService<Core.Scheduling.IScheduler>();

            var bitsList = engine.BitsRegistry.GetAllBits().ToList();
            var runnersList = runnerRegistry?.GetAllRunners() ?? Array.Empty<IRunner>();

            var stateStoreCount = 0;
            var sseSubscriberCount = 0;
            long pendingUpdates = 0;

            if (stateRegistry != null)
            {
                foreach (var bit in bitsList)
                {
                    if (stateRegistry.TryGet(BitRouteHelpers.GetStateKey(bit), out var store))
                    {
                        stateStoreCount++;
                        if (store is IBitStateStoreDiagnostics diagnostics)
                        {
                            sseSubscriberCount += diagnostics.SubscriberCount;
                            pendingUpdates += diagnostics.PendingUpdates;
                        }
                    }
                }
            }

            var uptimeSeconds = (DateTime.UtcNow - engine.StartTime).TotalSeconds;

            static string EscapeLabel(string? value)
            {
                if (string.IsNullOrEmpty(value))
                {
                    return string.Empty;
                }

                return value.Replace("\\", "\\\\", StringComparison.Ordinal)
                    .Replace("\"", "\\\"", StringComparison.Ordinal)
                    .Replace("\n", "\\n", StringComparison.Ordinal);
            }

            var sb = new StringBuilder();
            sb.AppendLine("# HELP streamcraft_uptime_seconds Uptime of the StreamCraft engine in seconds.");
            sb.AppendLine("# TYPE streamcraft_uptime_seconds gauge");
            sb.AppendLine($"streamcraft_uptime_seconds {uptimeSeconds.ToString(CultureInfo.InvariantCulture)}");

            sb.AppendLine("# HELP streamcraft_bits_total Total number of bits.");
            sb.AppendLine("# TYPE streamcraft_bits_total gauge");
            sb.AppendLine($"streamcraft_bits_total {bitsList.Count}");

            sb.AppendLine("# HELP streamcraft_bits_with_ui Total number of bits with UI.");
            sb.AppendLine("# TYPE streamcraft_bits_with_ui gauge");
            sb.AppendLine($"streamcraft_bits_with_ui {bitsList.Count(bit => bit.HasUserInterface)}");

            sb.AppendLine("# HELP streamcraft_bits_with_state Total number of bits with state stores.");
            sb.AppendLine("# TYPE streamcraft_bits_with_state gauge");
            sb.AppendLine($"streamcraft_bits_with_state {stateStoreCount}");

            sb.AppendLine("# HELP streamcraft_runners_total Total number of runners.");
            sb.AppendLine("# TYPE streamcraft_runners_total gauge");
            sb.AppendLine($"streamcraft_runners_total {runnersList.Count}");

            sb.AppendLine("# HELP streamcraft_runners_running Total number of running runners.");
            sb.AppendLine("# TYPE streamcraft_runners_running gauge");
            sb.AppendLine($"streamcraft_runners_running {runnersList.Count(runner => runner.IsRunning)}");

            sb.AppendLine("# HELP streamcraft_plugins_total Total number of plugins.");
            sb.AppendLine("# TYPE streamcraft_plugins_total gauge");
            sb.AppendLine($"streamcraft_plugins_total {plugins.Count}");

            sb.AppendLine("# HELP streamcraft_plugins_bits Total number of bits declared by plugins.");
            sb.AppendLine("# TYPE streamcraft_plugins_bits gauge");
            sb.AppendLine($"streamcraft_plugins_bits {plugins.Sum(plugin => plugin.BitTypes.Count)}");

            sb.AppendLine("# HELP streamcraft_plugins_entrypoints Total number of plugin entrypoints.");
            sb.AppendLine("# TYPE streamcraft_plugins_entrypoints gauge");
            sb.AppendLine($"streamcraft_plugins_entrypoints {plugins.Sum(plugin => plugin.Entrypoints.Count)}");

            sb.AppendLine("# HELP streamcraft_state_sse_subscribers Total number of SSE subscribers across all state stores.");
            sb.AppendLine("# TYPE streamcraft_state_sse_subscribers gauge");
            sb.AppendLine($"streamcraft_state_sse_subscribers {sseSubscriberCount}");

            sb.AppendLine("# HELP streamcraft_state_pending_updates Pending update count across all state stores.");
            sb.AppendLine("# TYPE streamcraft_state_pending_updates gauge");
            sb.AppendLine($"streamcraft_state_pending_updates {pendingUpdates}");

            if (messageBus is Core.Messaging.IMessageBusDiagnostics busDiagnostics)
            {
                sb.AppendLine("# HELP streamcraft_messagebus_pending_messages Pending messages queued on the bus.");
                sb.AppendLine("# TYPE streamcraft_messagebus_pending_messages gauge");
                sb.AppendLine($"streamcraft_messagebus_pending_messages {busDiagnostics.PendingMessages}");

                sb.AppendLine("# HELP streamcraft_messagebus_subscription_count Total number of message subscriptions.");
                sb.AppendLine("# TYPE streamcraft_messagebus_subscription_count gauge");
                sb.AppendLine($"streamcraft_messagebus_subscription_count {busDiagnostics.SubscriptionCount}");

                if (busDiagnostics.LastPublishedUtc != DateTime.MinValue)
                {
                    var lastPublished = new DateTimeOffset(busDiagnostics.LastPublishedUtc).ToUnixTimeSeconds();
                    sb.AppendLine("# HELP streamcraft_messagebus_last_published_timestamp_seconds Last published time as Unix timestamp seconds.");
                    sb.AppendLine("# TYPE streamcraft_messagebus_last_published_timestamp_seconds gauge");
                    sb.AppendLine($"streamcraft_messagebus_last_published_timestamp_seconds {lastPublished}");
                }
            }

            if (scheduler is Core.Scheduling.ISchedulerDiagnostics schedulerDiag)
            {
                sb.AppendLine("# HELP streamcraft_scheduler_tasks Total number of scheduled periodic tasks.");
                sb.AppendLine("# TYPE streamcraft_scheduler_tasks gauge");
                sb.AppendLine($"streamcraft_scheduler_tasks {schedulerDiag.TaskCount}");

                sb.AppendLine("# HELP streamcraft_scheduler_is_stopping Whether scheduler is stopping (1 = true, 0 = false).");
                sb.AppendLine("# TYPE streamcraft_scheduler_is_stopping gauge");
                sb.AppendLine($"streamcraft_scheduler_is_stopping {(schedulerDiag.IsStopping ? 1 : 0)}");
            }

            sb.AppendLine("# HELP streamcraft_bit_has_ui Whether a bit has UI (1 = true, 0 = false).");
            sb.AppendLine("# TYPE streamcraft_bit_has_ui gauge");
            foreach (var bit in bitsList)
            {
                var labels = $"bit=\"{EscapeLabel(bit.Name)}\",route=\"{EscapeLabel(bit.Route)}\"";
                sb.AppendLine($"streamcraft_bit_has_ui{{{labels}}} {(bit.HasUserInterface ? 1 : 0)}");
            }

            sb.AppendLine("# HELP streamcraft_bit_has_state Whether a bit has a state store (1 = true, 0 = false).");
            sb.AppendLine("# TYPE streamcraft_bit_has_state gauge");
            foreach (var bit in bitsList)
            {
                var labels = $"bit=\"{EscapeLabel(bit.Name)}\",route=\"{EscapeLabel(bit.Route)}\"";
                var hasState = stateRegistry != null && stateRegistry.TryGet(BitRouteHelpers.GetStateKey(bit), out _);
                sb.AppendLine($"streamcraft_bit_has_state{{{labels}}} {(hasState ? 1 : 0)}");
            }

            sb.AppendLine("# HELP streamcraft_bit_state_sse_subscribers SSE subscribers per bit state store.");
            sb.AppendLine("# TYPE streamcraft_bit_state_sse_subscribers gauge");
            sb.AppendLine("# HELP streamcraft_bit_state_pending_updates Pending updates per bit state store.");
            sb.AppendLine("# TYPE streamcraft_bit_state_pending_updates gauge");
            sb.AppendLine("# HELP streamcraft_bit_state_last_updated_timestamp_seconds Last state update time as Unix timestamp seconds.");
            sb.AppendLine("# TYPE streamcraft_bit_state_last_updated_timestamp_seconds gauge");
            if (stateRegistry != null)
            {
                foreach (var bit in bitsList)
                {
                    if (!stateRegistry.TryGet(BitRouteHelpers.GetStateKey(bit), out var store))
                    {
                        continue;
                    }

                    if (store is IBitStateStoreDiagnostics diagnostics)
                    {
                        var labels = $"bit=\"{EscapeLabel(bit.Name)}\",route=\"{EscapeLabel(bit.Route)}\"";
                        sb.AppendLine($"streamcraft_bit_state_sse_subscribers{{{labels}}} {diagnostics.SubscriberCount}");
                        sb.AppendLine($"streamcraft_bit_state_pending_updates{{{labels}}} {diagnostics.PendingUpdates}");

                        if (diagnostics.LastUpdatedUtc != DateTime.MinValue)
                        {
                            var unixSeconds = new DateTimeOffset(diagnostics.LastUpdatedUtc).ToUnixTimeSeconds();
                            sb.AppendLine($"streamcraft_bit_state_last_updated_timestamp_seconds{{{labels}}} {unixSeconds}");
                        }
                    }
                }
            }

            sb.AppendLine("# HELP streamcraft_runner_running Whether a runner is running (1 = true, 0 = false).");
            sb.AppendLine("# TYPE streamcraft_runner_running gauge");
            foreach (var runner in runnersList)
            {
                var labels = $"runner=\"{EscapeLabel(runner.Name)}\"";
                sb.AppendLine($"streamcraft_runner_running{{{labels}}} {(runner.IsRunning ? 1 : 0)}");
            }

            httpContext.Response.ContentType = "text/plain; version=0.0.4";
            await httpContext.Response.WriteAsync(sb.ToString());
        });

        logger?.Information("Registered Prometheus metrics route: {MetricsRoute}", promMetricsRoute);
    }
}
