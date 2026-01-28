using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.FileProviders;
using Serilog;

namespace Engine.Services;

public class StaticFileService
{
    private readonly ILogger? _logger;
    private readonly List<(string PhysicalPath, string RequestPath)> _staticPaths = new();

    public StaticFileService(ILogger? logger)
    {
        _logger = logger;
    }

    public void DiscoverStaticPaths()
    {
        var baseDir = AppContext.BaseDirectory;

        // SC2 UI distribution
        AddStaticPath(Path.Combine(baseDir, "bits", "Sc2", "ui", "dist"), "/sc2/ui");

        // SC2 Experience (XP Bar)
        AddStaticPath(Path.Combine(baseDir, "bits", "Sc2", "sc2exp"), "/sc2exp");

        // SC2 Heart Rate overlay
        AddStaticPath(Path.Combine(baseDir, "bits", "Sc2", "sc2hr"), "/sc2hr");

        _logger?.Information("Discovered {Count} static file paths", _staticPaths.Count);
    }

    private void AddStaticPath(string physicalPath, string requestPath)
    {
        if (Directory.Exists(physicalPath))
        {
            _staticPaths.Add((physicalPath, requestPath));
            _logger?.Debug("Discovered static path: {RequestPath} → {PhysicalPath}", requestPath, physicalPath);
        }
        else
        {
            _logger?.Warning("Static path not found: {PhysicalPath}", physicalPath);
        }
    }

    public void RegisterStaticFiles(WebApplication app)
    {
        foreach (var (physicalPath, requestPath) in _staticPaths)
        {
            app.UseStaticFiles(new StaticFileOptions
            {
                FileProvider = new PhysicalFileProvider(physicalPath),
                RequestPath = requestPath
            });

            _logger?.Information("Registered static files: {RequestPath} → {PhysicalPath}", requestPath, physicalPath);
        }
    }
}
