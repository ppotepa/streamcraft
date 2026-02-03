using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace StreamCraft.Bits.PexelsMedia;

public sealed class PexelsMediaService
{
    private const int ImageTargetCount = 100;
    private const int VideoTargetCount = 25;
    private const int ImagePageSize = 15;
    private const int VideoPageSize = 10;
    private static readonly HttpClient PreviewClient = new();
    private readonly SemaphoreSlim _imageFillLock = new(1, 1);
    private readonly SemaphoreSlim _videoFillLock = new(1, 1);
    private readonly PexelsMediaCacheStore _cache;
    private readonly PexelsClient _client;
    private readonly ILogger<PexelsMediaService> _logger;

    public PexelsMediaService(PexelsMediaCacheStore cache, PexelsClient client, ILogger<PexelsMediaService> logger)
    {
        _cache = cache;
        _client = client;
        _logger = logger;
    }

    public async Task<object?> GetRandomImageAsync(HttpRequest? request, CancellationToken cancellationToken)
    {
        await EnsureImagesAsync(cancellationToken);
        var cached = _cache.GetRandomImage();
        if (cached == null) return null;
        var localUrl = BuildLocalUrl(request, $"/localmedia/images/{cached.Id}");
        return new
        {
            id = cached.Id,
            description = cached.Description,
            photographer = cached.Photographer,
            width = cached.Width,
            height = cached.Height,
            sourceUrl = cached.SourceUrl,
            localUrl
        };
    }

    public async Task<object?> GetRandomVideoAsync(HttpRequest? request, CancellationToken cancellationToken)
    {
        await EnsureVideosAsync(cancellationToken);
        var cached = _cache.GetRandomVideo();
        if (cached == null) return null;
        var localUrl = BuildLocalUrl(request, $"/localmedia/videos/{cached.Id}");
        var previewUrl = BuildPreviewUrl(cached.PreviewImage);
        return new
        {
            id = cached.Id,
            description = cached.Description,
            width = cached.Width,
            height = cached.Height,
            duration = cached.Duration,
            sourceUrl = cached.SourceUrl,
            previewImage = previewUrl,
            localUrl
        };
    }

    public Task<IReadOnlyList<object>> ListImagesAsync(CancellationToken cancellationToken)
    {
        var items = _cache.ListImages(100)
            .Select(item => (object)new
            {
                id = item.Id,
                description = item.Description,
                photographer = item.Photographer,
                width = item.Width,
                height = item.Height,
                sourceUrl = item.SourceUrl,
                localUrl = $"/localmedia/images/{item.Id}"
            })
            .ToList();
        return Task.FromResult<IReadOnlyList<object>>(items);
    }

    public Task<IReadOnlyList<object>> ListVideosAsync(CancellationToken cancellationToken)
    {
        var items = _cache.ListVideos(50)
            .Select(item => (object)new
            {
                id = item.Id,
                description = item.Description,
                width = item.Width,
                height = item.Height,
                duration = item.Duration,
                sourceUrl = item.SourceUrl,
                previewImage = BuildPreviewUrl(item.PreviewImage),
                localUrl = $"/localmedia/videos/{item.Id}"
            })
            .ToList();
        return Task.FromResult<IReadOnlyList<object>>(items);
    }

    public async Task WriteImageAsync(string? id, HttpContext httpContext)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            return;
        }

        var cached = _cache.GetImageById(id);
        if (cached == null)
        {
            httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }

        httpContext.Response.ContentType = cached.ContentType;
        await httpContext.Response.Body.WriteAsync(cached.Bytes, httpContext.RequestAborted);
    }

    public async Task WriteVideoAsync(string? id, HttpContext httpContext)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            return;
        }

        var cached = _cache.GetVideoById(id);
        if (cached == null)
        {
            httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }

        httpContext.Response.ContentType = cached.ContentType;
        await httpContext.Response.Body.WriteAsync(cached.Bytes, httpContext.RequestAborted);
    }

    public async Task<object> SearchVideosAsync(HttpRequest? request, string query, CancellationToken cancellationToken)
    {
        var result = await _client.SearchVideosAsync(query, 1, 15, cancellationToken);
        var items = result.Videos.Select(video =>
        {
            var cached = _cache.HasVideo(video.Id);
            var localUrl = cached ? BuildLocalUrl(request, $"/localmedia/videos/{video.Id}") : null;
            var previewUrl = BuildPreviewUrl(video.PreviewImage);
            return (object)new
            {
                id = video.Id,
                description = video.Description,
                width = video.Width,
                height = video.Height,
                duration = video.Duration,
                sourceUrl = video.SourceUrl,
                previewImage = previewUrl,
                downloadUrl = video.DownloadUrl,
                isCached = cached,
                localUrl
            };
        }).ToList();

        return new
        {
            totalResults = result.TotalResults,
            videos = items
        };
    }

    public async Task WritePreviewAsync(string url, HttpContext httpContext)
    {
        using var response = await PreviewClient.GetAsync(url, httpContext.RequestAborted);
        response.EnsureSuccessStatusCode();
        httpContext.Response.ContentType = response.Content.Headers.ContentType?.ToString() ?? "image/jpeg";
        await response.Content.CopyToAsync(httpContext.Response.Body, httpContext.RequestAborted);
    }

    public Task<(int Images, int Videos)> ClearCacheAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var result = _cache.ClearAll();
        return Task.FromResult(result);
    }

    private async Task EnsureImagesAsync(CancellationToken cancellationToken)
    {
        if (_cache.GetImageCount() >= ImageTargetCount) return;
        await _imageFillLock.WaitAsync(cancellationToken);
        try
        {
            var page = 1;
            var guard = 0;
            while (_cache.GetImageCount() < ImageTargetCount && guard < 8)
            {
                guard++;
                IReadOnlyList<PexelsPhoto> photos;
                try
                {
                    photos = await _client.FetchCuratedImagesAsync(page, ImagePageSize, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to fetch Pexels images (page {Page}).", page);
                    break;
                }
                if (photos.Count == 0) break;
                foreach (var photo in photos)
                {
                    if (_cache.GetImageCount() >= ImageTargetCount) break;
                    byte[] bytes;
                    try
                    {
                        bytes = await _client.DownloadBytesAsync(photo.DownloadUrl, cancellationToken);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to download Pexels image {Id}.", photo.Id);
                        continue;
                    }
                    var image = new CachedImage(
                        photo.Id,
                        photo.Description,
                        photo.Photographer,
                        photo.Width,
                        photo.Height,
                        "image/jpeg",
                        photo.SourceUrl,
                        bytes);
                    _cache.InsertImage(image);
                }
                page++;
            }
        }
        finally
        {
            _imageFillLock.Release();
        }
    }

    private async Task EnsureVideosAsync(CancellationToken cancellationToken)
    {
        if (_cache.GetVideoCount() >= VideoTargetCount) return;
        await _videoFillLock.WaitAsync(cancellationToken);
        try
        {
            var page = 1;
            var guard = 0;
            while (_cache.GetVideoCount() < VideoTargetCount && guard < 5)
            {
                guard++;
                IReadOnlyList<PexelsVideo> videos;
                try
                {
                    videos = await _client.FetchPopularVideosAsync(page, VideoPageSize, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to fetch Pexels videos (page {Page}).", page);
                    break;
                }
                if (videos.Count == 0) break;
                foreach (var video in videos)
                {
                    if (_cache.GetVideoCount() >= VideoTargetCount) break;
                    byte[] bytes;
                    try
                    {
                        bytes = await _client.DownloadBytesAsync(video.DownloadUrl, cancellationToken);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to download Pexels video {Id}.", video.Id);
                        continue;
                    }
                    var cached = new CachedVideo(
                        video.Id,
                        video.Description,
                        video.Width,
                        video.Height,
                        video.Duration,
                        "video/mp4",
                        video.SourceUrl,
                        bytes,
                        video.PreviewImage);
                    _cache.InsertVideo(cached);
                }
                page++;
            }
        }
        finally
        {
            _videoFillLock.Release();
        }
    }

    private static string BuildLocalUrl(HttpRequest? request, string path)
    {
        if (request == null) return path;
        var scheme = request.Scheme;
        var host = request.Host.Value;
        return $"{scheme}://{host}{path}";
    }

    private static string BuildPreviewUrl(string? previewImage)
    {
        if (string.IsNullOrWhiteSpace(previewImage)) return "";
        if (previewImage.StartsWith("/localmedia/preview", StringComparison.OrdinalIgnoreCase)) return previewImage;
        return $"/localmedia/preview?url={Uri.EscapeDataString(previewImage)}";
    }
}
