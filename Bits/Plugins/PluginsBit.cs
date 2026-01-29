using Microsoft.AspNetCore.Http;
using Core.Bits;
using System.Text.Json;

namespace Bits.Plugins;

[BitRoute("/plugins")]
[HasUserInterface]
public class PluginsBit : StreamBit<PluginsBitState>
{
    public override string Name => "Plugins";
    public override string Description => "List all available plugins";

    public override async Task HandleAsync(HttpContext httpContext)
    {
        State.RequestCount++;

        var allBits = Context?.BitsRegistry.GetAllBits() ?? new List<IBit>();

        var plugins = allBits.Select(bit => new
        {
            name = bit.Name,
            route = bit.Route,
            description = bit.Description,
            type = bit.GetType().FullName,
            hasUI = bit.HasUserInterface
        }).ToList();

        var response = new
        {
            totalPlugins = plugins.Count,
            plugins = plugins,
            timestamp = DateTime.UtcNow
        };

        httpContext.Response.ContentType = "application/json";
        await httpContext.Response.WriteAsync(JsonSerializer.Serialize(response, new JsonSerializerOptions { WriteIndented = true }));
    }

    public override async Task HandleUIAsync(HttpContext httpContext)
    {
        var assemblyLocation = Path.GetDirectoryName(GetType().Assembly.Location);
        var uiPath = Path.Combine(assemblyLocation!, "ui", "index.html");

        if (File.Exists(uiPath))
        {
            httpContext.Response.ContentType = "text/html";
            await httpContext.Response.SendFileAsync(uiPath);
        }
        else
        {
            httpContext.Response.StatusCode = 404;
            await httpContext.Response.WriteAsync("UI file not found");
        }
    }
}

public class PluginsBitState : IBitState
{
    public int RequestCount { get; set; }
}
