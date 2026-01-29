using Microsoft.Extensions.Configuration;
using Core.Logging;
using Engine;

namespace App;

internal class Program
{
    private static async Task Main(string[] args)
    {
        // Initialize logger first
        var logger = LoggerFactory.CreateLogger();

        logger.Information("StreamCraft Starting...");

        // Load configuration from the application's directory
        var appDirectory = AppContext.BaseDirectory;
        var configuration = new ConfigurationBuilder()
            .SetBasePath(appDirectory)
            .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
            .Build();

        var bitsFolder = configuration["StreamCraft:BitsFolder"] ?? "bits";
        var hostUrl = configuration["StreamCraft:HostUrl"] ?? "http://localhost:5000";

        // Resolve bits folder relative to application directory
        var bitsFolderPath = Path.IsPathRooted(bitsFolder)
            ? bitsFolder
            : Path.Combine(appDirectory, bitsFolder);

        // Build and initialize the engine (which creates the host internally)
        var engine = await new EngineBuilder()
            .ConfigureLogger(logger)
            .ConfigureBitsFolder(bitsFolderPath)
            .ConfigureHostUrl(hostUrl)
            .ConfigureAppSettings(configuration)
            .BuildAsync();

        logger.Information("StreamCraft Engine initialized.");
        logger.Information("Discovered {BitCount} bit(s).", engine.DiscoveredBits.Count);

        // Start the application host
        logger.Information("Starting application host...");
        await engine.Host.StartAsync();

        // Now that host is started, initialize engine with service provider
        engine.StartEngine();

        // Wait for shutdown
        await engine.Host.RunAsync();
    }
}