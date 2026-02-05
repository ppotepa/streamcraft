using StreamCraft.Core.Bits;
using Microsoft.AspNetCore.Http;
using System.Text.Json;

namespace StreamCraft.Bits.Vault;

[BitRoute("/vault")]
public sealed class VaultBit : StreamBit<VaultState>, IBuiltInFeature
{
    public override string Name => "Key Vault";
    public override string Description => "Internal key vault for environment secrets.";

    public override async Task HandleAsync(HttpContext httpContext)
    {
        httpContext.Response.ContentType = "application/json";
        await httpContext.Response.WriteAsync(JsonSerializer.Serialize(State ?? new VaultState(), new JsonSerializerOptions
        {
            WriteIndented = true
        }));
    }
}

public sealed class VaultState : IBitState
{
    public DateTime LastUpdatedUtc { get; set; } = DateTime.UtcNow;
}



