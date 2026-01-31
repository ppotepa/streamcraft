using Core.Bits;
using Core.Designer;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using System.Text.Json;

namespace StreamCraft.Bits.PublicApiSources;

[BitRoute("/public-api-sources")]
public sealed class PublicApiSourcesBit : StreamBit<PublicApiSourcesState>, IBuiltInFeature
{
    public override string Name => "Public API Sources";
    public override string Description => "Registers public API sources for the designer.";

    protected override void OnInitialize()
    {
        var registry = Context?.ServiceProvider.GetService<IDataSourceRegistry>();
        State.Count = registry?.GetAll().OfType<IApiSource>().Count() ?? 0;
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

public sealed class PublicApiSourcesState : IBitState
{
    public int Count { get; set; }
    public DateTime LastUpdatedUtc { get; set; } = DateTime.UtcNow;
}
