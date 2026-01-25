using Microsoft.AspNetCore.Http;
using StreamCraft.Core.Bits;
using System.Text.Json;

namespace StreamCraft.Bits.Debug;

[BitRoute("/debug")]
[HasUserInterface]
public class DebugBit : StreamBit<DebugBitState>
{
    public override string Name => "Debug";
    public override string Description => "Debug information and diagnostics";

    public override async Task HandleAsync(HttpContext httpContext)
    {
        State.RequestCount++;

        var debugInfo = new
        {
            engine = new
            {
                startTime = Context?.EngineState.StartTime,
                uptime = DateTime.UtcNow - (Context?.EngineState.StartTime ?? DateTime.UtcNow),
                discoveredBits = Context?.EngineState.DiscoveredBitsCount
            },
            bit = new
            {
                name = Name,
                route = Route,
                requestCount = State.RequestCount
            },
            request = new
            {
                method = httpContext.Request.Method,
                path = httpContext.Request.Path.Value,
                timestamp = DateTime.UtcNow
            }
        };

        httpContext.Response.ContentType = "application/json";
        await httpContext.Response.WriteAsync(JsonSerializer.Serialize(debugInfo, new JsonSerializerOptions { WriteIndented = true }));
    }

    public override async Task HandleUIAsync(HttpContext httpContext)
    {
        var assemblyLocation = Path.GetDirectoryName(GetType().Assembly.Location);
        var uiPath = Path.Combine(assemblyLocation!, "ui", "index.html");

        Console.WriteLine($"[DebugBit] Assembly location: {assemblyLocation}");
        Console.WriteLine($"[DebugBit] UI path: {uiPath}");
        Console.WriteLine($"[DebugBit] File exists: {File.Exists(uiPath)}");

        if (File.Exists(uiPath))
        {
            httpContext.Response.ContentType = "text/html";
            await httpContext.Response.SendFileAsync(uiPath);
        }
        else
        {
            httpContext.Response.StatusCode = 404;
            await httpContext.Response.WriteAsync($"UI file not found at: {uiPath}");
        }
    }
}

public class DebugBitState : IBitState
{
    public int RequestCount { get; set; }
}
