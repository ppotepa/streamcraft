using Core.Bits;
using Microsoft.AspNetCore.Http;
using System.Text.Json;

namespace StreamCraft.Bits.Designer;

[BitRoute("/designer")]
[HasUserInterface]
public sealed class DesignerBit : StreamBit<DesignerBitState>, IBuiltInFeature
{
    public override string Name => "Bit Designer";
    public override string Description => "Visual builder for creating and configuring bits without code.";

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

public sealed class DesignerBitState : IBitState
{
    public string Status { get; set; } = "idle";
    public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;
    public string[] Capabilities { get; set; } =
    [
        "api-sources",
        "layout-canvas",
        "field-mapping",
        "preview"
    ];
}
