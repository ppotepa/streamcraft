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

    protected override Core.State.IBitStateStore<PluginsBitState> CreateStateStore()
    {
        return PluginsBitStateStore.Create();
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
            timestamp = DateTime.UtcNow,
            requestCount = snapshot.RequestCount
        };

        httpContext.Response.ContentType = "application/json";
        await httpContext.Response.WriteAsync(JsonSerializer.Serialize(response, new JsonSerializerOptions { WriteIndented = true }));
    }
}

public class PluginsBitState : IBitState
{
    public int RequestCount { get; set; }
}
