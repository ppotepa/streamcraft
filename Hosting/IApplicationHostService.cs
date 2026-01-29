using Microsoft.AspNetCore.Builder;

namespace Hosting;

public interface IApplicationHostService
{
    Task StartAsync(CancellationToken cancellationToken = default);
    Task StopAsync(CancellationToken cancellationToken = default);
    Task RunAsync(CancellationToken cancellationToken = default);
    bool IsRunning { get; }
    string StaticAssetsRoot { get; }
    IServiceProvider Services { get; }

    /// <summary>
    /// Configures additional routes for the application
    /// </summary>
    void ConfigureRoutes(Action<WebApplication> routeConfigurator);
}
