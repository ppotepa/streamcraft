using Microsoft.Extensions.Configuration;
using Serilog;

namespace Core.Plugins;

public sealed class PluginContext
{
    public PluginContext(string pluginId, string pluginDirectory, IConfiguration configuration, ILogger logger)
    {
        PluginId = pluginId;
        PluginDirectory = pluginDirectory;
        Configuration = configuration;
        Logger = logger;
    }

    public string PluginId { get; }
    public string PluginDirectory { get; }
    public IConfiguration Configuration { get; }
    public ILogger Logger { get; }
}
