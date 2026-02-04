using Core.DataSources;
using StreamCraft.Bits.PublicApiSources.Models;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.Reflection;
using System.Text.Json.Serialization;

namespace StreamCraft.Bits.PublicApiSources;

public sealed class PublicApiResponseModelRegistry
{
    private static readonly ApiResponseMetadata Missing = new()
    {
        Success = false,
        Error = "Model not defined",
        FetchedUtc = DateTime.UtcNow
    };

    private readonly Dictionary<MetadataKey, Func<ApiResponseMetadata>> _map = new()
    {
        [MetadataKey.From("jsonplaceholder", "/posts", "GET")] = () => ApiResponseModelIntrospector.FromModel(new[]
        {
            new JsonPlaceholderPost
            {
                UserId = 1,
                Id = 1,
                Title = "sunt aut facere repellat provident occaecati excepturi optio reprehenderit",
                Body = "quia et suscipit suscipit recusandae consequuntur expedita"
            }
        }),

        [MetadataKey.From("jsonplaceholder", "/users", "GET")] = () => ApiResponseModelIntrospector.FromModel(new[]
        {
            new JsonPlaceholderUser
            {
                Id = 1,
                Name = "Leanne Graham",
                Username = "Bret",
                Email = "Sincere@april.biz",
                Address = new JsonPlaceholderAddress
                {
                    Street = "Kulas Light",
                    Suite = "Apt. 556",
                    City = "Gwenborough",
                    Zipcode = "92998-3874",
                    Geo = new JsonPlaceholderGeo { Lat = "-37.3159", Lng = "81.1496" }
                },
                Phone = "1-770-736-8031 x56442",
                Website = "hildegard.org",
                Company = new JsonPlaceholderCompany
                {
                    Name = "Romaguera-Crona",
                    CatchPhrase = "Multi-layered client-server neural-net",
                    Bs = "harness real-time e-markets"
                }
            }
        }),

        [MetadataKey.From("reqres", "/api/users", "GET")] = () => ApiResponseModelIntrospector.FromModel(new ReqResUserResponse
        {
            Page = 1,
            PerPage = 6,
            Total = 12,
            TotalPages = 2,
            Data =
            {
                new ReqResUser
                {
                    Id = 1,
                    Email = "george.bluth@reqres.in",
                    FirstName = "George",
                    LastName = "Bluth",
                    Avatar = "https://reqres.in/img/faces/1-image.jpg"
                }
            }
        }, success: false, statusCode: 403, error: "HTTP 403"),

        [MetadataKey.From("reqres", "/api/users/2", "GET")] = () => ApiResponseModelIntrospector.FromModel(new ReqResUserResponse
        {
            Page = 1,
            PerPage = 1,
            Total = 1,
            TotalPages = 1,
            Data =
            {
                new ReqResUser
                {
                    Id = 2,
                    Email = "janet.weaver@reqres.in",
                    FirstName = "Janet",
                    LastName = "Weaver",
                    Avatar = "https://reqres.in/img/faces/2-image.jpg"
                }
            }
        }, success: false, statusCode: 403, error: "HTTP 403"),

        [MetadataKey.From("httpbin", "/get", "GET")] = () => ApiResponseModelIntrospector.FromModel(new HttpBinResponse
        {
            Args = new Dictionary<string, string> { { "foo", "bar" } },
            Headers = new Dictionary<string, string>
            {
                { "Accept", "application/json" },
                { "Host", "httpbin.org" },
                { "User-Agent", "StreamCraft/1.0" }
            },
            Origin = "127.0.0.1",
            Url = "https://httpbin.org/get"
        }),

        [MetadataKey.From("httpbin", "/anything", "GET")] = () => ApiResponseModelIntrospector.FromModel(new HttpBinResponse
        {
            Args = new Dictionary<string, string> { { "foo", "bar" } },
            Headers = new Dictionary<string, string>
            {
                { "Accept", "application/json" },
                { "Host", "httpbin.org" },
                { "User-Agent", "StreamCraft/1.0" }
            },
            Method = "GET",
            Origin = "127.0.0.1",
            Url = "https://httpbin.org/anything",
            Json = null
        }),

        [MetadataKey.From("bored", "/api/activity", "GET")] = () => ApiResponseModelIntrospector.FromModel(new BoredActivity
        {
            Activity = "Learn a programming language",
            Type = "education",
            Participants = 1,
            Price = 0.1,
            Link = string.Empty,
            Key = "5881028",
            Accessibility = 0.25
        }, success: false, error: "No such host is known"),

        [MetadataKey.From("randomuser", "/api", "GET")] = () => ApiResponseModelIntrospector.FromModel(new RandomUserResponse
        {
            Results =
            {
                new RandomUser
                {
                    Gender = "female",
                    Name = new RandomUserName { Title = "Ms", First = "Deborah", Last = "Steward" },
                    Location = new RandomUserLocation
                    {
                        Street = new RandomUserStreet { Number = 2614, Name = "Church Road" },
                        City = "Worcester",
                        State = "Nottinghamshire",
                        Country = "United Kingdom",
                        Postcode = "X1F 6GQ",
                        Coordinates = new RandomUserCoordinates { Latitude = "-12.4777", Longitude = "129.1915" },
                        Timezone = new RandomUserTimezone { Offset = "+9:00", Description = "Tokyo" }
                    },
                    Email = "deborah.steward@example.com",
                    Login = new RandomUserLogin { Uuid = "uuid", Username = "tinywolf968", Password = "catwoman" },
                    Dob = new RandomUserDate { Date = "1986-12-08T07:14:25.773Z", Age = 39 },
                    Registered = new RandomUserDate { Date = "2015-09-16T08:36:07.744Z", Age = 10 },
                    Phone = "016977 5115",
                    Cell = "07351 512510",
                    Id = new RandomUserId { Name = "NINO", Value = "XA 55 26 42 A" },
                    Picture = new RandomUserPicture
                    {
                        Large = "https://randomuser.me/api/portraits/women/34.jpg",
                        Medium = "https://randomuser.me/api/portraits/med/women/34.jpg",
                        Thumbnail = "https://randomuser.me/api/portraits/thumb/women/34.jpg"
                    },
                    Nat = "GB"
                }
            },
            Info = new RandomUserInfo { Seed = "seed", Results = 1, Page = 1, Version = "1.4" }
        }),

        [MetadataKey.From("numbers", "/random", "GET")] = () => ApiResponseModelIntrospector.FromModel(new TextValueResponse
        {
            Value = "42 is the answer to life."
        }, success: false, error: "Timeout"),

        [MetadataKey.From("numbers", "/random/math", "GET")] = () => ApiResponseModelIntrospector.FromModel(new TextValueResponse
        {
            Value = "12 is the number of months in a year."
        }, success: false, error: "Timeout"),

        [MetadataKey.From("advice", "/advice", "GET")] = () => ApiResponseModelIntrospector.FromModel(new AdviceSlipResponse
        {
            Slip = new AdviceSlip { Id = 195, Advice = "Exercise in the rain can really make you feel alive." }
        }, contentType: "text/html"),

        [MetadataKey.From("kanye-rest", "/", "GET")] = () => ApiResponseModelIntrospector.FromModel(new QuoteResponse
        {
            Quote = "There are 5 main pillars in a professional musicians business"
        }),

        [MetadataKey.From("quotable", "/quotes", "GET")] = () => ApiResponseModelIntrospector.FromModel(new QuotableResponse
        {
            Content = "Random quote",
            Author = "Unknown"
        }, success: false, error: "Host unreachable"),

        [MetadataKey.From("quotable", "/random", "GET")] = () => ApiResponseModelIntrospector.FromModel(new QuotableResponse
        {
            Content = "Random quote",
            Author = "Unknown"
        }, success: false, error: "Host unreachable"),

        [MetadataKey.From("xkcd", "/info.0.json", "GET")] = () => ApiResponseModelIntrospector.FromModel(new XkcdResponse
        {
            Month = "1",
            Num = 3201,
            Year = "2026",
            SafeTitle = "Proof Without Content",
            Alt = "There's also a proof without content...",
            Img = "https://imgs.xkcd.com/comics/proof_without_content.png",
            Title = "Proof Without Content",
            Day = "30"
        }),

        [MetadataKey.From("restcountries", "/v3.1/all", "GET")] = () => ApiResponseModelIntrospector.FromModel(new[]
        {
            new RestCountry
            {
                Name = new RestCountryName { Common = "Poland", Official = "Republic of Poland" },
                Cca2 = "PL",
                Cca3 = "POL",
                Capital = { "Warsaw" },
                Region = "Europe",
                Subregion = "Central Europe",
                Languages = new Dictionary<string, string> { { "pol", "Polish" } },
                Population = 37392000,
                Borders = { "BLR" },
                Flag = "🇵🇱",
                Maps = new RestCountryMaps
                {
                    GoogleMaps = "https://goo.gl/maps/gY9Xw4Sf4415P4949",
                    OpenStreetMaps = "https://www.openstreetmap.org/relation/49715"
                },
                Timezones = { "UTC+01:00" },
                Flags = new RestCountryFlagImages
                {
                    Png = "https://flagcdn.com/w320/pl.png",
                    Svg = "https://flagcdn.com/pl.svg",
                    Alt = "The flag of Poland is composed of two equal horizontal bands of white and red."
                },
                CoatOfArms = new RestCountryFlagImages
                {
                    Png = "https://mainfacts.com/media/images/coats_of_arms/pl.png",
                    Svg = "https://mainfacts.com/media/images/coats_of_arms/pl.svg",
                    Alt = "Coat of arms"
                }
            }
        }, success: false, statusCode: 400, error: "HTTP 400"),

        [MetadataKey.From("restcountries", "/v3.1/name/poland", "GET")] = () => ApiResponseModelIntrospector.FromModel(new[]
        {
            new RestCountry
            {
                Name = new RestCountryName { Common = "Poland", Official = "Republic of Poland" },
                Cca2 = "PL",
                Cca3 = "POL",
                Capital = { "Warsaw" },
                Region = "Europe",
                Subregion = "Central Europe",
                Languages = new Dictionary<string, string> { { "pol", "Polish" } },
                Population = 37392000,
                Borders = { "BLR" },
                Flag = "🇵🇱",
                Maps = new RestCountryMaps
                {
                    GoogleMaps = "https://goo.gl/maps/gY9Xw4Sf4415P4949",
                    OpenStreetMaps = "https://www.openstreetmap.org/relation/49715"
                },
                Timezones = { "UTC+01:00" },
                Flags = new RestCountryFlagImages
                {
                    Png = "https://flagcdn.com/w320/pl.png",
                    Svg = "https://flagcdn.com/pl.svg",
                    Alt = "The flag of Poland"
                }
            }
        }),

        [MetadataKey.From("agify", "/?name=michael", "GET")] = () => ApiResponseModelIntrospector.FromModel(new AgifyResponse
        {
            Count = 298219,
            Name = "michael",
            Age = 65
        }),

        [MetadataKey.From("genderize", "/?name=alex", "GET")] = () => ApiResponseModelIntrospector.FromModel(new GenderizeResponse
        {
            Count = 1665200,
            Name = "alex",
            Gender = "male",
            Probability = 0.95
        }),

        [MetadataKey.From("nationalize", "/?name=lucas", "GET")] = () => ApiResponseModelIntrospector.FromModel(new NationalizeResponse
        {
            Count = 149372,
            Name = "lucas",
            Country =
            {
                new NationalizeCountry { CountryId = "US", Probability = 0.07037743282798974 }
            }
        }),

        [MetadataKey.From("open-meteo", "/v1/forecast", "GET")] = () => ApiResponseModelIntrospector.FromModel(new OpenMeteoForecast
        {
            Latitude = 52.52,
            Longitude = 13.41,
            Timezone = "Europe/Berlin",
            GenerationTimeMs = 0.123,
            Elevation = 34
        }),

        [MetadataKey.From("open-iss", "/iss-now.json", "GET")] = () => ApiResponseModelIntrospector.FromModel(new IssNowResponse
        {
            Timestamp = 1769884592,
            Message = "success",
            IssPosition = new IssPosition { Longitude = "123.1346", Latitude = "-51.3091" }
        }),

        [MetadataKey.From("open-iss", "/astros.json", "GET")] = () => ApiResponseModelIntrospector.FromModel(new PeopleInSpaceResponse
        {
            People = { new PersonInSpace { Craft = "ISS", Name = "Oleg Kononenko" } },
            Number = 12,
            Message = "success"
        }),

        [MetadataKey.From("spacex", "/v5/launches", "GET")] = () => ApiResponseModelIntrospector.FromModel(new[]
        {
            new SpaceXLaunch
            {
                Id = "5eb87cd9ffd86e000604b32a",
                Name = "FalconSat",
                DateUtc = "2006-03-24T22:30:00.000Z",
                Success = false,
                Details = "Engine failure at 33 seconds and loss of vehicle",
                Links = new SpaceXLinks
                {
                    Patch = new SpaceXPatch
                    {
                        Small = "https://images2.imgbox.com/94/f2/NN6Ph45r_o.png",
                        Large = "https://images2.imgbox.com/5b/02/QcxHUb5V_o.png"
                    },
                    Webcast = "https://www.youtube.com/watch?v=0a_00nJ_Y88",
                    YoutubeId = "0a_00nJ_Y88",
                    Article = "https://www.space.com/2196-spacex-inaugural-falcon-1-rocket-lost-launch.html"
                }
            }
        }),

        [MetadataKey.From("spacex", "/v5/launches/latest", "GET")] = () => ApiResponseModelIntrospector.FromModel(new SpaceXLaunch
        {
            Id = "62dd70d5202306255024d139",
            Name = "Crew-5",
            DateUtc = "2022-10-05T16:00:00.000Z",
            Success = true,
            Details = null,
            Links = new SpaceXLinks
            {
                Patch = new SpaceXPatch
                {
                    Small = "https://images2.imgbox.com/eb/d8/D1Yywp0w_o.png",
                    Large = "https://images2.imgbox.com/33/2e/k6VE4iYl_o.png"
                },
                Webcast = "https://youtu.be/5EwW8ZkArL4",
                YoutubeId = "5EwW8ZkArL4",
                Article = null
            }
        }),

        [MetadataKey.From("rick-and-morty", "/api/character", "GET")] = () => ApiResponseModelIntrospector.FromModel(new RickAndMortyListResponse
        {
            Info = new RickAndMortyInfo { Count = 826, Pages = 42, Next = "https://rickandmortyapi.com/api/character?page=2", Prev = null },
            Results =
            {
                new RickAndMortyItem
                {
                    Id = 1,
                    Name = "Rick Sanchez",
                    Status = "Alive",
                    Species = "Human",
                    Type = string.Empty,
                    Gender = "Male",
                    Image = "https://rickandmortyapi.com/api/character/avatar/1.jpeg",
                    Episode = { "https://rickandmortyapi.com/api/episode/1" },
                    Url = "https://rickandmortyapi.com/api/character/1",
                    Created = "2017-11-04T18:48:46.250Z"
                }
            }
        }),

        [MetadataKey.From("rick-and-morty", "/api/episode", "GET")] = () => ApiResponseModelIntrospector.FromModel(new RickAndMortyListResponse
        {
            Info = new RickAndMortyInfo { Count = 51, Pages = 3, Next = "https://rickandmortyapi.com/api/episode?page=2", Prev = null },
            Results =
            {
                new RickAndMortyItem
                {
                    Id = 1,
                    Name = "Pilot",
                    AirDate = "December 2, 2013",
                    Episode = { "https://rickandmortyapi.com/api/character/1" },
                    Url = "https://rickandmortyapi.com/api/episode/1",
                    Created = "2017-11-10T12:56:33.798Z"
                }
            }
        }),

        [MetadataKey.From("pokeapi", "/api/v2/pokemon", "GET")] = () => ApiResponseModelIntrospector.FromModel(new PokeApiListResponse
        {
            Count = 1350,
            Next = "https://pokeapi.co/api/v2/pokemon?offset=20&limit=20",
            Previous = null,
            Results = { new PokeApiNamedResource { Name = "bulbasaur", Url = "https://pokeapi.co/api/v2/pokemon/1/" } }
        }),

        [MetadataKey.From("pokeapi", "/api/v2/ability", "GET")] = () => ApiResponseModelIntrospector.FromModel(new PokeApiListResponse
        {
            Count = 367,
            Next = "https://pokeapi.co/api/v2/ability?offset=20&limit=20",
            Previous = null,
            Results = { new PokeApiNamedResource { Name = "stench", Url = "https://pokeapi.co/api/v2/ability/1/" } }
        }),

        [MetadataKey.From("opentrivia", "/api.php?amount=10", "GET")] = () => ApiResponseModelIntrospector.FromModel(new OpenTriviaResponse
        {
            ResponseCode = 0,
            Results =
            {
                new OpenTriviaQuestion
                {
                    Category = "History",
                    Type = "boolean",
                    Difficulty = "medium",
                    Question = "If you grab the bladed end of a longsword...",
                    CorrectAnswer = "True",
                    IncorrectAnswers = { "False" }
                }
            }
        }),

        [MetadataKey.From("spaceflight-news", "/v4/articles", "GET")] = () => ApiResponseModelIntrospector.FromModel(new SpaceflightArticleResponse
        {
            Count = 32194,
            Next = "https://api.spaceflightnewsapi.net/v4/articles/?limit=10&offset=10",
            Previous = null,
            Results =
            {
                new SpaceflightArticle
                {
                    Id = 35871,
                    Title = "SpaceX files plans for million-satellite orbital data center constellation",
                    Summary = "SpaceX is seeking Federal Communications Commission approval...",
                    ImageUrl = "https://i0.wp.com/spacenews.com/wp-content/uploads/2026/01/spacex-odc.jpeg?fit=1024%2C623&ssl=1",
                    Url = "https://spacenews.com/spacex-files-plans-for-million-satellite-orbital-data-center-constellation/",
                    NewsSite = "SpaceNews",
                    PublishedAt = "2026-01-31T13:03:04Z"
                }
            }
        }),

        [MetadataKey.From("jokes", "/random_joke", "GET")] = () => ApiResponseModelIntrospector.FromModel(new JokeResponse
        {
            Type = "general",
            Setup = "Why can't a bicycle stand on its own?",
            Punchline = "It's two-tired.",
            Id = 306
        }),

        [MetadataKey.From("cat-facts", "/fact", "GET")] = () => ApiResponseModelIntrospector.FromModel(new CatFactResponse
        {
            Fact = "Some cats have survived falls of over 65 feet...",
            Length = 249
        }),

        [MetadataKey.From("dog-ceo", "/api/breeds/image/random", "GET")] = () => ApiResponseModelIntrospector.FromModel(new DogCeoResponse
        {
            Message = "https://images.dog.ceo/breeds/basenji/n02110806_4435.jpg",
            Status = "success"
        }),

        [MetadataKey.From("randomfox", "/floof/", "GET")] = () => ApiResponseModelIntrospector.FromModel(new RandomFoxResponse
        {
            Image = "https://randomfox.ca/images/118.jpg",
            Link = "https://randomfox.ca/?i=118"
        }),

        [MetadataKey.From("randomdog", "/woof.json", "GET")] = () => ApiResponseModelIntrospector.FromModel(new RandomDogResponse
        {
            FileSizeBytes = 107720,
            Url = "https://random.dog/e00b0661-9c04-463c-8f88-612613dd0ea0.jpeg"
        }),

        [MetadataKey.From("randomduck", "/api/v2/random", "GET")] = () => ApiResponseModelIntrospector.FromModel(new RandomDuckResponse
        {
            Message = "Powered by random-d.uk",
            Url = "http://random-d.uk/api/365.JPG"
        }),

        [MetadataKey.From("coffee", "/random.json", "GET")] = () => ApiResponseModelIntrospector.FromModel(new CoffeeResponse
        {
            File = "https://coffee.alexflipnote.dev/mMS3Sjs8siE_coffee.jpg"
        }),

        [MetadataKey.From("openlibrary", "/search.json?q=harry+potter", "GET")] = () => ApiResponseModelIntrospector.FromModel(new OpenLibrarySearchResponse
        {
            NumFound = 3753,
            Start = 0,
            Docs =
            {
                new OpenLibraryDoc
                {
                    Title = "Harry Potter and the Philosopher's Stone",
                    AuthorName = { "J. K. Rowling" },
                    CoverId = 15155833,
                    Key = "/works/OL82563W",
                    Language = { "eng" }
                }
            }
        }),
        [MetadataKey.From("numbers", "/", "GET")] = () => Missing
    };

    public bool TryGet(string sourceId, string endpointPath, string method, out ApiResponseMetadata metadata)
    {
        if (_map.TryGetValue(MetadataKey.From(sourceId, endpointPath, method), out var factory))
        {
            metadata = factory();
            return true;
        }

        metadata = Missing;
        return false;
    }
}

internal static class ApiResponseModelIntrospector
{
    private const int MaxFields = 200;
    private const int MaxExampleLength = 160;

    public static ApiResponseMetadata FromModel(
        object model,
        int statusCode = 200,
        string contentType = "application/json",
        bool success = true,
        string? error = null)
    {
        var fields = new List<ApiFieldSpec>();
        var rootKind = Collect(model, string.Empty, fields);

        return new ApiResponseMetadata
        {
            Success = success,
            StatusCode = statusCode,
            ContentType = contentType,
            RootKind = rootKind,
            Fields = fields,
            Error = error,
            FetchedUtc = DateTime.UtcNow
        };
    }

    private static string Collect(object? value, string path, List<ApiFieldSpec> fields)
    {
        if (fields.Count >= MaxFields)
        {
            return "object";
        }

        if (value == null)
        {
            fields.Add(new ApiFieldSpec(Leaf(path), "null"));
            return path.Length == 0 ? "null" : "null";
        }

        switch (value)
        {
            case string s:
                fields.Add(new ApiFieldSpec(Leaf(path), "string", TrimExample(s)));
                return path.Length == 0 ? "string" : "string";
            case bool b:
                fields.Add(new ApiFieldSpec(Leaf(path), "boolean", b.ToString().ToLowerInvariant()));
                return path.Length == 0 ? "boolean" : "boolean";
        }

        if (IsNumber(value))
        {
            fields.Add(new ApiFieldSpec(Leaf(path), "number", TrimExample(Convert.ToString(value, CultureInfo.InvariantCulture))));
            return path.Length == 0 ? "number" : "number";
        }

        if (value is IDictionary dictionary)
        {
            if (!string.IsNullOrEmpty(path))
            {
                fields.Add(new ApiFieldSpec(path, "object", IsContainer: true));
            }

            foreach (DictionaryEntry entry in dictionary)
            {
                var key = entry.Key?.ToString() ?? string.Empty;
                var childPath = string.IsNullOrEmpty(path) ? key : $"{path}.{key}";
                Collect(entry.Value, childPath, fields);
                if (fields.Count >= MaxFields)
                {
                    break;
                }
            }

            return string.IsNullOrEmpty(path) ? "object" : "object";
        }

        if (value is IEnumerable enumerable && value is not string)
        {
            if (!string.IsNullOrEmpty(path))
            {
                fields.Add(new ApiFieldSpec(path, "array", IsContainer: true));
            }

            var enumerator = enumerable.GetEnumerator();
            if (enumerator.MoveNext())
            {
                var childPath = string.IsNullOrEmpty(path) ? "[0]" : $"{path}[0]";
                Collect(enumerator.Current, childPath, fields);
            }

            return string.IsNullOrEmpty(path) ? "array" : "array";
        }

        if (!string.IsNullOrEmpty(path))
        {
            fields.Add(new ApiFieldSpec(path, "object", IsContainer: true));
        }

        var type = value.GetType();
        var properties = type.GetProperties(BindingFlags.Instance | BindingFlags.Public);
        foreach (var property in properties)
        {
            if (property.GetMethod == null || property.GetMethod.GetParameters().Length > 0)
            {
                continue;
            }

            var name = GetJsonName(property);
            var childPath = string.IsNullOrEmpty(path) ? name : $"{path}.{name}";
            var childValue = property.GetValue(value);
            Collect(childValue, childPath, fields);

            if (fields.Count >= MaxFields)
            {
                break;
            }
        }

        return string.IsNullOrEmpty(path) ? "object" : "object";
    }

    private static bool IsNumber(object value)
    {
        var type = value.GetType();
        return type == typeof(byte) || type == typeof(sbyte) ||
               type == typeof(short) || type == typeof(ushort) ||
               type == typeof(int) || type == typeof(uint) ||
               type == typeof(long) || type == typeof(ulong) ||
               type == typeof(float) || type == typeof(double) ||
               type == typeof(decimal);
    }

    private static string Leaf(string path)
    {
        return string.IsNullOrEmpty(path) ? "value" : path;
    }

    private static string? TrimExample(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return value;
        }

        var cleaned = value.Replace("\r", " ").Replace("\n", " ").Trim();
        if (cleaned.Length <= MaxExampleLength)
        {
            return cleaned;
        }

        return cleaned[..MaxExampleLength] + "...";
    }

    private static string GetJsonName(PropertyInfo property)
    {
        var attr = property.GetCustomAttribute<JsonPropertyNameAttribute>();
        if (!string.IsNullOrWhiteSpace(attr?.Name))
        {
            return attr.Name;
        }

        var name = property.Name;
        if (string.IsNullOrEmpty(name))
        {
            return string.Empty;
        }

        return char.ToLowerInvariant(name[0]) + name.Substring(1);
    }
}

