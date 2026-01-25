using Microsoft.AspNetCore.Http;
using System.Text.Json;
using StreamCraft.Core.Bits;

namespace StreamCraft.Bits.Plugins;

[BitRoute("/plugins")]
[HasUserInterface]
public class PluginsBit : StreamBit<PluginsBitState>
{
    public override string Name => "Plugins";
    public override string Description => "List all available plugins";

    public override async Task HandleAsync(HttpContext httpContext)
    {
        State.RequestCount++;

        var allBits = Context?.BitsRegistry.GetAllBits() ?? new List<object>();

        var plugins = allBits.Select(bit =>
        {
            var bitType = bit.GetType();
            var routeProp = bitType.GetProperty("Route");
            var nameProp = bitType.GetProperty("Name");
            var descProp = bitType.GetProperty("Description");

            return new
            {
                name = nameProp?.GetValue(bit)?.ToString() ?? bitType.Name,
                route = routeProp?.GetValue(bit)?.ToString() ?? "/unknown",
                description = descProp?.GetValue(bit)?.ToString() ?? "No description",
                type = bitType.FullName,
                isBuiltIn = bitType.Namespace?.Contains("BuiltIn") ?? false
            };
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
