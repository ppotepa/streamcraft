using Core.Designer;
using Core.Plugins;
using Core.Utilities;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace StreamCraft.Bits.PexelsMedia;

public sealed class PexelsMediaPlugin : IStreamCraftPlugin
{
    public void ConfigureServices(IServiceCollection services, PluginContext context)
    {
        services.AddSingleton<PexelsMediaCacheStore>();
        services.AddSingleton<PexelsClient>();
        services.AddSingleton<PexelsMediaService>();
        services.AddHostedService(sp =>
            new PexelsMediaBootstrapper(
                sp.GetRequiredService<IDataSourceRegistry>(),
                sp.GetRequiredService<IDataSourceProviderRegistry>(),
                sp.GetRequiredService<PexelsMediaService>()));
    }

    public void MapEndpoints(IEndpointRouteBuilder endpoints, PluginContext context)
    {
        static ILogger? ResolveLogger(HttpContext httpContext) =>
            httpContext.RequestServices.GetService<ILogger<PexelsMediaPlugin>>();

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

        static async Task HandleRandomEndpoint(HttpContext httpContext, string action, Func<Task<object?>> handler)
        {
            var logger = ResolveLogger(httpContext);
            try
            {
                var payload = await handler();
                if (payload == null)
                {
                    await WriteError(httpContext, StatusCodes.Status404NotFound, "cache_empty", "No cached media available yet.");
                    return;
                }
                await WriteJson(httpContext, payload);
            }
            catch (Exception ex)
            {
                logger?.LogError(ex, "Pexels media endpoint failed ({Action}).", action);
                await WriteError(httpContext, StatusCodes.Status500InternalServerError, "pexels_error", "Failed to fetch Pexels media.", ex.Message);
            }
        }

        endpoints.MapGet("/localmedia/images/random", async httpContext =>
        {
            var service = httpContext.RequestServices.GetRequiredService<PexelsMediaService>();
            await HandleRandomEndpoint(httpContext, "images/random", () => service.GetRandomImageAsync(httpContext.Request, httpContext.RequestAborted));
        });

        endpoints.MapGet("/localmedia/pictures/random", async httpContext =>
        {
            var service = httpContext.RequestServices.GetRequiredService<PexelsMediaService>();
            await HandleRandomEndpoint(httpContext, "pictures/random", () => service.GetRandomImageAsync(httpContext.Request, httpContext.RequestAborted));
        });

        endpoints.MapGet("/localmedia/videos/random", async httpContext =>
        {
            var service = httpContext.RequestServices.GetRequiredService<PexelsMediaService>();
            await HandleRandomEndpoint(httpContext, "videos/random", () => service.GetRandomVideoAsync(httpContext.Request, httpContext.RequestAborted));
        });

        endpoints.MapGet("/localmedia/video/random", async httpContext =>
        {
            var service = httpContext.RequestServices.GetRequiredService<PexelsMediaService>();
            await HandleRandomEndpoint(httpContext, "video/random", () => service.GetRandomVideoAsync(httpContext.Request, httpContext.RequestAborted));
        });

        endpoints.MapGet("/localmedia/pictures", async httpContext =>
        {
            var service = httpContext.RequestServices.GetRequiredService<PexelsMediaService>();
            var items = await service.ListImagesAsync(httpContext.RequestAborted);
            await WriteJson(httpContext, items);
        });

        endpoints.MapGet("/localmedia/videos", async httpContext =>
        {
            var service = httpContext.RequestServices.GetRequiredService<PexelsMediaService>();
            var items = await service.ListVideosAsync(httpContext.RequestAborted);
            await WriteJson(httpContext, items);
        });

        endpoints.MapGet("/localmedia/videos/search", async httpContext =>
        {
            var query = httpContext.Request.Query["query"].ToString();
            if (string.IsNullOrWhiteSpace(query))
            {
                await WriteError(httpContext, StatusCodes.Status400BadRequest, "missing_query", "Query parameter is required.");
                return;
            }

            var service = httpContext.RequestServices.GetRequiredService<PexelsMediaService>();
            var payload = await service.SearchVideosAsync(httpContext.Request, query, httpContext.RequestAborted);
            await WriteJson(httpContext, payload);
        });

        endpoints.MapGet("/localmedia/preview", async httpContext =>
        {
            var url = httpContext.Request.Query["url"].ToString();
            if (string.IsNullOrWhiteSpace(url))
            {
                await WriteError(httpContext, StatusCodes.Status400BadRequest, "missing_url", "Url parameter is required.");
                return;
            }

            if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) ||
                !string.Equals(uri.Scheme, "https", StringComparison.OrdinalIgnoreCase) ||
                !uri.Host.EndsWith("pexels.com", StringComparison.OrdinalIgnoreCase))
            {
                await WriteError(httpContext, StatusCodes.Status400BadRequest, "invalid_url", "Preview url must be a https://*.pexels.com address.");
                return;
            }

            var service = httpContext.RequestServices.GetRequiredService<PexelsMediaService>();
            await service.WritePreviewAsync(uri.ToString(), httpContext);
        });

        endpoints.MapGet("/localmedia/images/{id:int}", async httpContext =>
        {
            var service = httpContext.RequestServices.GetRequiredService<PexelsMediaService>();
            var id = httpContext.Request.RouteValues["id"]?.ToString();
            await service.WriteImageAsync(id, httpContext);
        });

        endpoints.MapGet("/localmedia/pictures/{id:int}", async httpContext =>
        {
            var service = httpContext.RequestServices.GetRequiredService<PexelsMediaService>();
            var id = httpContext.Request.RouteValues["id"]?.ToString();
            await service.WriteImageAsync(id, httpContext);
        });

        endpoints.MapGet("/localmedia/videos/{id:int}", async httpContext =>
        {
            var service = httpContext.RequestServices.GetRequiredService<PexelsMediaService>();
            var id = httpContext.Request.RouteValues["id"]?.ToString();
            await service.WriteVideoAsync(id, httpContext);
        });

        endpoints.MapPost("/localmedia/cache/clear", async httpContext =>
        {
            var logger = ResolveLogger(httpContext);
            try
            {
                var service = httpContext.RequestServices.GetRequiredService<PexelsMediaService>();
                var result = await service.ClearCacheAsync(httpContext.RequestAborted);
                await WriteJson(httpContext, new
                {
                    clearedImages = result.Images,
                    clearedVideos = result.Videos
                });
            }
            catch (Exception ex)
            {
                logger?.LogError(ex, "Pexels media cache clear failed.");
                await WriteError(httpContext, StatusCodes.Status500InternalServerError, "pexels_error", "Failed to clear Pexels cache.", ex.Message);
            }
        });
    }

    private static async Task WriteJson(HttpContext httpContext, object? payload)
    {
        httpContext.Response.ContentType = "application/json";
        await httpContext.Response.WriteAsync(JsonSerializer.Serialize(payload, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = true
        }));
    }
}
