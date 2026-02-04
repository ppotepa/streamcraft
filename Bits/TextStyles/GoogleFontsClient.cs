using System.Text.Json;
using Core.Utilities;

namespace StreamCraft.Bits.TextStyles;

public interface IGoogleFontsClient
{
    Task<IReadOnlyList<GoogleFontFamily>> FetchCatalogAsync(CancellationToken cancellationToken);
    Task<(byte[] Bytes, string ContentType)> DownloadFontAsync(string url, CancellationToken cancellationToken);
}

public sealed class GoogleFontsClient : IGoogleFontsClient
{
    private const string BaseUrl = "https://www.googleapis.com/webfonts/v1/webfonts";
    private readonly HttpClient _httpClient = new();
    private readonly IKeyVault _keyVault;

    public GoogleFontsClient(IKeyVault keyVault)
    {
        _keyVault = keyVault;
    }

    public async Task<IReadOnlyList<GoogleFontFamily>> FetchCatalogAsync(CancellationToken cancellationToken)
    {
        var key = await GetApiKeyAsync(cancellationToken);
        var uri = $"{BaseUrl}?key={Uri.EscapeDataString(key)}&sort=popularity";
        using var response = await _httpClient.GetAsync(uri, cancellationToken);
        response.EnsureSuccessStatusCode();
        var payload = await response.Content.ReadAsStringAsync(cancellationToken);
        using var doc = JsonDocument.Parse(payload);

        var results = new List<GoogleFontFamily>();
        if (doc.RootElement.TryGetProperty("items", out var items))
        {
            foreach (var item in items.EnumerateArray())
            {
                var family = item.TryGetProperty("family", out var familyProp) ? familyProp.GetString() ?? "" : "";
                if (string.IsNullOrWhiteSpace(family)) continue;
                var category = item.TryGetProperty("category", out var catProp) ? catProp.GetString() ?? "" : "";
                var version = item.TryGetProperty("version", out var verProp) ? verProp.GetString() : null;
                var lastModified = item.TryGetProperty("lastModified", out var lmProp) ? lmProp.GetString() : null;
                var variants = item.TryGetProperty("variants", out var variantsProp) && variantsProp.ValueKind == JsonValueKind.Array
                    ? variantsProp.EnumerateArray().Select(v => v.GetString() ?? "").Where(v => !string.IsNullOrWhiteSpace(v)).ToArray()
                    : Array.Empty<string>();
                var subsets = item.TryGetProperty("subsets", out var subsetsProp) && subsetsProp.ValueKind == JsonValueKind.Array
                    ? subsetsProp.EnumerateArray().Select(v => v.GetString() ?? "").Where(v => !string.IsNullOrWhiteSpace(v)).ToArray()
                    : Array.Empty<string>();
                var files = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                if (item.TryGetProperty("files", out var filesProp) && filesProp.ValueKind == JsonValueKind.Object)
                {
                    foreach (var file in filesProp.EnumerateObject())
                    {
                        var url = file.Value.GetString() ?? "";
                        if (!string.IsNullOrWhiteSpace(url))
                        {
                            files[file.Name] = url;
                        }
                    }
                }

                results.Add(new GoogleFontFamily(family, category, version, lastModified, variants, subsets, files));
            }
        }

        return results;
    }

    public async Task<(byte[] Bytes, string ContentType)> DownloadFontAsync(string url, CancellationToken cancellationToken)
    {
        using var response = await _httpClient.GetAsync(url, cancellationToken);
        response.EnsureSuccessStatusCode();
        var bytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);
        var contentType = response.Content.Headers.ContentType?.MediaType ?? "font/ttf";
        return (bytes, contentType);
    }

    private async Task<string> GetApiKeyAsync(CancellationToken cancellationToken)
    {
        var env = GetEnvironment();
        var key = await _keyVault.GetAsync("googlefonts", env, cancellationToken);
        if (string.IsNullOrWhiteSpace(key))
        {
            throw new InvalidOperationException("Google Fonts API key is missing from key vault.");
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
}

public sealed record GoogleFontFamily(
    string Family,
    string Category,
    string? Version,
    string? LastModified,
    string[] Variants,
    string[] Subsets,
    IReadOnlyDictionary<string, string> Files);
