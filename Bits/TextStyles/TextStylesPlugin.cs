using StreamCraft.Core.Media.Fonts;
using StreamCraft.Core.Ui.Extensions;
using StreamCraft.Core.Plugins;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace StreamCraft.Bits.TextStyles;

public sealed class TextStylesPlugin : IStreamCraftBit
{
    public void ConfigureServices(IServiceCollection services, BitContext context)
    {
        services.AddSingleton<TextStylesFontStore>();
        services.AddSingleton<IGoogleFontsClient, GoogleFontsClient>();
        services.AddSingleton<TextStylesFontService>();
        services.AddHostedService<TextStylesBootstrapper>();
    }

    public void MapEndpoints(IEndpointRouteBuilder endpoints, BitContext context)
    {
        static async Task WriteJson(HttpContext httpContext, object payload)
        {
            httpContext.Response.ContentType = "application/json";
            await httpContext.Response.WriteAsync(JsonSerializer.Serialize(payload, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = true
            }));
        }

        static async Task WriteError(HttpContext httpContext, int statusCode, string error, string message, string? detail = null)
        {
            httpContext.Response.StatusCode = statusCode;
            await WriteJson(httpContext, new
            {
                error,
                message,
                detail
            });
        }

        endpoints.MapGet("/textstyles/fonts/catalog", async httpContext =>
        {
            var query = httpContext.Request.Query["query"].ToString();
            var category = httpContext.Request.Query["category"].ToString();
            var limitRaw = httpContext.Request.Query["limit"].ToString();
            var limit = 150;
            if (int.TryParse(limitRaw, out var parsed) && parsed > 0)
            {
                limit = Math.Min(parsed, 500);
            }

            try
            {
                var service = httpContext.RequestServices.GetRequiredService<TextStylesFontService>();
                var result = await service.GetCatalogAsync(query, category, limit, httpContext.RequestAborted);
                await WriteJson(httpContext, new
                {
                    count = result.Items.Count,
                    total = result.Total,
                    items = result.Items
                });
            }
            catch (Exception ex)
            {
                var logger = httpContext.RequestServices.GetService<ILogger<TextStylesPlugin>>();
                logger?.LogError(ex, "Text styles catalog fetch failed.");
                await WriteError(httpContext, StatusCodes.Status500InternalServerError, "catalog_error", "Failed to load Google Fonts catalog.", ex.Message);
            }
        });

        endpoints.MapPost("/textstyles/fonts/catalog/refresh", async httpContext =>
        {
            try
            {
                var service = httpContext.RequestServices.GetRequiredService<TextStylesFontService>();
                var count = await service.RefreshCatalogAsync(httpContext.RequestAborted);
                await WriteJson(httpContext, new
                {
                    refreshed = count,
                    refreshedUtc = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                var logger = httpContext.RequestServices.GetService<ILogger<TextStylesPlugin>>();
                logger?.LogError(ex, "Text styles catalog refresh failed.");
                await WriteError(httpContext, StatusCodes.Status500InternalServerError, "catalog_refresh_error", "Failed to refresh Google Fonts catalog.", ex.Message);
            }
        });

        endpoints.MapGet("/textstyles/fonts/file", async httpContext =>
        {
            var family = httpContext.Request.Query["family"].ToString();
            var variant = httpContext.Request.Query["variant"].ToString();
            if (string.IsNullOrWhiteSpace(family))
            {
                await WriteError(httpContext, StatusCodes.Status400BadRequest, "missing_family", "Family parameter is required.");
                return;
            }

            try
            {
                var service = httpContext.RequestServices.GetRequiredService<TextStylesFontService>();
                var file = await service.GetFontFileAsync(family, variant, httpContext.RequestAborted);
                if (file == null || file.Bytes.Length == 0)
                {
                    await WriteError(httpContext, StatusCodes.Status404NotFound, "font_not_found", "Font file not found.");
                    return;
                }

                httpContext.Response.ContentType = file.ContentType;
                httpContext.Response.Headers["Cache-Control"] = "public, max-age=86400";
                await httpContext.Response.Body.WriteAsync(file.Bytes, httpContext.RequestAborted);
            }
            catch (Exception ex)
            {
                var logger = httpContext.RequestServices.GetService<ILogger<TextStylesPlugin>>();
                logger?.LogError(ex, "Text styles font file fetch failed.");
                await WriteError(httpContext, StatusCodes.Status500InternalServerError, "font_error", "Failed to fetch font file.", ex.Message);
            }
        });
    }
}

internal sealed class TextStylesBootstrapper : Microsoft.Extensions.Hosting.IHostedService
{
    private readonly IDesignerUiExtensionRegistry _registry;
    private readonly TextStylesFontService _fontService;
    private readonly ILogger<TextStylesBootstrapper> _logger;

    public TextStylesBootstrapper(IDesignerUiExtensionRegistry registry, TextStylesFontService fontService, ILogger<TextStylesBootstrapper> logger)
    {
        _registry = registry;
        _fontService = fontService;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        IReadOnlyList<CachedFontFamily> fonts = Array.Empty<CachedFontFamily>();
        try
        {
            fonts = await _fontService.ListCatalogAsync(null, null, 120, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Text styles fonts unavailable. Using default style catalog.");
        }

        _registry.RegisterRange(TextStylesCatalog.BuildExtensions(fonts));
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}




