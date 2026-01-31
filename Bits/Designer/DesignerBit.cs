using Core.Bits;
using Core.Designer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using System.Text.Json;

namespace StreamCraft.Bits.Designer;

[BitRoute("/designer")]
[HasUserInterface]
public sealed class DesignerBit : StreamBit<DesignerBitState>, IBuiltInFeature, IBitEndpointContributor
{
    public override string Name => "Bit Designer";
    public override string Description => "Visual builder for creating and configuring bits without code.";

    protected override void OnInitialize()
    {
        var registry = Context?.ServiceProvider.GetService<IDataSourceRegistry>();
        State.ApiSourceCount = registry?.GetAll().OfType<IApiDataSource>().Count() ?? 0;
        State.TimestampUtc = DateTime.UtcNow;
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

    public void MapEndpoints(IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/designer/sources", async context =>
        {
            var registry = context.RequestServices.GetService<IDataSourceRegistry>();
            var sources = registry?.GetAll().OfType<IApiDataSource>().ToArray() ?? Array.Empty<IApiDataSource>();
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(sources, new JsonSerializerOptions
            {
                WriteIndented = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            }));
        });
    }
}

public sealed class DesignerBitState : IBitState
{
    public string Status { get; set; } = "idle";
    public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;
    public int ApiSourceCount { get; set; }
    public string[] Capabilities { get; set; } =
    [
        "api-sources",
        "layout-canvas",
        "field-mapping",
        "preview"
    ];
}
