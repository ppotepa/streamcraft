using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Serilog;
using Hosting;
using Core.Bits;
using Core.Bits.Templates;
using Core.Runners;
using Core.State;
using System.Text.Json;
using Engine.Services;
using Core.Plugins;

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

        var templateRegistry = new BitTemplateRegistry();
        var definitionStore = new BitDefinitionStore(logger: _logger);

        var pluginDiscovery = new PluginDiscoveryService(_logger);
        var pluginResult = pluginDiscovery.Discover(_configuration.BitsFolder);

        PluginContext CreatePluginContext(PluginDescriptor plugin) =>
            new(plugin.PluginId, plugin.PluginDirectory, _appConfiguration!, _logger);

        // Create shared message bus for inter-bit communication
        var sharedMessageBus = new Core.Messaging.MessageBus(_logger);

        // Build the application host
        var host = new ApplicationHostBuilder()
            .UseLogger(_logger)
            .UseUrl(_hostUrl ?? "http://localhost:5000")
            .ConfigureServices(services =>
            {
                // Register shared infrastructure
                services.AddSingleton<Core.Messaging.IMessageBus>(sharedMessageBus);
                services.AddSingleton<Serilog.ILogger>(_logger);
                services.AddSingleton(templateRegistry);
                services.AddSingleton(definitionStore);
                services.AddSingleton<IBitConfigStore, FileBitConfigStore>();
                services.AddSingleton<IRunnerRegistry, RunnerRegistry>();
                services.AddHostedService<RunnerHostService>();
                services.AddSingleton<IBitStateStoreRegistry, BitStateStoreRegistry>();
                services.AddHostedService<Core.State.StateStoreCleanupService>();
                services.AddSingleton<Core.Scheduling.IScheduler, Core.Scheduling.PeriodicTaskScheduler>();
                services.AddHostedService(sp => (Core.Scheduling.PeriodicTaskScheduler)sp.GetRequiredService<Core.Scheduling.IScheduler>());

                // Ensure Engine controllers are discoverable by MVC
                services.AddControllers()
                    .AddApplicationPart(typeof(Engine.Controllers.BitTemplatesController).Assembly);

                foreach (var plugin in pluginResult.Plugins)
                {
                    foreach (var entrypoint in plugin.Entrypoints)
                    {
                        entrypoint.ConfigureServices(services, CreatePluginContext(plugin));
                    }
                }
            })
            .ConfigureMiddleware(app =>
            {
                // Discover and register static file paths
                var staticFileService = new StaticFileService(_logger);
                staticFileService.DiscoverStaticPaths();
                staticFileService.RegisterStaticFiles(app);

                foreach (var plugin in pluginResult.Plugins)
                {
                    foreach (var entrypoint in plugin.Entrypoints)
                    {
                        entrypoint.MapEndpoints(app, CreatePluginContext(plugin));
                    }
                }
            })
            .Build();

        // Create engine - it will get proper IServiceProvider after host starts
        var engine = new StreamCraftEngine(
            _configuration,
            _logger,
            host,
            _appConfiguration,
            null!, // Will be set after host starts
            sharedMessageBus,
            templateRegistry,
            definitionStore);

        host.ConfigureInitialization(serviceProvider =>
        {
            engine.InitializeDiscoveredBits(serviceProvider);
            engine.StartEngine();
        });

        engine.RegisterDiscoveredBits(pluginResult.BitTypes);
        await engine.DiscoverDynamicBitsAsync();

        // Configure host with bit routes
        ConfigureBitRoutes(host, engine, pluginResult.Plugins);

        return engine;
    }

    private void ConfigureBitRoutes(IApplicationHostService host, StreamCraftEngine engine, IReadOnlyList<PluginDescriptor> plugins)
    {
        // This will be called when the host starts to register bit routes
        {
            var configPagePath = Path.Combine(host.StaticAssetsRoot, "config", "index.html");
            var jsonOptions = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = true
            };
            Action<WebApplication> routeConfigurator = app =>
            {
                var registeredRoutes = new HashSet<string>();
                var allBits = engine.BitsRegistry.GetAllBits();

                var diagnosticsRoute = "/diagnostics";
                if (!registeredRoutes.Contains(diagnosticsRoute))
                {
                    registeredRoutes.Add(diagnosticsRoute);
                    app.MapGet(diagnosticsRoute, async (HttpContext context) =>
                    {
                        var runnerRegistry = context.RequestServices.GetService<IRunnerRegistry>();
                        var stateRegistry = context.RequestServices.GetService<IBitStateStoreRegistry>();
                        var messageBus = context.RequestServices.GetService<Core.Messaging.IMessageBus>();
                        var scheduler = context.RequestServices.GetService<Core.Scheduling.IScheduler>();

                        var bits = allBits.Select(bit =>
                        {
                            var stateKey = GetStateKey(bit);
                            object? snapshot = null;
                            bool hasState = false;
                            int subscriberCount = 0;
                            long pendingUpdates = 0;
                            DateTime? lastUpdatedUtc = null;

                            if (stateRegistry != null && stateRegistry.TryGet(stateKey, out var store))
                            {
                                hasState = true;
                                snapshot = store.GetSnapshot();

                                if (store is Core.State.IBitStateStoreDiagnostics diagnostics)
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
                                stateKey = stateKey,
                                hasState = hasState,
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
                            bits = bits,
                            runners = runners,
                            plugins = pluginList,
                            messageBus = messageBusDiagnostics,
                            scheduler = schedulerDiagnostics
                        };

                        context.Response.ContentType = "application/json";
                        await context.Response.WriteAsync(JsonSerializer.Serialize(payload, jsonOptions));
                    });
                    _logger?.Information("Registered diagnostics route: {DiagnosticsRoute}", diagnosticsRoute);
                }

                var metricsRoute = "/metrics";
                if (!registeredRoutes.Contains(metricsRoute))
                {
                    registeredRoutes.Add(metricsRoute);
                    app.MapGet(metricsRoute, async (HttpContext context) =>
                    {
                        var runnerRegistry = context.RequestServices.GetService<IRunnerRegistry>();
                        var stateRegistry = context.RequestServices.GetService<IBitStateStoreRegistry>();
                        var messageBus = context.RequestServices.GetService<Core.Messaging.IMessageBus>();
                        var scheduler = context.RequestServices.GetService<Core.Scheduling.IScheduler>();

                        var bitsList = allBits.ToList();
                        var runnersList = runnerRegistry?.GetAllRunners() ?? Array.Empty<IRunner>();

                        var stateStoreCount = 0;
                        var sseSubscriberCount = 0;
                        long pendingUpdates = 0;
                        if (stateRegistry != null)
                        {
                            foreach (var bit in bitsList)
                            {
                                if (stateRegistry.TryGet(GetStateKey(bit), out var store))
                                {
                                    stateStoreCount++;
                                    if (store is Core.State.IBitStateStoreDiagnostics diagnostics)
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

                        context.Response.ContentType = "application/json";
                        await context.Response.WriteAsync(JsonSerializer.Serialize(payload, jsonOptions));
                    });
                    _logger?.Information("Registered metrics route: {MetricsRoute}", metricsRoute);
                }

                var promMetricsRoute = "/metrics/prometheus";
                if (!registeredRoutes.Contains(promMetricsRoute))
                {
                    registeredRoutes.Add(promMetricsRoute);
                    app.MapGet(promMetricsRoute, async (HttpContext context) =>
                    {
                        var runnerRegistry = context.RequestServices.GetService<IRunnerRegistry>();
                        var stateRegistry = context.RequestServices.GetService<IBitStateStoreRegistry>();
                        var messageBus = context.RequestServices.GetService<Core.Messaging.IMessageBus>();
                        var scheduler = context.RequestServices.GetService<Core.Scheduling.IScheduler>();

                        var bitsList = allBits.ToList();
                        var runnersList = runnerRegistry?.GetAllRunners() ?? Array.Empty<IRunner>();

                        var stateStoreCount = 0;
                        var sseSubscriberCount = 0;
                        long pendingUpdates = 0;

                        if (stateRegistry != null)
                        {
                            foreach (var bit in bitsList)
                            {
                                if (stateRegistry.TryGet(GetStateKey(bit), out var store))
                                {
                                    stateStoreCount++;
                                    if (store is Core.State.IBitStateStoreDiagnostics diagnostics)
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

                        var sb = new System.Text.StringBuilder();
                        sb.AppendLine("# HELP streamcraft_uptime_seconds Uptime of the StreamCraft engine in seconds.");
                        sb.AppendLine("# TYPE streamcraft_uptime_seconds gauge");
                        sb.AppendLine($"streamcraft_uptime_seconds {uptimeSeconds.ToString(System.Globalization.CultureInfo.InvariantCulture)}");

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
                            var hasState = stateRegistry != null && stateRegistry.TryGet(GetStateKey(bit), out _);
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
                                if (!stateRegistry.TryGet(GetStateKey(bit), out var store))
                                {
                                    continue;
                                }

                                if (store is Core.State.IBitStateStoreDiagnostics diagnostics)
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

                        context.Response.ContentType = "text/plain; version=0.0.4";
                        await context.Response.WriteAsync(sb.ToString());
                    });
                    _logger?.Information("Registered Prometheus metrics route: {MetricsRoute}", promMetricsRoute);
                }

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

                        // Register state snapshot route
                        var stateRoute = $"{route}/state";
                        if (!registeredRoutes.Contains(stateRoute))
                        {
                            registeredRoutes.Add(stateRoute);
                            app.MapGet(stateRoute, async (HttpContext context) =>
                            {
                                var registry = context.RequestServices.GetService<IBitStateStoreRegistry>();
                                if (registry == null || !registry.TryGet(GetStateKey(bit), out var store))
                                {
                                    context.Response.StatusCode = StatusCodes.Status404NotFound;
                                    await context.Response.WriteAsync("State store not found.");
                                    return;
                                }

                                context.Response.ContentType = "application/json";
                                var snapshot = store.GetSnapshot();
                                await context.Response.WriteAsync(JsonSerializer.Serialize(snapshot, jsonOptions));
                            });
                            _logger?.Information("Registered state route: {StateRoute} for bit {BitType}", stateRoute, bit.Name);
                        }

                        // Register state SSE stream route
                        var streamRoute = $"{stateRoute}/stream";
                        if (!registeredRoutes.Contains(streamRoute))
                        {
                            registeredRoutes.Add(streamRoute);
                            app.MapGet(streamRoute, async (HttpContext context) =>
                            {
                                var registry = context.RequestServices.GetService<IBitStateStoreRegistry>();
                                if (registry == null || !registry.TryGet(GetStateKey(bit), out var store))
                                {
                                    context.Response.StatusCode = StatusCodes.Status404NotFound;
                                    await context.Response.WriteAsync("State store not found.");
                                    return;
                                }

                                context.Response.Headers.Append("Content-Type", "text/event-stream");
                                context.Response.Headers.Append("Cache-Control", "no-cache");
                                context.Response.Headers.Append("Connection", "keep-alive");
                                await context.Response.WriteAsync("retry: 1000\n\n");

                                try
                                {
                                    await foreach (var snapshot in store.WatchAsync(context.RequestAborted))
                                    {
                                        var payload = JsonSerializer.Serialize(snapshot, jsonOptions);
                                        await context.Response.WriteAsync($"data: {payload}\n\n");
                                        await context.Response.Body.FlushAsync();
                                    }
                                }
                                catch (OperationCanceledException)
                                {
                                    // Client disconnected
                                }
                            });
                            _logger?.Information("Registered state stream route: {StreamRoute} for bit {BitType}", streamRoute, bit.Name);
                        }

                        // Register UI routes if bit has user interface
                        if (bit.HasUserInterface)
                        {
                            var uiRoute = $"{route}/ui";
                            if (!registeredRoutes.Contains(uiRoute))
                            {
                                registeredRoutes.Add(uiRoute);
                                var uiRoot = TryResolveUiRoot(bit);

                                if (!string.IsNullOrWhiteSpace(uiRoot))
                                {
                                    registeredRoutes.Add($"{uiRoute}/{{*path}}");
                                    app.Map(uiRoute, uiApp => ConfigureUiStaticFiles(uiApp, uiRoot));
                                    _logger?.Information("Registered UI static files: {UIRoute} → {UiRoot} for bit {BitType}", uiRoute, uiRoot, bit.Name);
                                }
                                else
                                {
                                    app.MapGet(uiRoute, async (HttpContext context) => await bit.HandleUIAsync(context));
                                    _logger?.Information("Registered UI route: {UIRoute} for bit {BitType}", uiRoute, bit.Name);

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
                    }
                }
            };

            host.ConfigureRoutes(routeConfigurator);
        }
    }

    private static string GetStateKey(Core.Bits.IBit bit)
    {
        var route = (bit.Route ?? string.Empty).Trim('/');
        if (!string.IsNullOrWhiteSpace(route))
        {
            return route.ToLowerInvariant();
        }

        return bit.Name.Trim().ToLowerInvariant();
    }

    private static string? TryResolveUiRoot(Core.Bits.IBit bit)
    {
        var assemblyLocation = Path.GetDirectoryName(bit.GetType().Assembly.Location);
        if (string.IsNullOrWhiteSpace(assemblyLocation))
        {
            return null;
        }

        var distPath = Path.Combine(assemblyLocation, "ui", "dist");
        if (Directory.Exists(distPath))
        {
            return distPath;
        }

        var uiPath = Path.Combine(assemblyLocation, "ui");
        return Directory.Exists(uiPath) ? uiPath : null;
    }

    private static void ConfigureUiStaticFiles(IApplicationBuilder app, string uiRoot)
    {
        var fileProvider = new PhysicalFileProvider(uiRoot);

        app.UseDefaultFiles(new DefaultFilesOptions
        {
            FileProvider = fileProvider
        });

        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = fileProvider
        });

        app.Run(async context =>
        {
            if (!Path.HasExtension(context.Request.Path.Value ?? string.Empty))
            {
                var indexPath = Path.Combine(uiRoot, "index.html");
                if (File.Exists(indexPath))
                {
                    context.Response.ContentType = "text/html";
                    await context.Response.SendFileAsync(indexPath);
                    return;
                }
            }

            context.Response.StatusCode = StatusCodes.Status404NotFound;
            await context.Response.WriteAsync("UI file not found.");
        });
    }
}
