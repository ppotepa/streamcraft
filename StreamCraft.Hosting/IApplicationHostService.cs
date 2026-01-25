using Serilog;

namespace StreamCraft.Hosting;

public interface IApplicationHostService
{
    Task StartAsync(CancellationToken cancellationToken = default);
    Task StopAsync(CancellationToken cancellationToken = default);
    Task RunAsync(CancellationToken cancellationToken = default);
    bool IsRunning { get; }
    string StaticAssetsRoot { get; }
}
