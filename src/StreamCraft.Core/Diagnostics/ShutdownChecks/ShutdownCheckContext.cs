using Microsoft.Extensions.Configuration;

namespace StreamCraft.Core.Diagnostics.ShutdownChecks;

public sealed class ShutdownCheckContext
{
    public ShutdownCheckContext(IConfiguration configuration, IServiceProvider services)
    {
        Configuration = configuration;
        Services = services;
    }

    public IConfiguration Configuration { get; }
    public IServiceProvider Services { get; }
}
