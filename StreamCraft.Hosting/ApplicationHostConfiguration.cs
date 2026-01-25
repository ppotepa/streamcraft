using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Builder;

namespace StreamCraft.Hosting;

public class ApplicationHostConfiguration
{
    public string Url { get; set; } = "http://localhost:5000";
    public Action<IServiceCollection>? ServiceConfigurator { get; set; }
    public Action<WebApplication>? MiddlewareConfigurator { get; set; }
}
