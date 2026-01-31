using Core.Designer;
namespace StreamCraft.Bits.PublicApiSources;

public sealed class PublicApiSourceLoader
{
    public PublicApiSourceLoader(ILogger logger)
    {
    }

    public IReadOnlyList<IApiSource> LoadAll()
    {
        return GetFallback();
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
                DocsUrl = "https://open-meteo.com/",
                Endpoints = new[]
                {
                    new ApiEndpointSpec("Forecast", "/v1/forecast", "GET", "Hourly/daily weather by lat/lon.")
                }
            },
            new PublicApiSource
            {
                Id = "open-iss",
                Name = "Open Notify",
                Description = "ISS location and people in space",
                BaseUrl = "http://api.open-notify.org",
                DocsUrl = "http://open-notify.org/Open-Notify-API/",
                Endpoints = new[]
                {
                    new ApiEndpointSpec("ISS Now", "/iss-now.json", "GET", "Current ISS coordinates."),
                    new ApiEndpointSpec("People in Space", "/astros.json", "GET", "Current people in space.")
                }
            },
            new PublicApiSource
            {
                Id = "spaceflight-news",
                Name = "Spaceflight News",
                Description = "Spaceflight news API",
                BaseUrl = "https://api.spaceflightnewsapi.net",
                DocsUrl = "https://spaceflightnewsapi.net/",
                Endpoints = new[]
                {
                    new ApiEndpointSpec("Articles", "/v4/articles", "GET", "Latest spaceflight articles.")
                }
            },
            new PublicApiSource
            {
                Id = "jokes",
                Name = "Official Joke API",
                Description = "Random jokes (no auth)",
                BaseUrl = "https://official-joke-api.appspot.com",
                DocsUrl = "https://official-joke-api.appspot.com/",
                Endpoints = new[]
                {
                    new ApiEndpointSpec("Random Joke", "/random_joke", "GET", "One random joke.")
                }
            },
            new PublicApiSource
            {
                Id = "cat-facts",
                Name = "Cat Facts",
                Description = "Random cat facts",
                BaseUrl = "https://catfact.ninja",
                DocsUrl = "https://catfact.ninja/",
                Endpoints = new[]
                {
                    new ApiEndpointSpec("Random Fact", "/fact", "GET", "Random cat fact.")
                }
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
