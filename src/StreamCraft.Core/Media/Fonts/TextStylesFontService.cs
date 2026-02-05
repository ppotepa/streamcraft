using Microsoft.Extensions.Logging;

namespace StreamCraft.Core.Media.Fonts;

public sealed class TextStylesFontService
{
    private readonly TextStylesFontStore _store;
    private readonly IGoogleFontsClient _client;
    private readonly ILogger<TextStylesFontService> _logger;

    public TextStylesFontService(TextStylesFontStore store, IGoogleFontsClient client, ILogger<TextStylesFontService> logger)
    {
        _store = store;
        _client = client;
        _logger = logger;
    }

    public async Task<IReadOnlyList<CachedFontFamily>> ListCatalogAsync(string? query, string? category, int limit, CancellationToken cancellationToken)
    {
        await EnsureCatalogAsync(cancellationToken);
        return _store.ListFamilies(query, category, limit);
    }

    public async Task<(IReadOnlyList<CachedFontFamily> Items, int Total)> GetCatalogAsync(string? query, string? category, int limit, CancellationToken cancellationToken)
    {
        await EnsureCatalogAsync(cancellationToken);
        var items = _store.ListFamilies(query, category, limit);
        var total = _store.CountFamilies(query, category);
        return (items, total);
    }

    public async Task<int> RefreshCatalogAsync(CancellationToken cancellationToken)
    {
        var families = await _client.FetchCatalogAsync(cancellationToken);
        _store.UpsertFamilies(families);
        _logger.LogInformation("Google Fonts catalog refreshed: {Count} families.", families.Count);
        return families.Count;
    }

    public async Task<CachedFontFile?> GetFontFileAsync(string family, string? variant, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(family)) return null;
        var desiredVariant = string.IsNullOrWhiteSpace(variant) ? "regular" : variant.Trim();

        var cached = _store.GetFontFile(family, desiredVariant);
        if (cached != null && cached.Bytes.Length > 0)
        {
            return cached;
        }

        await EnsureCatalogAsync(cancellationToken);
        var meta = _store.GetFamily(family);
        if (meta == null || meta.Files.Count == 0) return null;

        var selectedVariant = ResolveVariant(desiredVariant, meta.Files);
        if (selectedVariant == null) return null;

        if (selectedVariant != desiredVariant)
        {
            cached = _store.GetFontFile(family, selectedVariant);
            if (cached != null && cached.Bytes.Length > 0)
            {
                return cached;
            }
        }

        var url = meta.Files[selectedVariant];
        var (bytes, contentType) = await _client.DownloadFontAsync(url, cancellationToken);
        var file = new CachedFontFile(family, selectedVariant, url, contentType, bytes);
        _store.UpsertFontFile(file);
        return file;
    }

    private async Task EnsureCatalogAsync(CancellationToken cancellationToken)
    {
        if (_store.GetFamilyCount() > 0) return;
        await RefreshCatalogAsync(cancellationToken);
    }

    private static string? ResolveVariant(string desiredVariant, IReadOnlyDictionary<string, string> files)
    {
        if (files.ContainsKey(desiredVariant)) return desiredVariant;
        if (files.ContainsKey("regular")) return "regular";
        return files.Keys.FirstOrDefault();
    }
}




