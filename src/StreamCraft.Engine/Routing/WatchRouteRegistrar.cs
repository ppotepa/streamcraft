using System.Linq;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using StreamCraft.Engine.Services;

namespace StreamCraft.Engine.Routing;

internal sealed class WatchRouteRegistrar
{
    public void Register(RouteRegistrarContext context)
    {
        var app = context.App;
        var jsonOptions = context.JsonOptions;
        var registry = context.WatchProxyRegistry;

        app.MapGet("/watches", async (HttpContext httpContext) =>
        {
            var routes = registry.GetAllRoutes();
            var payload = new
            {
                source = registry.Source,
                routes = routes.Select(r => new
                {
                    route = r.Route,
                    devUrl = r.DevUrl.ToString(),
                    source = r.Source
                })
            };

            httpContext.Response.ContentType = "application/json";
            await httpContext.Response.WriteAsync(JsonSerializer.Serialize(payload, jsonOptions));
        });
    }
}
