using StreamCraft.Core.Bits;
using Microsoft.AspNetCore.Http;
using System.Text.Json;

namespace StreamCraft.Bits.TextStyles;

[BitRoute("/text-styles")]
public sealed class TextStylesBit : StreamBit<TextStylesState>
{
    public override string Name => "Text Styles";
    public override string Description => "Provides a catalog of text styles for the Designer.";

    protected override void OnInitialize()
    {
        State.StyleCount = TextStylesCatalog.BuildStyles().Count;
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

public sealed class TextStylesState : IBitState
{
    public int StyleCount { get; set; }
    public DateTime LastUpdatedUtc { get; set; } = DateTime.UtcNow;
}



