using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace Core.Media.Gateway;

public interface IMediaProvider
{
    string Id { get; }
    bool IsPreviewUrlAllowed(Uri uri);
    Task<object?> GetRandomImageAsync(HttpRequest? request, CancellationToken cancellationToken);
    Task<object?> GetRandomVideoAsync(HttpRequest? request, CancellationToken cancellationToken);
    Task<IReadOnlyList<object>> ListImagesAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<object>> ListVideosAsync(CancellationToken cancellationToken);
    Task WriteImageAsync(string? id, HttpContext httpContext);
    Task WriteVideoAsync(string? id, HttpContext httpContext);
    Task<object> SearchVideosAsync(HttpRequest? request, string query, CancellationToken cancellationToken);
    Task WritePreviewAsync(string url, HttpContext httpContext);
    Task<(int Images, int Videos)> ClearCacheAsync(CancellationToken cancellationToken);
}

public interface IMediaProviderRegistry
{
    IReadOnlyList<IMediaProvider> GetAll();
    IMediaProvider? Get(string id);
    IMediaProvider? GetDefault();
}

public sealed class MediaProviderRegistry : IMediaProviderRegistry
{
    private readonly IReadOnlyList<IMediaProvider> _providers;

    public MediaProviderRegistry(IEnumerable<IMediaProvider> providers)
    {
        _providers = providers?.Where(p => p != null && !string.IsNullOrWhiteSpace(p.Id)).ToList()
            ?? new List<IMediaProvider>();
    }

    public IReadOnlyList<IMediaProvider> GetAll() => _providers;

    public IMediaProvider? Get(string id)
    {
        if (string.IsNullOrWhiteSpace(id)) return null;
        return _providers.FirstOrDefault(p => string.Equals(p.Id, id, StringComparison.OrdinalIgnoreCase));
    }

    public IMediaProvider? GetDefault() => _providers.FirstOrDefault();
}

public static class MediaGateway
{
    private static int _mapped;

    public static void MapEndpoints(IEndpointRouteBuilder endpoints)
    {
        if (Interlocked.Exchange(ref _mapped, 1) == 1)
        {
            return;
        }

        endpoints.MapGet("/localmedia/images/random", (HttpContext httpContext) =>
            HandleRandom(httpContext, "images/random", provider => provider.GetRandomImageAsync(httpContext.Request, httpContext.RequestAborted)));

        endpoints.MapGet("/localmedia/pictures/random", (HttpContext httpContext) =>
            HandleRandom(httpContext, "pictures/random", provider => provider.GetRandomImageAsync(httpContext.Request, httpContext.RequestAborted)));

        endpoints.MapGet("/localmedia/videos/random", (HttpContext httpContext) =>
            HandleRandom(httpContext, "videos/random", provider => provider.GetRandomVideoAsync(httpContext.Request, httpContext.RequestAborted)));

        endpoints.MapGet("/localmedia/video/random", (HttpContext httpContext) =>
            HandleRandom(httpContext, "video/random", provider => provider.GetRandomVideoAsync(httpContext.Request, httpContext.RequestAborted)));

        endpoints.MapGet("/localmedia/pictures", async httpContext =>
        {
            var provider = ResolveProvider(httpContext);
            if (provider == null)
            {
                await WriteProviderMissing(httpContext);
                return;
            }
            var items = await provider.ListImagesAsync(httpContext.RequestAborted);
            await WriteJson(httpContext, items);
        });

        endpoints.MapGet("/localmedia/videos", async httpContext =>
        {
            var provider = ResolveProvider(httpContext);
            if (provider == null)
            {
                await WriteProviderMissing(httpContext);
                return;
            }
            var items = await provider.ListVideosAsync(httpContext.RequestAborted);
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

            var provider = ResolveProvider(httpContext);
            if (provider == null)
            {
                await WriteProviderMissing(httpContext);
                return;
            }

            try
            {
                var payload = await provider.SearchVideosAsync(httpContext.Request, query, httpContext.RequestAborted);
                await WriteJson(httpContext, payload);
            }
            catch (NotSupportedException)
            {
                await WriteError(httpContext, StatusCodes.Status501NotImplemented, "search_not_supported", "Video search is not supported for this media provider.");
            }
        });

        endpoints.MapGet("/localmedia/preview", async httpContext =>
        {
            var url = httpContext.Request.Query["url"].ToString();
            if (string.IsNullOrWhiteSpace(url))
            {
                await WriteError(httpContext, StatusCodes.Status400BadRequest, "missing_url", "Url parameter is required.");
                return;
            }

            var provider = ResolveProvider(httpContext);
            if (provider == null)
            {
                await WriteProviderMissing(httpContext);
                return;
            }

            if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) ||
                !provider.IsPreviewUrlAllowed(uri))
            {
                await WriteError(httpContext, StatusCodes.Status400BadRequest, "invalid_url", "Preview url is not allowed for this provider.");
                return;
            }

            await provider.WritePreviewAsync(uri.ToString(), httpContext);
        });

        endpoints.MapGet("/localmedia/images/{id:int}", async httpContext =>
        {
            var provider = ResolveProvider(httpContext);
            if (provider == null)
            {
                await WriteProviderMissing(httpContext);
                return;
            }
            var id = httpContext.Request.RouteValues["id"]?.ToString();
            await provider.WriteImageAsync(id, httpContext);
        });

        endpoints.MapGet("/localmedia/pictures/{id:int}", async httpContext =>
        {
            var provider = ResolveProvider(httpContext);
            if (provider == null)
            {
                await WriteProviderMissing(httpContext);
                return;
            }
            var id = httpContext.Request.RouteValues["id"]?.ToString();
            await provider.WriteImageAsync(id, httpContext);
        });

        endpoints.MapGet("/localmedia/videos/{id:int}", async httpContext =>
        {
            var provider = ResolveProvider(httpContext);
            if (provider == null)
            {
                await WriteProviderMissing(httpContext);
                return;
            }
            var id = httpContext.Request.RouteValues["id"]?.ToString();
            await provider.WriteVideoAsync(id, httpContext);
        });

        endpoints.MapPost("/localmedia/cache/clear", async httpContext =>
        {
            var provider = ResolveProvider(httpContext);
            if (provider == null)
            {
                await WriteProviderMissing(httpContext);
                return;
            }

            try
            {
                var result = await provider.ClearCacheAsync(httpContext.RequestAborted);
                await WriteJson(httpContext, new
                {
                    clearedImages = result.Images,
                    clearedVideos = result.Videos
                });
            }
            catch (Exception ex)
            {
                var logger = ResolveLogger(httpContext);
                logger?.LogError(ex, "Media cache clear failed.");
                await WriteError(httpContext, StatusCodes.Status500InternalServerError, "media_error", "Failed to clear media cache.", ex.Message);
            }
        });
    }

    private static async Task HandleRandom(HttpContext httpContext, string action, Func<IMediaProvider, Task<object?>> handler)
    {
        var provider = ResolveProvider(httpContext);
        if (provider == null)
        {
            await WriteProviderMissing(httpContext);
            return;
        }

        var logger = ResolveLogger(httpContext);
        try
        {
            var payload = await handler(provider);
            if (payload == null)
            {
                await WriteError(httpContext, StatusCodes.Status404NotFound, "cache_empty", "No cached media available yet.");
                return;
            }
            await WriteJson(httpContext, payload);
        }
        catch (Exception ex)
        {
            logger?.LogError(ex, "Media endpoint failed ({Action}).", action);
            await WriteError(httpContext, StatusCodes.Status500InternalServerError, "media_error", "Failed to fetch media.", ex.Message);
        }
    }

    private static IMediaProvider? ResolveProvider(HttpContext httpContext)
    {
        var registry = httpContext.RequestServices.GetService<IMediaProviderRegistry>();
        if (registry == null) return null;
        var source = httpContext.Request.Query["source"].ToString();
        return string.IsNullOrWhiteSpace(source)
            ? registry.GetDefault()
            : registry.Get(source);
    }

    private static ILogger? ResolveLogger(HttpContext httpContext) =>
        httpContext.RequestServices.GetService<ILoggerFactory>()?.CreateLogger("MediaGateway");

    private static Task WriteProviderMissing(HttpContext httpContext) =>
        WriteError(httpContext, StatusCodes.Status404NotFound, "provider_missing", "No media provider available for this request.");

    private static async Task WriteError(HttpContext httpContext, int statusCode, string error, string message, string? detail = null)
    {
        httpContext.Response.StatusCode = statusCode;
        await WriteJson(httpContext, new
        {
            error,
            message,
            detail
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
