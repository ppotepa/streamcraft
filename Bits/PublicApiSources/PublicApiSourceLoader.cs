using Core.Designer;
namespace StreamCraft.Bits.PublicApiSources;

public sealed class PublicApiSourceLoader
{

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
                Id = "jsonplaceholder",
                Name = "JSONPlaceholder",
                Description = "Fake REST API for testing and prototyping",
                BaseUrl = "https://jsonplaceholder.typicode.com",
                DocsUrl = "https://jsonplaceholder.typicode.com/",
                Endpoints = new[]
                {
                    new ApiEndpointSpec("Posts", "/posts", "GET", "List posts."),
                    new ApiEndpointSpec("Users", "/users", "GET", "List users.")
                }
            },
            new PublicApiSource
            {
                Id = "reqres",
                Name = "ReqRes",
                Description = "Hosted REST API for front-end testing",
                BaseUrl = "https://reqres.in",
                DocsUrl = "https://reqres.in/",
                Endpoints = new[]
                {
                    new ApiEndpointSpec("Users", "/api/users", "GET", "List users."),
                    new ApiEndpointSpec("Single User", "/api/users/2", "GET", "Get user by id.")
                }
            },
            new PublicApiSource
            {
                Id = "httpbin",
                Name = "httpbin",
                Description = "HTTP request and response service",
                BaseUrl = "https://httpbin.org",
                DocsUrl = "https://httpbin.org/",
                Endpoints = new[]
                {
                    new ApiEndpointSpec("Get", "/get", "GET", "Echo request data."),
                    new ApiEndpointSpec("Anything", "/anything", "GET", "Echo anything.")
                }
            },
            new PublicApiSource
            {
                Id = "bored",
                Name = "Bored API",
                Description = "Random activities to fight boredom",
                BaseUrl = "https://www.boredapi.com",
                DocsUrl = "https://www.boredapi.com/",
                Endpoints = new[]
                {
                    new ApiEndpointSpec("Activity", "/api/activity", "GET", "Random activity.")
                }
            },
            new PublicApiSource
            {
                Id = "randomuser",
                Name = "Random User",
                Description = "Random user generator",
                BaseUrl = "https://randomuser.me",
                DocsUrl = "https://randomuser.me/",
                Endpoints = new[]
                {
                    new ApiEndpointSpec("Users", "/api", "GET", "Generate random users.")
                }
            },
            new PublicApiSource
            {
                Id = "numbers",
                Name = "Numbers API",
                Description = "Facts about numbers",
                BaseUrl = "http://numbersapi.com",
                DocsUrl = "http://numbersapi.com/",
                Endpoints = new[]
                {
                    new ApiEndpointSpec("Random", "/random", "GET", "Random number fact."),
                    new ApiEndpointSpec("Math", "/random/math", "GET", "Random math fact.")
                }
            },
            new PublicApiSource
            {
                Id = "advice",
                Name = "Advice Slip",
                Description = "Random advice",
                BaseUrl = "https://api.adviceslip.com",
                DocsUrl = "https://api.adviceslip.com/",
                Endpoints = new[]
                {
                    new ApiEndpointSpec("Random Advice", "/advice", "GET", "Random advice slip.")
                }
            },
            new PublicApiSource
            {
                Id = "kanye-rest",
                Name = "Kanye Rest",
                Description = "Random Kanye West quotes",
                BaseUrl = "https://api.kanye.rest",
                DocsUrl = "https://kanye.rest/",
                Endpoints = new[]
                {
                    new ApiEndpointSpec("Random Quote", "/", "GET", "Random quote.")
                }
            },
            new PublicApiSource
            {
                Id = "quotable",
                Name = "Quotable",
                Description = "Famous quotes database",
                BaseUrl = "https://api.quotable.io",
                DocsUrl = "https://github.com/lukePeavey/quotable",
                Endpoints = new[]
                {
                    new ApiEndpointSpec("Random Quote", "/random", "GET", "Random quote."),
                    new ApiEndpointSpec("Quotes", "/quotes", "GET", "List quotes.")
                }
            },
            new PublicApiSource
            {
                Id = "xkcd",
                Name = "xkcd",
                Description = "xkcd comics JSON",
                BaseUrl = "https://xkcd.com",
                DocsUrl = "https://xkcd.com/json.html",
                Endpoints = new[]
                {
                    new ApiEndpointSpec("Latest", "/info.0.json", "GET", "Latest comic.")
                }
            },
            new PublicApiSource
            {
                Id = "restcountries",
                Name = "REST Countries",
                Description = "Country data",
                BaseUrl = "https://restcountries.com",
                DocsUrl = "https://restcountries.com/",
                Endpoints = new[]
                {
                    new ApiEndpointSpec("All", "/v3.1/all", "GET", "All countries."),
                    new ApiEndpointSpec("By Name", "/v3.1/name/poland", "GET", "Country by name.")
                }
            },
            new PublicApiSource
            {
                Id = "agify",
                Name = "Agify",
                Description = "Estimate age from name",
                BaseUrl = "https://api.agify.io",
                DocsUrl = "https://agify.io/",
                Endpoints = new[]
                {
                    new ApiEndpointSpec("Predict", "/?name=michael", "GET", "Age prediction.")
                }
            },
            new PublicApiSource
            {
                Id = "genderize",
                Name = "Genderize",
                Description = "Estimate gender from name",
                BaseUrl = "https://api.genderize.io",
                DocsUrl = "https://genderize.io/",
                Endpoints = new[]
                {
                    new ApiEndpointSpec("Predict", "/?name=alex", "GET", "Gender prediction.")
                }
            },
            new PublicApiSource
            {
                Id = "nationalize",
                Name = "Nationalize",
                Description = "Estimate nationality from name",
                BaseUrl = "https://api.nationalize.io",
                DocsUrl = "https://nationalize.io/",
                Endpoints = new[]
                {
                    new ApiEndpointSpec("Predict", "/?name=lucas", "GET", "Nationality prediction.")
                }
            },
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
                Id = "spacex",
                Name = "SpaceX",
                Description = "SpaceX data API",
                BaseUrl = "https://api.spacexdata.com",
                DocsUrl = "https://github.com/r-spacex/SpaceX-API",
                Endpoints = new[]
                {
                    new ApiEndpointSpec("Launches", "/v5/launches", "GET", "All launches."),
                    new ApiEndpointSpec("Latest Launch", "/v5/launches/latest", "GET", "Latest launch.")
                }
            },
            new PublicApiSource
            {
                Id = "rick-and-morty",
                Name = "Rick and Morty",
                Description = "Characters and episodes",
                BaseUrl = "https://rickandmortyapi.com",
                DocsUrl = "https://rickandmortyapi.com/",
                Endpoints = new[]
                {
                    new ApiEndpointSpec("Characters", "/api/character", "GET", "List characters."),
                    new ApiEndpointSpec("Episodes", "/api/episode", "GET", "List episodes.")
                }
            },
            new PublicApiSource
            {
                Id = "pokeapi",
                Name = "PokeAPI",
                Description = "Pokemon data",
                BaseUrl = "https://pokeapi.co",
                DocsUrl = "https://pokeapi.co/",
                Endpoints = new[]
                {
                    new ApiEndpointSpec("Pokemon", "/api/v2/pokemon", "GET", "List pokemon."),
                    new ApiEndpointSpec("Abilities", "/api/v2/ability", "GET", "List abilities.")
                }
            },
            new PublicApiSource
            {
                Id = "opentrivia",
                Name = "Open Trivia DB",
                Description = "Trivia questions",
                BaseUrl = "https://opentdb.com",
                DocsUrl = "https://opentdb.com/api_config.php",
                Endpoints = new[]
                {
                    new ApiEndpointSpec("Questions", "/api.php?amount=10", "GET", "Fetch trivia questions.")
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
            },
            new PublicApiSource
            {
                Id = "dog-ceo",
                Name = "Dog CEO",
                Description = "Random dog images",
                BaseUrl = "https://dog.ceo",
                DocsUrl = "https://dog.ceo/dog-api/",
                Endpoints = new[]
                {
                    new ApiEndpointSpec("Random Dog", "/api/breeds/image/random", "GET", "Random dog image.")
                }
            },
            new PublicApiSource
            {
                Id = "randomfox",
                Name = "RandomFox",
                Description = "Random fox images",
                BaseUrl = "https://randomfox.ca",
                DocsUrl = "https://randomfox.ca/floof/",
                Endpoints = new[]
                {
                    new ApiEndpointSpec("Random Fox", "/floof/", "GET", "Random fox image.")
                }
            },
            new PublicApiSource
            {
                Id = "randomdog",
                Name = "RandomDog",
                Description = "Random dog images and videos",
                BaseUrl = "https://random.dog",
                DocsUrl = "https://random.dog/woof.json",
                Endpoints = new[]
                {
                    new ApiEndpointSpec("Random Dog", "/woof.json", "GET", "Random dog media.")
                }
            },
            new PublicApiSource
            {
                Id = "randomduck",
                Name = "RandomDuck",
                Description = "Random duck images",
                BaseUrl = "https://random-d.uk",
                DocsUrl = "https://random-d.uk/api",
                Endpoints = new[]
                {
                    new ApiEndpointSpec("Random Duck", "/api/v2/random", "GET", "Random duck image.")
                }
            },
            new PublicApiSource
            {
                Id = "coffee",
                Name = "Coffee",
                Description = "Random coffee images",
                BaseUrl = "https://coffee.alexflipnote.dev",
                DocsUrl = "https://coffee.alexflipnote.dev/",
                Endpoints = new[]
                {
                    new ApiEndpointSpec("Random Coffee", "/random.json", "GET", "Random coffee image.")
                }
            },
            new PublicApiSource
            {
                Id = "openlibrary",
                Name = "Open Library",
                Description = "Books and covers data",
                BaseUrl = "https://openlibrary.org",
                DocsUrl = "https://openlibrary.org/developers/api",
                Endpoints = new[]
                {
                    new ApiEndpointSpec("Search", "/search.json?q=harry+potter", "GET", "Search books.")
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
