using Core.Bits;
using Core.Bits.Templates;
using Core.Data.Postgres;
using Core.Diagnostics;
using Core.Diagnostics.StartupChecks;
using Core.Logging;
using Core.Plugins;
using Core.Runners;
using Core.State;
using Engine.Routing;
using Engine.Services;
using Hosting;
using Microsoft.Extensions.DependencyInjection;
using Serilog;
using System.Text.Json;

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
            throw ExceptionFactory.InvalidOperation("Logger must be configured before building the engine. Call ConfigureLogger() first.");
        }

        if (_appConfiguration == null)
        {
            throw ExceptionFactory.InvalidOperation("AppSettings configuration must be provided. Call ConfigureAppSettings() first.");
        }

        var templateRegistry = new BitTemplateRegistry();
        var definitionStore = new BitDefinitionStore(logger: _logger);

        var pluginDiscovery = new PluginDiscoveryService(_logger);
        var pluginResult = pluginDiscovery.Discover(_configuration.BitsFolder);

        PluginContext CreatePluginContext(PluginDescriptor plugin) =>
            new(plugin.PluginId, plugin.PluginDirectory, _appConfiguration!, _logger);

        // Create shared message bus for inter-bit communication
        var sharedMessageBus = new Core.Messaging.MessageBus(_logger);
        ExceptionFactory.Initialize(_logger);

        // Build the application host
        var host = new ApplicationHostBuilder()
            .UseLogger(_logger)
            .UseUrl(_hostUrl ?? "http://localhost:5000")
            .ConfigureServices(services =>
            {
                // Register shared infrastructure
                services.AddSingleton<Core.Messaging.IMessageBus>(sharedMessageBus);
                services.AddSingleton<Serilog.ILogger>(_logger);
                services.AddSingleton<Core.Data.Sql.ISqlQueryStore, Core.Data.Sql.SqlQueryStore>();
                services.AddSingleton(templateRegistry);
                services.AddSingleton(definitionStore);
                if (LoggerFactory.LogStream != null)
                {
                    services.AddSingleton<ILogEventStream>(LoggerFactory.LogStream);
                }
                services.AddSingleton<IStartupCheckRegistry, StartupCheckRegistry>();
                services.AddSingleton<IStartupCheck, BitsFolderStartupCheck>();
                services.AddSingleton<IStartupCheck, DbConnectionStartupCheck>();
                services.AddSingleton<IStartupCheck, MigrationsStartupCheck>();
                services.AddSingleton<IStartupCheck>(sp =>
                    new BitConfigurationStartupCheck(pluginResult.BitTypes, sp.GetRequiredService<IBitConfigStore>()));
                services.AddSingleton(sp =>
                {
                    var cfg = sp.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>();
                    return new StartupCheckContext(cfg, sp);
                });
                services.AddSingleton<StartupCheckRunner>();
                services.Configure<PostgresDatabaseOptions>(_appConfiguration!.GetSection("StreamCraft:Database"));
                services.AddSingleton<IPostgresMigrationRunner, PostgresMigrationRunner>();
                services.AddSingleton<IBitConfigStore, PostgresBitConfigStore>();
                services.Configure<ExceptionPipelineOptions>(_appConfiguration!.GetSection("StreamCraft:Exceptions"));
                services.AddSingleton<InMemoryExceptionStore>();
                services.AddSingleton<IExceptionStream>(sp => sp.GetRequiredService<InMemoryExceptionStore>());
                services.AddSingleton<IExceptionSink>(sp => sp.GetRequiredService<InMemoryExceptionStore>());
                services.AddSingleton<IExceptionSink, PostgresExceptionSink>();
                services.AddSingleton<ExceptionPipeline>();
                services.AddSingleton<IExceptionPipeline>(sp => sp.GetRequiredService<ExceptionPipeline>());
                services.AddHostedService(sp => sp.GetRequiredService<ExceptionPipeline>());
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
            var pipeline = serviceProvider.GetService<IExceptionPipeline>();
            if (pipeline != null)
            {
                ExceptionFactory.SetPipeline(pipeline);
            }

            var checkRegistry = serviceProvider.GetService<IStartupCheckRegistry>();
            var checkRunner = serviceProvider.GetService<StartupCheckRunner>();
            if (checkRunner != null && checkRegistry != null)
            {
                using var _ = ShouldRenderStartupUi(_appConfiguration)
                    ? new StartupCheckConsoleRenderer(checkRunner)
                    : null;

                var preReport = checkRunner.RunAsync(StartupCheckStage.PreMigrations).GetAwaiter().GetResult();
                ThrowIfCriticalFailed(serviceProvider, preReport);

                var migrator = serviceProvider.GetService<IPostgresMigrationRunner>();
                if (migrator == null)
                {
                    throw new InvalidOperationException("Postgres migration runner is not available.");
                }
                else
                {
                    var sources = new List<MigrationSource>
                    {
                        MigrationSource.FromEmbeddedResources(
                            scopeId: "core",
                            assembly: typeof(PostgresMigrationRunner).Assembly,
                            resourcePrefix: "Core.Sql.Migrations",
                            allowedTablePrefix: "core_")
                    };

                    foreach (var plugin in pluginResult.Plugins)
                    {
                        var bitId = plugin.PluginId.Trim().ToLowerInvariant();
                        if (string.IsNullOrWhiteSpace(bitId))
                        {
                            continue;
                        }

                        var migrationsPath = Path.Combine(plugin.PluginDirectory, "sql", "migrations");
                        sources.Add(MigrationSource.FromDirectory(
                            scopeId: $"bit:{bitId}",
                            directoryPath: migrationsPath,
                            allowedTablePrefix: $"bit_{bitId}_"));
                    }

                    migrator.ApplyMigrations(sources);
                }

                var postReport = checkRunner.RunAsync(StartupCheckStage.PostMigrations).GetAwaiter().GetResult();
                ThrowIfCriticalFailed(serviceProvider, postReport);

                checkRegistry.SetLastReport(CombineReports(preReport, postReport));
            }

            if (checkRunner == null || checkRegistry == null)
            {
                var migrator = serviceProvider.GetService<IPostgresMigrationRunner>();
                if (migrator == null)
                {
                    throw new InvalidOperationException("Postgres migration runner is not available.");
                }
                else
                {
                    var sources = new List<MigrationSource>
                    {
                        MigrationSource.FromEmbeddedResources(
                            scopeId: "core",
                            assembly: typeof(PostgresMigrationRunner).Assembly,
                            resourcePrefix: "Core.Sql.Migrations",
                            allowedTablePrefix: "core_")
                    };

                    foreach (var plugin in pluginResult.Plugins)
                    {
                        var bitId = plugin.PluginId.Trim().ToLowerInvariant();
                        if (string.IsNullOrWhiteSpace(bitId))
                        {
                            continue;
                        }

                        var migrationsPath = Path.Combine(plugin.PluginDirectory, "sql", "migrations");
                        sources.Add(MigrationSource.FromDirectory(
                            scopeId: $"bit:{bitId}",
                            directoryPath: migrationsPath,
                            allowedTablePrefix: $"bit_{bitId}_"));
                    }

                    migrator.ApplyMigrations(sources);
                }
            }

            engine.InitializeDiscoveredBits(serviceProvider);
            engine.StartEngine();
        });

        engine.RegisterDiscoveredBits(pluginResult.BitTypes);
        await engine.DiscoverDynamicBitsAsync();

        // Configure host with bit routes
        ConfigureRoutes(host, engine, pluginResult.Plugins);

        return engine;
    }

    private void ConfigureRoutes(IApplicationHostService host, StreamCraftEngine engine, IReadOnlyList<PluginDescriptor> plugins)
    {
        var jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = true
        };

        host.ConfigureRoutes(app =>
        {
            var registeredRoutes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var registrarContext = new RouteRegistrarContext(app, engine, host, plugins, _logger!, registeredRoutes, jsonOptions);

            new DiagnosticsRouteRegistrar().Register(registrarContext);
            new MetricsRouteRegistrar().Register(registrarContext);
            new BitRouteRegistrar().Register(registrarContext);
        });
    }

    private static bool ShouldRenderStartupUi(Microsoft.Extensions.Configuration.IConfiguration? configuration)
    {
        if (configuration == null)
        {
            return false;
        }

        var value = configuration["StreamCraft:StartupUi:Enabled"];
        return string.Equals(value, "true", StringComparison.OrdinalIgnoreCase);
    }

    private static void ThrowIfCriticalFailed(IServiceProvider serviceProvider, StartupCheckReport report)
    {
        var failed = report.Results
            .Where(r =>
            {
                var check = serviceProvider.GetServices<IStartupCheck>()
                    .FirstOrDefault(c => string.Equals(c.Name, r.Name, StringComparison.OrdinalIgnoreCase));
                return check?.IsCritical == true && r.Status == StartupCheckStatus.Fail;
            })
            .Select(r =>
            {
                var detail = string.IsNullOrWhiteSpace(r.Message) ? "Unknown failure." : r.Message;
                return $"{r.Name} ({detail})";
            })
            .ToList();

        if (failed.Count == 0)
        {
            return;
        }

        var message = $"Startup checks failed: {string.Join("; ", failed)}";
        Log.Error(message);
        throw new InvalidOperationException(message);
    }

    private static StartupCheckReport CombineReports(StartupCheckReport preReport, StartupCheckReport postReport)
    {
        var results = preReport.Results.Concat(postReport.Results).ToList();
        var overall = StartupCheckStatus.Ok;
        if (results.Any(r => r.Status == StartupCheckStatus.Fail))
        {
            overall = StartupCheckStatus.Fail;
        }
        else if (results.Any(r => r.Status == StartupCheckStatus.Warning))
        {
            overall = StartupCheckStatus.Warning;
        }

        return new StartupCheckReport
        {
            StartedUtc = preReport.StartedUtc,
            CompletedUtc = postReport.CompletedUtc,
            OverallStatus = overall,
            Results = results
        };
    }
}
