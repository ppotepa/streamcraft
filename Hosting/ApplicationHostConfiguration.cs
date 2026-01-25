using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

namespace Hosting;

public class ApplicationHostConfiguration
{
    public string Url { get; set; } = "http://localhost:5000";
    public Action<IServiceCollection>? ServiceConfigurator { get; set; }
    public Action<WebApplication>? MiddlewareConfigurator { get; set; }
}
