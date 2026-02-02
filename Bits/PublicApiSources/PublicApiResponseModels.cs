using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace StreamCraft.Bits.PublicApiSources.Models;

public sealed record JsonPlaceholderPost
{
    [JsonPropertyName("userId")] public int UserId { get; init; }
    [JsonPropertyName("id")] public int Id { get; init; }
    [JsonPropertyName("title")] public string Title { get; init; } = string.Empty;
    [JsonPropertyName("body")] public string Body { get; init; } = string.Empty;
}

public sealed record JsonPlaceholderUser
{
    [JsonPropertyName("id")] public int Id { get; init; }
    [JsonPropertyName("name")] public string Name { get; init; } = string.Empty;
    [JsonPropertyName("username")] public string Username { get; init; } = string.Empty;
    [JsonPropertyName("email")] public string Email { get; init; } = string.Empty;
    [JsonPropertyName("address")] public JsonPlaceholderAddress Address { get; init; } = new();
    [JsonPropertyName("phone")] public string Phone { get; init; } = string.Empty;
    [JsonPropertyName("website")] public string Website { get; init; } = string.Empty;
    [JsonPropertyName("company")] public JsonPlaceholderCompany Company { get; init; } = new();
}

public sealed record JsonPlaceholderAddress
{
    [JsonPropertyName("street")] public string Street { get; init; } = string.Empty;
    [JsonPropertyName("suite")] public string Suite { get; init; } = string.Empty;
    [JsonPropertyName("city")] public string City { get; init; } = string.Empty;
    [JsonPropertyName("zipcode")] public string Zipcode { get; init; } = string.Empty;
    [JsonPropertyName("geo")] public JsonPlaceholderGeo Geo { get; init; } = new();
}

public sealed record JsonPlaceholderGeo
{
    [JsonPropertyName("lat")] public string Lat { get; init; } = string.Empty;
    [JsonPropertyName("lng")] public string Lng { get; init; } = string.Empty;
}

public sealed record JsonPlaceholderCompany
{
    [JsonPropertyName("name")] public string Name { get; init; } = string.Empty;
    [JsonPropertyName("catchPhrase")] public string CatchPhrase { get; init; } = string.Empty;
    [JsonPropertyName("bs")] public string Bs { get; init; } = string.Empty;
}

public sealed record ReqResUserResponse
{
    [JsonPropertyName("page")] public int Page { get; init; }
    [JsonPropertyName("per_page")] public int PerPage { get; init; }
    [JsonPropertyName("total")] public int Total { get; init; }
    [JsonPropertyName("total_pages")] public int TotalPages { get; init; }
    [JsonPropertyName("data")] public List<ReqResUser> Data { get; init; } = new();
}

public sealed record ReqResUser
{
    [JsonPropertyName("id")] public int Id { get; init; }
    [JsonPropertyName("email")] public string Email { get; init; } = string.Empty;
    [JsonPropertyName("first_name")] public string FirstName { get; init; } = string.Empty;
    [JsonPropertyName("last_name")] public string LastName { get; init; } = string.Empty;
    [JsonPropertyName("avatar")] public string Avatar { get; init; } = string.Empty;
}

public sealed record HttpBinResponse
{
    [JsonPropertyName("args")] public Dictionary<string, string> Args { get; init; } = new();
    [JsonPropertyName("headers")] public Dictionary<string, string> Headers { get; init; } = new();
    [JsonPropertyName("origin")] public string Origin { get; init; } = string.Empty;
    [JsonPropertyName("url")] public string Url { get; init; } = string.Empty;
    [JsonPropertyName("method")] public string? Method { get; init; }
    [JsonPropertyName("json")] public object? Json { get; init; }
}

public sealed record BoredActivity
{
    [JsonPropertyName("activity")] public string Activity { get; init; } = string.Empty;
    [JsonPropertyName("type")] public string Type { get; init; } = string.Empty;
    [JsonPropertyName("participants")] public int Participants { get; init; }
    [JsonPropertyName("price")] public double Price { get; init; }
    [JsonPropertyName("link")] public string Link { get; init; } = string.Empty;
    [JsonPropertyName("key")] public string Key { get; init; } = string.Empty;
    [JsonPropertyName("accessibility")] public double Accessibility { get; init; }
}

public sealed record RandomUserResponse
{
    [JsonPropertyName("results")] public List<RandomUser> Results { get; init; } = new();
    [JsonPropertyName("info")] public RandomUserInfo Info { get; init; } = new();
}

public sealed record RandomUser
{
    [JsonPropertyName("gender")] public string Gender { get; init; } = string.Empty;
    [JsonPropertyName("name")] public RandomUserName Name { get; init; } = new();
    [JsonPropertyName("location")] public RandomUserLocation Location { get; init; } = new();
    [JsonPropertyName("email")] public string Email { get; init; } = string.Empty;
    [JsonPropertyName("login")] public RandomUserLogin Login { get; init; } = new();
    [JsonPropertyName("dob")] public RandomUserDate Dob { get; init; } = new();
    [JsonPropertyName("registered")] public RandomUserDate Registered { get; init; } = new();
    [JsonPropertyName("phone")] public string Phone { get; init; } = string.Empty;
    [JsonPropertyName("cell")] public string Cell { get; init; } = string.Empty;
    [JsonPropertyName("id")] public RandomUserId Id { get; init; } = new();
    [JsonPropertyName("picture")] public RandomUserPicture Picture { get; init; } = new();
    [JsonPropertyName("nat")] public string Nat { get; init; } = string.Empty;
}

public sealed record RandomUserName
{
    [JsonPropertyName("title")] public string Title { get; init; } = string.Empty;
    [JsonPropertyName("first")] public string First { get; init; } = string.Empty;
    [JsonPropertyName("last")] public string Last { get; init; } = string.Empty;
}

public sealed record RandomUserLocation
{
    [JsonPropertyName("street")] public RandomUserStreet Street { get; init; } = new();
    [JsonPropertyName("city")] public string City { get; init; } = string.Empty;
    [JsonPropertyName("state")] public string State { get; init; } = string.Empty;
    [JsonPropertyName("country")] public string Country { get; init; } = string.Empty;
    [JsonPropertyName("postcode")] public string Postcode { get; init; } = string.Empty;
    [JsonPropertyName("coordinates")] public RandomUserCoordinates Coordinates { get; init; } = new();
    [JsonPropertyName("timezone")] public RandomUserTimezone Timezone { get; init; } = new();
}

public sealed record RandomUserStreet
{
    [JsonPropertyName("number")] public int Number { get; init; }
    [JsonPropertyName("name")] public string Name { get; init; } = string.Empty;
}

public sealed record RandomUserCoordinates
{
    [JsonPropertyName("latitude")] public string Latitude { get; init; } = string.Empty;
    [JsonPropertyName("longitude")] public string Longitude { get; init; } = string.Empty;
}

public sealed record RandomUserTimezone
{
    [JsonPropertyName("offset")] public string Offset { get; init; } = string.Empty;
    [JsonPropertyName("description")] public string Description { get; init; } = string.Empty;
}

public sealed record RandomUserLogin
{
    [JsonPropertyName("uuid")] public string Uuid { get; init; } = string.Empty;
    [JsonPropertyName("username")] public string Username { get; init; } = string.Empty;
    [JsonPropertyName("password")] public string Password { get; init; } = string.Empty;
}

public sealed record RandomUserDate
{
    [JsonPropertyName("date")] public string Date { get; init; } = string.Empty;
    [JsonPropertyName("age")] public int Age { get; init; }
}

public sealed record RandomUserId
{
    [JsonPropertyName("name")] public string Name { get; init; } = string.Empty;
    [JsonPropertyName("value")] public string Value { get; init; } = string.Empty;
}

public sealed record RandomUserPicture
{
    [JsonPropertyName("large")] public string Large { get; init; } = string.Empty;
    [JsonPropertyName("medium")] public string Medium { get; init; } = string.Empty;
    [JsonPropertyName("thumbnail")] public string Thumbnail { get; init; } = string.Empty;
}

public sealed record RandomUserInfo
{
    [JsonPropertyName("seed")] public string Seed { get; init; } = string.Empty;
    [JsonPropertyName("results")] public int Results { get; init; }
    [JsonPropertyName("page")] public int Page { get; init; }
    [JsonPropertyName("version")] public string Version { get; init; } = string.Empty;
}

public sealed record TextValueResponse
{
    [JsonPropertyName("value")] public string Value { get; init; } = string.Empty;
}

public sealed record AdviceSlipResponse
{
    [JsonPropertyName("slip")] public AdviceSlip Slip { get; init; } = new();
}

public sealed record AdviceSlip
{
    [JsonPropertyName("id")] public int Id { get; init; }
    [JsonPropertyName("advice")] public string Advice { get; init; } = string.Empty;
}

public sealed record QuoteResponse
{
    [JsonPropertyName("quote")] public string Quote { get; init; } = string.Empty;
}

public sealed record QuotableResponse
{
    [JsonPropertyName("content")] public string Content { get; init; } = string.Empty;
    [JsonPropertyName("author")] public string Author { get; init; } = string.Empty;
}

public sealed record XkcdResponse
{
    [JsonPropertyName("month")] public string Month { get; init; } = string.Empty;
    [JsonPropertyName("num")] public int Num { get; init; }
    [JsonPropertyName("link")] public string Link { get; init; } = string.Empty;
    [JsonPropertyName("year")] public string Year { get; init; } = string.Empty;
    [JsonPropertyName("news")] public string News { get; init; } = string.Empty;
    [JsonPropertyName("safe_title")] public string SafeTitle { get; init; } = string.Empty;
    [JsonPropertyName("transcript")] public string Transcript { get; init; } = string.Empty;
    [JsonPropertyName("alt")] public string Alt { get; init; } = string.Empty;
    [JsonPropertyName("img")] public string Img { get; init; } = string.Empty;
    [JsonPropertyName("title")] public string Title { get; init; } = string.Empty;
    [JsonPropertyName("day")] public string Day { get; init; } = string.Empty;
}

public sealed record RestCountry
{
    [JsonPropertyName("name")] public RestCountryName Name { get; init; } = new();
    [JsonPropertyName("cca2")] public string Cca2 { get; init; } = string.Empty;
    [JsonPropertyName("cca3")] public string Cca3 { get; init; } = string.Empty;
    [JsonPropertyName("capital")] public List<string> Capital { get; init; } = new();
    [JsonPropertyName("region")] public string Region { get; init; } = string.Empty;
    [JsonPropertyName("subregion")] public string Subregion { get; init; } = string.Empty;
    [JsonPropertyName("languages")] public Dictionary<string, string> Languages { get; init; } = new();
    [JsonPropertyName("population")] public long Population { get; init; }
    [JsonPropertyName("borders")] public List<string> Borders { get; init; } = new();
    [JsonPropertyName("flag")] public string Flag { get; init; } = string.Empty;
    [JsonPropertyName("maps")] public RestCountryMaps Maps { get; init; } = new();
    [JsonPropertyName("timezones")] public List<string> Timezones { get; init; } = new();
    [JsonPropertyName("flags")] public RestCountryFlagImages Flags { get; init; } = new();
    [JsonPropertyName("coatOfArms")] public RestCountryFlagImages CoatOfArms { get; init; } = new();
}

public sealed record RestCountryName
{
    [JsonPropertyName("common")] public string Common { get; init; } = string.Empty;
    [JsonPropertyName("official")] public string Official { get; init; } = string.Empty;
}

public sealed record RestCountryMaps
{
    [JsonPropertyName("googleMaps")] public string GoogleMaps { get; init; } = string.Empty;
    [JsonPropertyName("openStreetMaps")] public string OpenStreetMaps { get; init; } = string.Empty;
}

public sealed record RestCountryFlagImages
{
    [JsonPropertyName("png")] public string Png { get; init; } = string.Empty;
    [JsonPropertyName("svg")] public string Svg { get; init; } = string.Empty;
    [JsonPropertyName("alt")] public string Alt { get; init; } = string.Empty;
}

public sealed record AgifyResponse
{
    [JsonPropertyName("count")] public int Count { get; init; }
    [JsonPropertyName("name")] public string Name { get; init; } = string.Empty;
    [JsonPropertyName("age")] public int? Age { get; init; }
}

public sealed record GenderizeResponse
{
    [JsonPropertyName("count")] public int Count { get; init; }
    [JsonPropertyName("name")] public string Name { get; init; } = string.Empty;
    [JsonPropertyName("gender")] public string? Gender { get; init; }
    [JsonPropertyName("probability")] public double Probability { get; init; }
}

public sealed record NationalizeResponse
{
    [JsonPropertyName("count")] public int Count { get; init; }
    [JsonPropertyName("name")] public string Name { get; init; } = string.Empty;
    [JsonPropertyName("country")] public List<NationalizeCountry> Country { get; init; } = new();
}

public sealed record NationalizeCountry
{
    [JsonPropertyName("country_id")] public string CountryId { get; init; } = string.Empty;
    [JsonPropertyName("probability")] public double Probability { get; init; }
}

public sealed record OpenMeteoForecast
{
    [JsonPropertyName("latitude")] public double Latitude { get; init; }
    [JsonPropertyName("longitude")] public double Longitude { get; init; }
    [JsonPropertyName("timezone")] public string Timezone { get; init; } = string.Empty;
    [JsonPropertyName("generationtime_ms")] public double GenerationTimeMs { get; init; }
    [JsonPropertyName("elevation")] public double Elevation { get; init; }
}

public sealed record IssNowResponse
{
    [JsonPropertyName("timestamp")] public long Timestamp { get; init; }
    [JsonPropertyName("message")] public string Message { get; init; } = string.Empty;
    [JsonPropertyName("iss_position")] public IssPosition IssPosition { get; init; } = new();
}

public sealed record IssPosition
{
    [JsonPropertyName("longitude")] public string Longitude { get; init; } = string.Empty;
    [JsonPropertyName("latitude")] public string Latitude { get; init; } = string.Empty;
}

public sealed record PeopleInSpaceResponse
{
    [JsonPropertyName("people")] public List<PersonInSpace> People { get; init; } = new();
    [JsonPropertyName("number")] public int Number { get; init; }
    [JsonPropertyName("message")] public string Message { get; init; } = string.Empty;
}

public sealed record PersonInSpace
{
    [JsonPropertyName("craft")] public string Craft { get; init; } = string.Empty;
    [JsonPropertyName("name")] public string Name { get; init; } = string.Empty;
}

public sealed record SpaceXLaunch
{
    [JsonPropertyName("id")] public string Id { get; init; } = string.Empty;
    [JsonPropertyName("name")] public string Name { get; init; } = string.Empty;
    [JsonPropertyName("date_utc")] public string DateUtc { get; init; } = string.Empty;
    [JsonPropertyName("success")] public bool? Success { get; init; }
    [JsonPropertyName("details")] public string? Details { get; init; }
    [JsonPropertyName("links")] public SpaceXLinks Links { get; init; } = new();
}

public sealed record SpaceXLinks
{
    [JsonPropertyName("patch")] public SpaceXPatch Patch { get; init; } = new();
    [JsonPropertyName("webcast")] public string? Webcast { get; init; }
    [JsonPropertyName("youtube_id")] public string? YoutubeId { get; init; }
    [JsonPropertyName("article")] public string? Article { get; init; }
}

public sealed record SpaceXPatch
{
    [JsonPropertyName("small")] public string? Small { get; init; }
    [JsonPropertyName("large")] public string? Large { get; init; }
}

public sealed record SpaceXLaunchesResponse
{
    [JsonPropertyName("items")] public List<SpaceXLaunch> Items { get; init; } = new();
}

public sealed record RickAndMortyListResponse
{
    [JsonPropertyName("info")] public RickAndMortyInfo Info { get; init; } = new();
    [JsonPropertyName("results")] public List<RickAndMortyItem> Results { get; init; } = new();
}

public sealed record RickAndMortyInfo
{
    [JsonPropertyName("count")] public int Count { get; init; }
    [JsonPropertyName("pages")] public int Pages { get; init; }
    [JsonPropertyName("next")] public string? Next { get; init; }
    [JsonPropertyName("prev")] public string? Prev { get; init; }
}

public sealed record RickAndMortyItem
{
    [JsonPropertyName("id")] public int Id { get; init; }
    [JsonPropertyName("name")] public string Name { get; init; } = string.Empty;
    [JsonPropertyName("status")] public string? Status { get; init; }
    [JsonPropertyName("species")] public string? Species { get; init; }
    [JsonPropertyName("type")] public string? Type { get; init; }
    [JsonPropertyName("gender")] public string? Gender { get; init; }
    [JsonPropertyName("image")] public string? Image { get; init; }
    [JsonPropertyName("episode")] public List<string> Episode { get; init; } = new();
    [JsonPropertyName("url")] public string? Url { get; init; }
    [JsonPropertyName("created")] public string? Created { get; init; }
    [JsonPropertyName("air_date")] public string? AirDate { get; init; }
}

public sealed record PokeApiListResponse
{
    [JsonPropertyName("count")] public int Count { get; init; }
    [JsonPropertyName("next")] public string? Next { get; init; }
    [JsonPropertyName("previous")] public string? Previous { get; init; }
    [JsonPropertyName("results")] public List<PokeApiNamedResource> Results { get; init; } = new();
}

public sealed record PokeApiNamedResource
{
    [JsonPropertyName("name")] public string Name { get; init; } = string.Empty;
    [JsonPropertyName("url")] public string Url { get; init; } = string.Empty;
}

public sealed record OpenTriviaResponse
{
    [JsonPropertyName("response_code")] public int ResponseCode { get; init; }
    [JsonPropertyName("results")] public List<OpenTriviaQuestion> Results { get; init; } = new();
}

public sealed record OpenTriviaQuestion
{
    [JsonPropertyName("category")] public string Category { get; init; } = string.Empty;
    [JsonPropertyName("type")] public string Type { get; init; } = string.Empty;
    [JsonPropertyName("difficulty")] public string Difficulty { get; init; } = string.Empty;
    [JsonPropertyName("question")] public string Question { get; init; } = string.Empty;
    [JsonPropertyName("correct_answer")] public string CorrectAnswer { get; init; } = string.Empty;
    [JsonPropertyName("incorrect_answers")] public List<string> IncorrectAnswers { get; init; } = new();
}

public sealed record SpaceflightArticleResponse
{
    [JsonPropertyName("count")] public int Count { get; init; }
    [JsonPropertyName("next")] public string? Next { get; init; }
    [JsonPropertyName("previous")] public string? Previous { get; init; }
    [JsonPropertyName("results")] public List<SpaceflightArticle> Results { get; init; } = new();
}

public sealed record SpaceflightArticle
{
    [JsonPropertyName("id")] public int Id { get; init; }
    [JsonPropertyName("title")] public string Title { get; init; } = string.Empty;
    [JsonPropertyName("summary")] public string Summary { get; init; } = string.Empty;
    [JsonPropertyName("image_url")] public string ImageUrl { get; init; } = string.Empty;
    [JsonPropertyName("url")] public string Url { get; init; } = string.Empty;
    [JsonPropertyName("news_site")] public string NewsSite { get; init; } = string.Empty;
    [JsonPropertyName("published_at")] public string PublishedAt { get; init; } = string.Empty;
}

public sealed record JokeResponse
{
    [JsonPropertyName("type")] public string Type { get; init; } = string.Empty;
    [JsonPropertyName("setup")] public string Setup { get; init; } = string.Empty;
    [JsonPropertyName("punchline")] public string Punchline { get; init; } = string.Empty;
    [JsonPropertyName("id")] public int Id { get; init; }
}

public sealed record CatFactResponse
{
    [JsonPropertyName("fact")] public string Fact { get; init; } = string.Empty;
    [JsonPropertyName("length")] public int Length { get; init; }
}

public sealed record DogCeoResponse
{
    [JsonPropertyName("message")] public string Message { get; init; } = string.Empty;
    [JsonPropertyName("status")] public string Status { get; init; } = string.Empty;
}

public sealed record RandomFoxResponse
{
    [JsonPropertyName("image")] public string Image { get; init; } = string.Empty;
    [JsonPropertyName("link")] public string Link { get; init; } = string.Empty;
}

public sealed record RandomDogResponse
{
    [JsonPropertyName("fileSizeBytes")] public long FileSizeBytes { get; init; }
    [JsonPropertyName("url")] public string Url { get; init; } = string.Empty;
}

public sealed record RandomDuckResponse
{
    [JsonPropertyName("message")] public string Message { get; init; } = string.Empty;
    [JsonPropertyName("url")] public string Url { get; init; } = string.Empty;
}

public sealed record CoffeeResponse
{
    [JsonPropertyName("file")] public string File { get; init; } = string.Empty;
}

public sealed record OpenLibrarySearchResponse
{
    [JsonPropertyName("numFound")] public int NumFound { get; init; }
    [JsonPropertyName("start")] public int Start { get; init; }
    [JsonPropertyName("docs")] public List<OpenLibraryDoc> Docs { get; init; } = new();
}

public sealed record OpenLibraryDoc
{
    [JsonPropertyName("title")] public string Title { get; init; } = string.Empty;
    [JsonPropertyName("author_name")] public List<string> AuthorName { get; init; } = new();
    [JsonPropertyName("cover_i")] public int? CoverId { get; init; }
    [JsonPropertyName("key")] public string Key { get; init; } = string.Empty;
    [JsonPropertyName("language")] public List<string> Language { get; init; } = new();
}

public sealed record HttpErrorResponse
{
    [JsonPropertyName("error")] public string Error { get; init; } = string.Empty;
}
