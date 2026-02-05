using Core.Plugins;
using Core.Security.KeyVault;
using Core.Utilities;
using Microsoft.Extensions.Hosting;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using System.Text.Json;

namespace StreamCraft.Bits.Vault;

public sealed class VaultPlugin : IStreamCraftBit
{
    private const string DefaultPexelsKey = "oS5Q3Wth0TYMbGzcdCcHsrAI8ODjzjCNK3ECbAkRNllMJqo1tckyWYYW";

    public void ConfigureServices(IServiceCollection services, BitContext context)
    {
        services.AddSingleton<IKeyVault, KeyVaultStore>();
        services.AddHostedService(sp => new VaultSeeder(sp.GetRequiredService<IKeyVault>()));
    }

    public void MapEndpoints(IEndpointRouteBuilder endpoints, BitContext context)
    {
        endpoints.MapGet("/keyvault/keys", async httpContext =>
        {
            var vault = httpContext.RequestServices.GetRequiredService<IKeyVault>();
            var keys = await vault.ListAsync(httpContext.RequestAborted);
            httpContext.Response.ContentType = "application/json";
            await httpContext.Response.WriteAsync(JsonSerializer.Serialize(new { keys }));
        });

        endpoints.MapGet("/keyvault/key", async httpContext =>
        {
            var name = httpContext.Request.Query["name"].ToString();
            var envRaw = httpContext.Request.Query["env"].ToString();
            if (string.IsNullOrWhiteSpace(name))
            {
                httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
                await httpContext.Response.WriteAsync("Missing name.");
                return;
            }

            var env = ParseEnvironment(envRaw);
            var vault = httpContext.RequestServices.GetRequiredService<IKeyVault>();
            var value = await vault.GetAsync(name, env, httpContext.RequestAborted);
            if (value == null)
            {
                httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
                await httpContext.Response.WriteAsync("Key not found.");
                return;
            }

            httpContext.Response.ContentType = "application/json";
            await httpContext.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                name,
                env = env.ToString().ToLowerInvariant(),
                value
            }));
        });

        endpoints.MapPost("/keyvault/key", async httpContext =>
        {
            var payload = await JsonSerializer.DeserializeAsync<KeyVaultPayload>(httpContext.Request.Body, cancellationToken: httpContext.RequestAborted);
            if (payload == null || string.IsNullOrWhiteSpace(payload.Name))
            {
                httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
                await httpContext.Response.WriteAsync("Invalid payload.");
                return;
            }

            var vault = httpContext.RequestServices.GetRequiredService<IKeyVault>();
            await vault.SetAsync(payload.Name, payload.Dev ?? "", payload.Test ?? "", payload.Live ?? "", httpContext.RequestAborted);
            httpContext.Response.StatusCode = StatusCodes.Status204NoContent;
        });
    }

    private static KeyVaultEnvironment ParseEnvironment(string? env)
    {
        if (string.Equals(env, "test", StringComparison.OrdinalIgnoreCase)) return KeyVaultEnvironment.Test;
        if (string.Equals(env, "live", StringComparison.OrdinalIgnoreCase)) return KeyVaultEnvironment.Live;
        return KeyVaultEnvironment.Dev;
    }

    private sealed class VaultSeeder : IHostedService
    {
        private readonly IKeyVault _vault;

        public VaultSeeder(IKeyVault vault) => _vault = vault;

        public async Task StartAsync(CancellationToken cancellationToken)
        {
            var existing = await _vault.GetAsync("pexels", KeyVaultEnvironment.Dev, cancellationToken);
            if (string.IsNullOrWhiteSpace(existing))
            {
                await _vault.SetAsync("pexels", DefaultPexelsKey, DefaultPexelsKey, DefaultPexelsKey, cancellationToken);
            }

            var googleFonts = await _vault.GetAsync("googlefonts", KeyVaultEnvironment.Dev, cancellationToken);
            if (string.IsNullOrWhiteSpace(googleFonts))
            {
                var seed = ResolveSeed("STREAMCRAFT_GOOGLE_FONTS_KEY");
                if (!string.IsNullOrWhiteSpace(seed))
                {
                    await _vault.SetAsync("googlefonts", seed, seed, seed, cancellationToken);
                }
            }
        }

        public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }

    private static string? ResolveSeed(string envName)
    {
        var value = Environment.GetEnvironmentVariable(envName);
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private sealed class KeyVaultPayload
    {
        public string? Name { get; set; }
        public string? Dev { get; set; }
        public string? Test { get; set; }
        public string? Live { get; set; }
    }
}

