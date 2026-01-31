using Core.Designer;
using Serilog;

namespace StreamCraft.Bits.PublicApiSources;

public sealed class PublicApiSourceLoader
{
    private readonly ILogger _logger;

    public PublicApiSourceLoader(ILogger logger)
    {
        _logger = logger;
    }

    public IReadOnlyList<IApiSource> LoadAll()
    {
        var sources = new List<IApiSource>();
        sources.AddRange(LoadFromSubmodule());

        if (sources.Count == 0)
        {
            sources.AddRange(GetFallback());
        }

        return sources;
    }

    private IReadOnlyList<IApiSource> LoadFromSubmodule()
    {
        try
        {
            var root = AppContext.BaseDirectory;
            var repoRoot = ResolveRepoRoot(root);
            var readme = Path.Combine(repoRoot, ".submodules", "public-apis", "README.md");
            if (!File.Exists(readme))
            {
                _logger.Warning("Public API README not found at {Path}", readme);
                return Array.Empty<IApiSource>();
            }

            var lines = File.ReadAllLines(readme);
            var sources = new List<IApiSource>();
            foreach (var line in lines)
            {
                if (!line.StartsWith("|", StringComparison.Ordinal))
                {
                    continue;
                }

                var parts = line.Split('|', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length < 5)
                {
                    continue;
                }

                if (string.Equals(parts[0], "API", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                var name = parts[0];
                var description = parts[1];
                var link = parts.Length >= 6 ? parts[5] : parts[^1];
                if (string.IsNullOrWhiteSpace(link) || link.StartsWith("---", StringComparison.Ordinal))
                {
                    continue;
                }

                sources.Add(new PublicApiSource
                {
                    Id = Slug(name),
                    Name = name,
                    Description = description,
                    BaseUrl = link,
                    DocsUrl = link
                });
            }

            return sources;
        }
        catch (Exception ex)
        {
            _logger.Warning(ex, "Failed to parse public-apis README.");
            return Array.Empty<IApiSource>();
        }
    }

    private static string ResolveRepoRoot(string baseDir)
    {
        var current = new DirectoryInfo(baseDir);
        while (current != null && current.Name != "streamcraft")
        {
            current = current.Parent;
        }

        return current?.FullName ?? baseDir;
    }

    private static string Slug(string value)
    {
        return new string(value.ToLowerInvariant()
            .Where(ch => char.IsLetterOrDigit(ch) || ch == '-' || ch == '_')
            .ToArray());
    }

    private static IReadOnlyList<IApiSource> GetFallback()
    {
        return new List<IApiSource>
        {
            new PublicApiSource
            {
                Id = "open-meteo",
                Name = "Open-Meteo",
                Description = "Weather forecast API",
                BaseUrl = "https://api.open-meteo.com",
                DocsUrl = "https://open-meteo.com/"
            },
            new PublicApiSource
            {
                Id = "open-iss",
                Name = "Open Notify",
                Description = "ISS location and people in space",
                BaseUrl = "http://api.open-notify.org",
                DocsUrl = "http://open-notify.org/Open-Notify-API/"
            },
            new PublicApiSource
            {
                Id = "spaceflight-news",
                Name = "Spaceflight News",
                Description = "Spaceflight news API",
                BaseUrl = "https://api.spaceflightnewsapi.net",
                DocsUrl = "https://spaceflightnewsapi.net/"
            }
        };
    }
}

public sealed class PublicApiSource : IApiSource
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string Kind { get; init; } = "public-api";
    public string BaseUrl { get; init; } = string.Empty;
    public string? DocsUrl { get; init; }
    public IReadOnlyList<ApiEndpointSpec> Endpoints { get; init; } = Array.Empty<ApiEndpointSpec>();
}
