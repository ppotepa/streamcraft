using Microsoft.Extensions.Configuration;

namespace Core.Diagnostics.StartupChecks;

public sealed class StartupCheckContext
{
    public StartupCheckContext(IConfiguration configuration, IServiceProvider services)
    {
        Configuration = configuration;
        Services = services;
    }

    public IConfiguration Configuration { get; }
    public IServiceProvider Services { get; }
}
