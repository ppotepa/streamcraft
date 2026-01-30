using Microsoft.AspNetCore.Http;
using Core.Bits;
using System.Text.Json;

namespace StreamCraft.Bits.Debug;

[BitRoute("/debug")]
[HasUserInterface]
public class DebugBit : StreamBit<DebugBitState>
{
    public override string Name => "Debug";
    public override string Description => "Debug information and diagnostics";

    protected override Core.State.IBitStateStore<DebugBitState> CreateStateStore()
    {
        return DebugBitStateStore.Create();
    }

    public override async Task HandleAsync(HttpContext httpContext)
    {
        if (StateStore != null)
        {
            StateStore.Update(state => state.RequestCount++);
        }
        else
        {
            State.RequestCount++;
        }

        var snapshot = StateStore?.GetSnapshot() ?? State;

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
                requestCount = snapshot.RequestCount
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
}

public class DebugBitState : IBitState
{
    public int RequestCount { get; set; }
}
