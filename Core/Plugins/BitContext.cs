using Microsoft.Extensions.Configuration;
using Serilog;

namespace Core.Plugins;

public sealed class BitContext
{
    public BitContext(string bitId, string bitDirectory, IConfiguration configuration, ILogger logger)
    {
        BitId = bitId;
        BitDirectory = bitDirectory;
        Configuration = configuration;
        Logger = logger;
    }

    public string BitId { get; }
    public string BitDirectory { get; }
    public IConfiguration Configuration { get; }
    public ILogger Logger { get; }
}
