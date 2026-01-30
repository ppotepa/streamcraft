using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Serilog;

namespace Hosting;

public class ApplicationHost : IApplicationHostService
{
    private readonly ApplicationHostConfiguration _configuration;
    private readonly ILogger _logger;
    private WebApplication? _app;
    private bool _isRunning;
    private Action<WebApplication>? _additionalRouteConfigurator;
    private Action<IServiceProvider>? _initializer;

    public bool IsRunning => _isRunning;
    public string StaticAssetsRoot { get; }
    public IServiceProvider Services => _app?.Services ?? throw new InvalidOperationException("Application host has not been started yet.");

    internal ApplicationHost(ApplicationHostConfiguration configuration, ILogger logger)
    {
        _configuration = configuration;
        _logger = logger;
        StaticAssetsRoot = Path.Combine(AppContext.BaseDirectory, "static");
    }

    public void ConfigureRoutes(Action<WebApplication> routeConfigurator)
    {
        _additionalRouteConfigurator = routeConfigurator;
    }

    public void ConfigureInitialization(Action<IServiceProvider> initializer)
    {
        _initializer = initializer;
    }

    public async Task StartAsync(CancellationToken cancellationToken = default)
    {
        if (_isRunning)
        {
            _logger.Warning("Application host is already running.");
            return;
        }

        _logger.Information("Starting application host on {Url}", _configuration.Url);

        var builder = WebApplication.CreateBuilder();

        // Configure Serilog
        builder.Host.UseSerilog(_logger);

        // Configure Kestrel
        builder.WebHost.UseUrls(_configuration.Url);

        // Add services
        ConfigureServices(builder.Services);

        _app = builder.Build();

        _initializer?.Invoke(_app.Services);

        // Configure middleware
        ConfigureMiddleware(_app);

        await _app.StartAsync(cancellationToken);
        _isRunning = true;

        _logger.Information("Application host started successfully on {Url}", _configuration.Url);
    }

    public async Task StopAsync(CancellationToken cancellationToken = default)
    {
        if (_app != null && _isRunning)
        {
            _logger.Information("Stopping application host...");
            await _app.StopAsync(cancellationToken);
            _isRunning = false;
            _logger.Information("Application host stopped.");
        }
    }

    public async Task RunAsync(CancellationToken cancellationToken = default)
    {
        await StartAsync(cancellationToken);

        if (_app != null)
        {
            await _app.WaitForShutdownAsync(cancellationToken);
        }
    }

    public async Task WaitForShutdownAsync(CancellationToken cancellationToken = default)
    {
        if (_app != null)
        {
            await _app.WaitForShutdownAsync(cancellationToken);
        }
    }

    private void ConfigureServices(IServiceCollection services)
    {
        // Add basic services
        services.AddControllers();
        services.AddEndpointsApiExplorer();

        // Allow custom service configuration
        _configuration.ServiceConfigurator?.Invoke(services);

        _logger.Debug("Services configured.");
    }

    private void ConfigureMiddleware(WebApplication app)
    {
        // Basic middleware
        app.UseRouting();

        // Allow custom middleware configuration
        _configuration.MiddlewareConfigurator?.Invoke(app);

        // Add additional routes (for bits) - only invoke once
        if (_additionalRouteConfigurator != null)
        {
            _additionalRouteConfigurator.Invoke(app);
            _additionalRouteConfigurator = null; // Prevent double invocation
        }

        app.MapControllers();

        // Add a default health check endpoint
        app.MapGet("/health", () => Microsoft.AspNetCore.Http.Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

        _logger.Debug("Middleware configured.");
    }
}
