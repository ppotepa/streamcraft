using StreamCraft.Core.Bits;
using StreamCraft.Core.Bits.Templates;
using StreamCraft.Core.Data.DuckDb;
using StreamCraft.Core.Diagnostics;
using StreamCraft.Core.Diagnostics.ShutdownChecks;
using StreamCraft.Core.Diagnostics.StartupChecks;
using StreamCraft.Core.Logging;
using StreamCraft.Core.Plugins;
using StreamCraft.Core.Runners;
using StreamCraft.Core.State;
using StreamCraft.Engine.Diagnostics;
using StreamCraft.Engine.Routing;
using StreamCraft.Engine.Services;
using Hosting;
using Microsoft.Extensions.DependencyInjection;
using Serilog;
using System.Text.Json;

namespace StreamCraft.Engine;

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
        var bitsRegistry = new BitsRegistry();

        var bitDiscovery = new BitDiscoveryService(_logger);
        var bitResult = bitDiscovery.Discover(_configuration.BitsFolder);

        StreamCraft.Core.Plugins.BitContext CreateBitContext(BitDescriptor bit) =>
            new StreamCraft.Core.Plugins.BitContext(bit.BitId, bit.BitDirectory, _appConfiguration!, _logger);

        // Create shared message bus for inter-bit communication
        var sharedMessageBus = new StreamCraft.Core.Messaging.MessageBus(_logger);
        ExceptionFactory.Initialize(_logger);

        // Build the application host
        var host = new ApplicationHostBuilder()
            .UseLogger(_logger)
            .UseUrl(_hostUrl ?? "http://localhost:5000")
            .ConfigureServices(services =>
            {
                // Register shared infrastructure
                services.AddSingleton<StreamCraft.Core.Messaging.IMessageBus>(sharedMessageBus);
                services.AddSingleton<Serilog.ILogger>(_logger);
                services.AddSingleton<StreamCraft.Core.Data.Sql.ISqlQueryStore, StreamCraft.Core.Data.Sql.SqlQueryStore>();
                services.AddSingleton<StreamCraft.Core.DataSources.ApiSourceRegistry>();
                services.AddSingleton<StreamCraft.Core.DataSources.IApiSourceRegistry>(sp => sp.GetRequiredService<StreamCraft.Core.DataSources.ApiSourceRegistry>());
                services.AddSingleton<StreamCraft.Core.DataSources.IDataSourceRegistry>(sp => sp.GetRequiredService<StreamCraft.Core.DataSources.ApiSourceRegistry>());
                services.AddSingleton<StreamCraft.Core.Runtime.Preview.DataSourceProviderRegistry>();
                services.AddSingleton<StreamCraft.Core.Runtime.Preview.IDataSourceProviderRegistry>(sp => sp.GetRequiredService<StreamCraft.Core.Runtime.Preview.DataSourceProviderRegistry>());
                services.AddSingleton<StreamCraft.Core.Media.Gateway.IMediaProviderRegistry, StreamCraft.Core.Media.Gateway.MediaProviderRegistry>();
                services.AddSingleton<StreamCraft.Core.Designer.WidgetRegistry>();
                services.AddSingleton<StreamCraft.Core.Designer.IWidgetRegistry>(sp => sp.GetRequiredService<StreamCraft.Core.Designer.WidgetRegistry>());
                services.AddSingleton<StreamCraft.Core.Ui.Extensions.DesignerUiExtensionRegistry>();
                services.AddSingleton<StreamCraft.Core.Ui.Extensions.IDesignerUiExtensionRegistry>(sp => sp.GetRequiredService<StreamCraft.Core.Ui.Extensions.DesignerUiExtensionRegistry>());
                services.AddSingleton(templateRegistry);
                services.AddSingleton(definitionStore);
                services.AddSingleton<IBitsRegistry>(_ => bitsRegistry);
                if (LoggerFactory.LogStream != null)
                {
                    services.AddSingleton<ILogEventStream>(LoggerFactory.LogStream);
                }
                services.AddSingleton<IStartupCheckRegistry, StartupCheckRegistry>();
                services.AddSingleton<IStartupCheck, BitsFolderStartupCheck>();
                services.AddSingleton<IStartupCheck, DuckDbConnectionStartupCheck>();
                services.AddSingleton<IStartupCheck, DuckDbMigrationsStartupCheck>();
                services.AddSingleton<IStartupCheck>(_ => new BitManifestStartupCheck(bitResult.Bits));
                services.AddSingleton<IStartupCheck>(sp =>
                    new BitConfigurationStartupCheck(bitResult.BitTypes, sp.GetRequiredService<IBitConfigStore>()));
                services.AddSingleton(sp =>
                {
                    var cfg = sp.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>();
                    return new StartupCheckContext(cfg, sp);
                });
                services.AddSingleton<StartupCheckRunner>();
                services.AddSingleton<IShutdownCheckRegistry, ShutdownCheckRegistry>();
                services.AddSingleton(sp =>
                {
                    var cfg = sp.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>();
                    return new ShutdownCheckContext(cfg, sp);
                });
                services.AddSingleton<ShutdownCheckRunner>();
                services.Configure<DuckDbOptions>(_appConfiguration!.GetSection("StreamCraft:DuckDb"));
                services.AddSingleton<IDuckDbConnectionFactory, DuckDbConnectionFactory>();
                services.AddSingleton<IDuckDbMigrationRunner, DuckDbMigrationRunner>();
                services.AddSingleton<IBitConfigStore, DuckDbBitConfigStore>();
                services.Configure<ExceptionPipelineOptions>(_appConfiguration!.GetSection("StreamCraft:Exceptions"));
                services.AddSingleton<InMemoryExceptionStore>();
                services.AddSingleton<IExceptionStream>(sp => sp.GetRequiredService<InMemoryExceptionStore>());
                services.AddSingleton<IExceptionSink>(sp => sp.GetRequiredService<InMemoryExceptionStore>());
                services.AddSingleton<IExceptionSink, DuckDbExceptionSink>();
                services.AddSingleton<ExceptionPipeline>();
                services.AddSingleton<IExceptionPipeline>(sp => sp.GetRequiredService<ExceptionPipeline>());
                services.AddHostedService(sp => sp.GetRequiredService<ExceptionPipeline>());
                services.AddSingleton<IRunnerRegistry, RunnerRegistry>();
                services.AddHostedService<RunnerHostService>();
                services.AddSingleton<IBitStateStoreRegistry, BitStateStoreRegistry>();
                services.AddHostedService<StreamCraft.Core.State.StateStoreCleanupService>();
                services.AddSingleton<StreamCraft.Core.Scheduling.IScheduler, StreamCraft.Core.Scheduling.PeriodicTaskScheduler>();
                services.AddHostedService(sp => (StreamCraft.Core.Scheduling.PeriodicTaskScheduler)sp.GetRequiredService<StreamCraft.Core.Scheduling.IScheduler>());
                services.AddHostedService<ShutdownCheckHostedService>();
                services.AddHostedService<BitShutdownService>();

                // Ensure Engine controllers are discoverable by MVC
                services.AddControllers()
                    .AddApplicationPart(typeof(Engine.Controllers.BitTemplatesController).Assembly);

                foreach (var bit in bitResult.Bits)
                {
                    foreach (var entrypoint in bit.Entrypoints)
                    {
                        entrypoint.ConfigureServices(services, CreateBitContext(bit));
                    }
                }
            })
            .ConfigureMiddleware(app =>
            {
                // Discover and register static file paths
                var staticFileService = new StaticFileService(_logger);
                staticFileService.DiscoverStaticPaths();
                staticFileService.RegisterStaticFiles(app);

                foreach (var bit in bitResult.Bits)
                {
                    foreach (var entrypoint in bit.Entrypoints)
                    {
                        entrypoint.MapEndpoints(app, CreateBitContext(bit));
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
            definitionStore,
            bitsRegistry);

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

                var migrator = serviceProvider.GetService<IDuckDbMigrationRunner>();
                if (migrator == null)
                {
                    throw new InvalidOperationException("DuckDB migration runner is not available.");
                }
                else
                {
                    var sources = new List<MigrationSource>
                    {
                        MigrationSource.FromEmbeddedResources(
                            scopeId: "core",
                            assembly: typeof(DuckDbMigrationRunner).Assembly,
                            resourcePrefix: "StreamCraft.Core.Sql.Migrations",
                            allowedTablePrefix: "core_")
                    };

                    foreach (var bit in bitResult.Bits)
                    {
                        var bitId = bit.BitId.Trim().ToLowerInvariant();
                        if (string.IsNullOrWhiteSpace(bitId))
                        {
                            continue;
                        }

                        var migrationsPath = Path.Combine(bit.BitDirectory, "sql", "migrations");
                        sources.Add(MigrationSource.FromDirectory(
                            scopeId: $"bit:{bitId}",
                            directoryPath: migrationsPath,
                            allowedTablePrefix: $"bit_{bitId}_"));
                    }

                    foreach (var source in sources)
                    {
                        migrator.ApplyMigrationsAsync(source, CancellationToken.None).GetAwaiter().GetResult();
                    }
                }

                var postReport = checkRunner.RunAsync(StartupCheckStage.PostMigrations).GetAwaiter().GetResult();
                ThrowIfCriticalFailed(serviceProvider, postReport);

                checkRegistry.SetLastReport(CombineReports(preReport, postReport));
            }

            if (checkRunner == null || checkRegistry == null)
            {
                var migrator = serviceProvider.GetService<IDuckDbMigrationRunner>();
                if (migrator == null)
                {
                    throw new InvalidOperationException("DuckDB migration runner is not available.");
                }
                else
                {
                    var sources = new List<MigrationSource>
                    {
                        MigrationSource.FromEmbeddedResources(
                            scopeId: "core",
                            assembly: typeof(DuckDbMigrationRunner).Assembly,
                            resourcePrefix: "StreamCraft.Core.Sql.Migrations",
                            allowedTablePrefix: "core_")
                    };

                    foreach (var bit in bitResult.Bits)
                    {
                        var bitId = bit.BitId.Trim().ToLowerInvariant();
                        if (string.IsNullOrWhiteSpace(bitId))
                        {
                            continue;
                        }

                        var migrationsPath = Path.Combine(bit.BitDirectory, "sql", "migrations");
                        sources.Add(MigrationSource.FromDirectory(
                            scopeId: $"bit:{bitId}",
                            directoryPath: migrationsPath,
                            allowedTablePrefix: $"bit_{bitId}_"));
                    }

                    foreach (var source in sources)
                    {
                        migrator.ApplyMigrationsAsync(source, CancellationToken.None).GetAwaiter().GetResult();
                    }
                }

            }

            engine.InitializeDiscoveredBits(serviceProvider);
            engine.StartEngine();
        });

        engine.RegisterDiscoveredBits(bitResult.BitTypes);
        await engine.DiscoverDynamicBitsAsync();

        // Configure host with bit routes
        ConfigureRoutes(host, engine, bitResult.Bits);

        return engine;
    }

    private void ConfigureRoutes(IApplicationHostService host, StreamCraftEngine engine, IReadOnlyList<BitDescriptor> bits)
    {
        var jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = true
        };

        host.ConfigureRoutes(app =>
        {
            var registeredRoutes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var watchProxyRegistry = new UiWatchProxyRegistry(_logger);
            var registrarContext = new RouteRegistrarContext(app, engine, host, bits, _logger!, registeredRoutes, jsonOptions, watchProxyRegistry);

            new DiagnosticsRouteRegistrar().Register(registrarContext);
            new MetricsRouteRegistrar().Register(registrarContext);
            new WatchRouteRegistrar().Register(registrarContext);
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


