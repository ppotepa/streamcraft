using System.Text.Json;
using System.Linq;
using Core.Utilities;

namespace StreamCraft.Bits.PexelsMedia;

public sealed class PexelsClient
{
    private const string BasePhotos = "https://api.pexels.com/v1/curated";
    private const string BaseVideos = "https://api.pexels.com/videos/popular";
    private const string BaseVideoSearch = "https://api.pexels.com/videos/search";
    private static readonly (int Width, int Height)[] AllowedVideoSizes =
    [
        (1920, 1080),
        (3840, 2160)
    ];
    private readonly HttpClient _httpClient = new();
    private readonly IKeyVault _keyVault;

    public PexelsClient(IKeyVault keyVault)
    {
        _keyVault = keyVault;
    }

    public async Task<IReadOnlyList<PexelsPhoto>> FetchCuratedImagesAsync(int page, int perPage, CancellationToken cancellationToken)
    {
        var key = await GetApiKeyAsync(cancellationToken);
        var uri = $"{BasePhotos}?per_page={perPage}&page={page}";
        using var request = new HttpRequestMessage(HttpMethod.Get, uri);
        request.Headers.Remove("Authorization");
        request.Headers.Add("Authorization", key);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
        var payload = await response.Content.ReadAsStringAsync(cancellationToken);
        using var doc = JsonDocument.Parse(payload);
        var photos = new List<PexelsPhoto>();
        if (doc.RootElement.TryGetProperty("photos", out var array))
        {
            foreach (var item in array.EnumerateArray())
            {
                var id = item.GetProperty("id").GetInt32().ToString();
                var width = item.GetProperty("width").GetInt32();
                var height = item.GetProperty("height").GetInt32();
                var url = item.GetProperty("url").GetString() ?? "";
                var alt = item.TryGetProperty("alt", out var altProp) ? altProp.GetString() : null;
                var photographer = item.TryGetProperty("photographer", out var photographerProp)
                    ? photographerProp.GetString()
                    : null;
                var src = item.TryGetProperty("src", out var srcProp) ? srcProp : default;
                var downloadUrl = src.ValueKind == JsonValueKind.Object && src.TryGetProperty("large", out var largeProp)
                    ? largeProp.GetString() ?? url
                    : url;
                photos.Add(new PexelsPhoto(id, alt ?? "Pexels Photo", photographer ?? "", width, height, url, downloadUrl));
            }
        }
        return photos;
    }

    public async Task<IReadOnlyList<PexelsVideo>> FetchPopularVideosAsync(int page, int perPage, CancellationToken cancellationToken)
    {
        var key = await GetApiKeyAsync(cancellationToken);
        var uri = $"{BaseVideos}?per_page={perPage}&page={page}";
        using var request = new HttpRequestMessage(HttpMethod.Get, uri);
        request.Headers.Remove("Authorization");
        request.Headers.Add("Authorization", key);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
        var payload = await response.Content.ReadAsStringAsync(cancellationToken);
        using var doc = JsonDocument.Parse(payload);
        var videos = new List<PexelsVideo>();
        if (doc.RootElement.TryGetProperty("videos", out var array))
        {
            foreach (var item in array.EnumerateArray())
            {
                var id = item.GetProperty("id").GetInt32().ToString();
                var width = item.TryGetProperty("width", out var widthProp) ? widthProp.GetInt32() : 0;
                var height = item.TryGetProperty("height", out var heightProp) ? heightProp.GetInt32() : 0;
                var duration = item.TryGetProperty("duration", out var durationProp) ? durationProp.GetInt32() : 0;
                var url = item.TryGetProperty("url", out var urlProp) ? urlProp.GetString() ?? "" : "";
                var image = item.TryGetProperty("image", out var imageProp) ? imageProp.GetString() ?? "" : "";
                var userName = item.TryGetProperty("user", out var userProp) && userProp.TryGetProperty("name", out var nameProp)
                    ? nameProp.GetString() ?? ""
                    : "";
                var description = BuildVideoTitle(url, userName, id);

                var fileUrl = "";
                var fileWidth = 0;
                var fileHeight = 0;
                if (item.TryGetProperty("video_files", out var filesProp) &&
                    TrySelectVideoFile(filesProp, out var selectedUrl, out var selectedWidth, out var selectedHeight))
                {
                    fileUrl = selectedUrl;
                    fileWidth = selectedWidth;
                    fileHeight = selectedHeight;
                }

                if (!string.IsNullOrWhiteSpace(fileUrl))
                {
                    videos.Add(new PexelsVideo(id, description, fileWidth > 0 ? fileWidth : width, fileHeight > 0 ? fileHeight : height, duration, url, fileUrl, image));
                }
            }
        }
        return videos;
    }

    public async Task<PexelsVideoSearchResult> SearchVideosAsync(string query, int page, int perPage, CancellationToken cancellationToken)
    {
        var key = await GetApiKeyAsync(cancellationToken);
        var uri = $"{BaseVideoSearch}?query={Uri.EscapeDataString(query)}&per_page={perPage}&page={page}&orientation=landscape&size=medium";
        using var request = new HttpRequestMessage(HttpMethod.Get, uri);
        request.Headers.Remove("Authorization");
        request.Headers.Add("Authorization", key);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
        var payload = await response.Content.ReadAsStringAsync(cancellationToken);
        using var doc = JsonDocument.Parse(payload);
        var videos = new List<PexelsVideo>();
        var totalResults = doc.RootElement.TryGetProperty("total_results", out var totalProp)
            ? totalProp.GetInt32()
            : 0;
        if (doc.RootElement.TryGetProperty("videos", out var array))
        {
            foreach (var item in array.EnumerateArray())
            {
                var id = item.GetProperty("id").GetInt32().ToString();
                var width = item.TryGetProperty("width", out var widthProp) ? widthProp.GetInt32() : 0;
                var height = item.TryGetProperty("height", out var heightProp) ? heightProp.GetInt32() : 0;
                var duration = item.TryGetProperty("duration", out var durationProp) ? durationProp.GetInt32() : 0;
                var url = item.TryGetProperty("url", out var urlProp) ? urlProp.GetString() ?? "" : "";
                var image = item.TryGetProperty("image", out var imageProp) ? imageProp.GetString() ?? "" : "";
                var userName = item.TryGetProperty("user", out var userProp) && userProp.TryGetProperty("name", out var nameProp)
                    ? nameProp.GetString() ?? ""
                    : "";
                var description = BuildVideoTitle(url, userName, id);

                var fileUrl = "";
                var fileWidth = 0;
                var fileHeight = 0;
                if (item.TryGetProperty("video_files", out var filesProp) &&
                    TrySelectVideoFile(filesProp, out var selectedUrl, out var selectedWidth, out var selectedHeight))
                {
                    fileUrl = selectedUrl;
                    fileWidth = selectedWidth;
                    fileHeight = selectedHeight;
                }

                if (!string.IsNullOrWhiteSpace(fileUrl))
                {
                    videos.Add(new PexelsVideo(id, description, fileWidth > 0 ? fileWidth : width, fileHeight > 0 ? fileHeight : height, duration, url, fileUrl, image));
                }
            }
        }
        return new PexelsVideoSearchResult(videos, totalResults);
    }

    public async Task<byte[]> DownloadBytesAsync(string url, CancellationToken cancellationToken)
    {
        using var response = await _httpClient.GetAsync(url, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsByteArrayAsync(cancellationToken);
    }

    private async Task<string> GetApiKeyAsync(CancellationToken cancellationToken)
    {
        var env = GetEnvironment();
        var key = await _keyVault.GetAsync("pexels", env, cancellationToken);
        if (string.IsNullOrWhiteSpace(key))
        {
            throw new InvalidOperationException("Pexels API key is missing from key vault.");
        }

        return key;
    }

    private static KeyVaultEnvironment GetEnvironment()
    {
        var raw = Environment.GetEnvironmentVariable("STREAMCRAFT_ENV") ?? "dev";
        if (string.Equals(raw, "test", StringComparison.OrdinalIgnoreCase)) return KeyVaultEnvironment.Test;
        if (string.Equals(raw, "live", StringComparison.OrdinalIgnoreCase)) return KeyVaultEnvironment.Live;
        return KeyVaultEnvironment.Dev;
    }

    private static bool TrySelectVideoFile(JsonElement filesProp, out string url, out int width, out int height)
    {
        url = "";
        width = 0;
        height = 0;
        if (filesProp.ValueKind != JsonValueKind.Array) return false;

        var candidates = new List<(JsonElement File, int Width, int Height)>();
        foreach (var file in filesProp.EnumerateArray())
        {
            if (!file.TryGetProperty("file_type", out var ft)) continue;
            if (!(ft.GetString() ?? "").Contains("mp4", StringComparison.OrdinalIgnoreCase)) continue;
            var w = file.TryGetProperty("width", out var widthProp) ? widthProp.GetInt32() : 0;
            var h = file.TryGetProperty("height", out var heightProp) ? heightProp.GetInt32() : 0;
            candidates.Add((file, w, h));
        }

        var selected = candidates
            .Where(candidate => AllowedVideoSizes.Any(size => size.Width == candidate.Width && size.Height == candidate.Height))
            .OrderByDescending(candidate => candidate.Width)
            .FirstOrDefault();

        if (selected.File.ValueKind == JsonValueKind.Undefined) return false;
        if (!selected.File.TryGetProperty("link", out var linkProp)) return false;

        url = linkProp.GetString() ?? "";
        width = selected.Width;
        height = selected.Height;
        return !string.IsNullOrWhiteSpace(url);
    }

    private static string BuildVideoTitle(string? url, string? userName, string id)
    {
        var title = "";
        if (!string.IsNullOrWhiteSpace(url))
        {
            try
            {
                var uri = new Uri(url);
                var segment = uri.Segments.LastOrDefault()?.Trim('/');
                if (!string.IsNullOrWhiteSpace(segment))
                {
                    var cleaned = segment;
                    if (cleaned.EndsWith(id, StringComparison.OrdinalIgnoreCase))
                    {
                        cleaned = cleaned[..Math.Max(0, cleaned.Length - id.Length)].Trim('-');
                    }
                    cleaned = cleaned.Replace("-", " ").Trim();
                    if (!string.IsNullOrWhiteSpace(cleaned))
                    {
                        title = System.Globalization.CultureInfo.InvariantCulture.TextInfo.ToTitleCase(cleaned);
                    }
                }
            }
            catch
            {
                title = "";
            }
        }

        if (!string.IsNullOrWhiteSpace(title))
        {
            return title;
        }

        if (!string.IsNullOrWhiteSpace(userName))
        {
            return $"{userName} Video";
        }

        return $"Pexels Video {id}";
    }
}

public sealed record PexelsPhoto(
    string Id,
    string Description,
    string Photographer,
    int Width,
    int Height,
    string SourceUrl,
    string DownloadUrl);

public sealed record PexelsVideo(
    string Id,
    string Description,
    int Width,
    int Height,
    int Duration,
    string SourceUrl,
    string DownloadUrl,
    string PreviewImage);

public sealed record PexelsVideoSearchResult(
    IReadOnlyList<PexelsVideo> Videos,
    int TotalResults);
