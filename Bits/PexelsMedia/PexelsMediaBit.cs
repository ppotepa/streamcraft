using StreamCraft.Core.Bits;
using Microsoft.AspNetCore.Http;
using System.Text.Json;

namespace StreamCraft.Bits.PexelsMedia;

[BitRoute("/pexels-media")]
public sealed class PexelsMediaBit : StreamBit<PexelsMediaState>, IBuiltInFeature
{
    public override string Name => "Pexels Media";
    public override string Description => "Internal media cache and data sources for Pexels images/videos.";

    public override async Task HandleAsync(HttpContext httpContext)
    {
        httpContext.Response.ContentType = "application/json";
        await httpContext.Response.WriteAsync(JsonSerializer.Serialize(State ?? new PexelsMediaState(), new JsonSerializerOptions
        {
            WriteIndented = true
        }));
    }
}

public sealed class PexelsMediaState : IBitState
{
    public DateTime LastUpdatedUtc { get; set; } = DateTime.UtcNow;
}



