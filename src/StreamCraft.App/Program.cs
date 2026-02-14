using StreamCraft.Core.Logging;
using StreamCraft.Engine;
using Microsoft.Extensions.Configuration;

namespace StreamCraft.App;

internal static class Program
{
    private static async Task Main(string[] args)
    {
        IDevelopmentHelper developmentHelper = new DevelopmentHelper();
        var developmentReason = developmentHelper.EnsureDevelopmentEnvironment();

        if (!Console.IsOutputRedirected && !Console.IsErrorRedirected)
        {
            Console.Clear();
        }
        // Initialize logger first
        var logger = LoggerFactory.CreateLogger();

        if (!string.IsNullOrWhiteSpace(developmentReason))
        {
            logger.Information("ASPNETCORE_ENVIRONMENT was not set. Defaulted to Development ({Reason}).", developmentReason);
        }

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

        // Wait for shutdown without re-starting the host
        await engine.Host.WaitForShutdownAsync();
    }
}
