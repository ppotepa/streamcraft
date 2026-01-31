using Core.Bits;
using Core.Designer;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using System.Text.Json;

namespace StreamCraft.Bits.SystemDataSources;

[BitRoute("/system-data-sources")]
public sealed class SystemDataSourcesBit : StreamBit<SystemDataSourcesState>, IBuiltInFeature
{
    public override string Name => "System Data Sources";
    public override string Description => "Registers Windows system data sources for the Designer.";

    protected override void OnInitialize()
    {
        var registry = Context?.ServiceProvider.GetService<IDataSourceRegistry>();
        State.Count = registry?.GetAll().Count(s => s.Kind == "system") ?? 0;
        State.LastUpdatedUtc = DateTime.UtcNow;
    }

    public override async Task HandleAsync(HttpContext httpContext)
    {
        var snapshot = StateStore?.GetSnapshot() ?? State;
        httpContext.Response.ContentType = "application/json";
        await httpContext.Response.WriteAsync(JsonSerializer.Serialize(snapshot, new JsonSerializerOptions
        {
            WriteIndented = true
        }));
    }
}

public sealed class SystemDataSourcesState : IBitState
{
    public int Count { get; set; }
    public DateTime LastUpdatedUtc { get; set; } = DateTime.UtcNow;
}
