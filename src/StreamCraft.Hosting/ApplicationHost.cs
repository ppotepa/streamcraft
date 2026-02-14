using StreamCraft.Core.Diagnostics;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
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
    public IServiceProvider Services => _app?.Services ?? throw ExceptionFactory.InvalidOperation("Application host has not been started yet.");

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
        app.Use(async (context, next) =>
        {
            try
            {
                await next().ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                ExceptionFactory.Report(
                    ex,
                    ExceptionSeverity.Error,
                    source: "HttpPipeline",
                    context: new Dictionary<string, string?>
                    {
                        ["Path"] = context.Request.Path,
                        ["Method"] = context.Request.Method
                    },
                    handled: false,
                    traceId: context.TraceIdentifier,
                    path: context.Request.Path,
                    method: context.Request.Method);
                throw;
            }
        });

        var uiRoot = Path.Combine(StaticAssetsRoot, "ui");
        if (Directory.Exists(uiRoot))
        {
            var uiProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uiRoot);

            // Serve default documents (index.html) at /ui/
            app.UseDefaultFiles(new DefaultFilesOptions
            {
                FileProvider = uiProvider,
                RequestPath = "/ui"
            });

            // Serve static assets under /ui
            app.UseStaticFiles(new StaticFileOptions
            {
                FileProvider = uiProvider,
                RequestPath = "/ui"
            });

            // SPA-style fallback: /ui/* -> /ui/index.html when no extension
            var uiIndexPath = Path.Combine(uiRoot, "index.html");
            if (File.Exists(uiIndexPath))
            {
                app.MapGet("/ui/{*path}", async context =>
                {
                    var path = context.Request.Path.Value ?? string.Empty;
                    if (!Path.HasExtension(path))
                    {
                        context.Response.ContentType = "text/html";
                        await context.Response.SendFileAsync(uiIndexPath);
                        return;
                    }

                    context.Response.StatusCode = StatusCodes.Status404NotFound;
                    await context.Response.WriteAsync("UI file not found.");
                });
            }
        }
        else
        {
            _logger.Warning("Static UI assets folder not found: {UiRoot}", uiRoot);
        }

        // Redirect root to the admin UI for convenience
        app.MapGet("/", () => Results.Redirect("/ui/"));

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

