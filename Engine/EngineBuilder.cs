using Microsoft.Extensions.DependencyInjection;
using Serilog;
using Hosting;
using Core.Bits;
using Core.Bits.Templates;
using Core.Runners;
using Core.State;
using System.Text.Json;
using Engine.Services;
using Core.Plugins;
using Engine.Routing;
using Core.Data.Postgres;

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
                services.Configure<PostgresDatabaseOptions>(_appConfiguration!.GetSection("StreamCraft:Database"));
                services.AddSingleton<IPostgresMigrationRunner, PostgresMigrationRunner>();
                services.AddSingleton<IBitConfigStore, PostgresBitConfigStore>();
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
            var migrator = serviceProvider.GetService<IPostgresMigrationRunner>();
            if (migrator == null)
            {
                _logger!.Warning("Postgres migration runner is not available. Skipping database migrations.");
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

                try
                {
                    migrator.ApplyMigrations(sources);
                }
                catch (Exception ex)
                {
                    _logger!.Error(ex, "Postgres migrations failed. The host will continue to start, but config persistence may be unavailable.");
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
}
