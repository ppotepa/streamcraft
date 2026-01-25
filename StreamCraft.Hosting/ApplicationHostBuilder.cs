using Serilog;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Builder;

namespace StreamCraft.Hosting;

public class ApplicationHostBuilder
{
    private readonly ApplicationHostConfiguration _configuration = new();
    private ILogger? _logger;

    public ApplicationHostBuilder UseUrl(string url)
    {
        _configuration.Url = url;
        return this;
    }

    public ApplicationHostBuilder UseLogger(ILogger logger)
    {
        _logger = logger;
        return this;
    }

    public ApplicationHostBuilder ConfigureServices(Action<IServiceCollection> configureServices)
    {
        _configuration.ServiceConfigurator = configureServices;
        return this;
    }

    public ApplicationHostBuilder ConfigureMiddleware(Action<WebApplication> configureMiddleware)
    {
        _configuration.MiddlewareConfigurator = configureMiddleware;
        return this;
    }

    public ApplicationHost Build()
    {
        if (_logger == null)
        {
            throw new InvalidOperationException("Logger must be configured. Call UseLogger() first.");
        }

        if (string.IsNullOrWhiteSpace(_configuration.Url))
        {
            _configuration.Url = "http://localhost:5000";
            _logger.Warning("No URL specified. Using default: {Url}", _configuration.Url);
        }

        var host = new ApplicationHost(_configuration, _logger);
        return host;
    }
}
