using Core.DataSources;

namespace StreamCraft.Bits.PublicApiSources;

internal static class PublicApiStaticMetadata
{
    private static readonly Dictionary<(string Source, string Path, string Method), ApiResponseMetadata> Map
        = new(new MetadataKeyComparer())
        {
            { Key("xkcd", "/info.0.json", "GET"), Meta(true, 200, "application/json", "object", new[]
            {
                Field("month", "string", "1"),
                Field("num", "number", "3201"),
                Field("link", "string", string.Empty),
                Field("year", "string", "2026"),
                Field("news", "string", string.Empty),
                Field("safe_title", "string", "Proof Without Content"),
                Field("transcript", "string", string.Empty),
                Field("alt", "string", "There's also a proof without content of a conjecture without content, but it's left as an exercise for the reader."),
                Field("img", "string", "https://imgs.xkcd.com/comics/proof_without_content.png"),
                Field("title", "string", "Proof Without Content"),
                Field("day", "string", "30")
            }) },

            { Key("reqres", "/api/users", "GET"), Meta(false, 403, "text/html", null, Array.Empty<ApiFieldSpec>(), "HTTP 403") },
            { Key("reqres", "/api/users/2", "GET"), Meta(false, 403, "text/html", null, Array.Empty<ApiFieldSpec>(), "HTTP 403") },

            { Key("numbers", "/random", "GET"), Meta(false, null, null, null, Array.Empty<ApiFieldSpec>(), "The request was canceled due to the configured HttpClient.Timeout of 6 seconds elapsing.") },
            { Key("numbers", "/random/math", "GET"), Meta(false, null, null, null, Array.Empty<ApiFieldSpec>(), "The request was canceled due to the configured HttpClient.Timeout of 6 seconds elapsing.") },

            { Key("kanye-rest", "/", "GET"), Meta(true, 200, "application/json", "object", new[] { Field("quote", "string", "There are 5 main pillars in a professional musicians business - Recording, Publishing, Touring, Merchandise & Name and likeness") }) },

            { Key("quotable", "/quotes", "GET"), Meta(false, null, null, null, Array.Empty<ApiFieldSpec>(), "No such host is known. (api.quotable.io:443)") },
            { Key("quotable", "/random", "GET"), Meta(false, null, null, null, Array.Empty<ApiFieldSpec>(), "No such host is known. (api.quotable.io:443)") },

            { Key("agify", "/?name=michael", "GET"), Meta(true, 200, "application/json", "object", new[]
            {
                Field("count", "number", "298219"),
                Field("name", "string", "michael"),
                Field("age", "number", "65")
            }) },

            { Key("nationalize", "/?name=lucas", "GET"), Meta(true, 200, "application/json", "object", new[]
            {
                Container("country", "array"),
                Container("country[0]", "object"),
                Field("country[0].country_id", "string", "US"),
                Field("country[0].probability", "number", "0.07037743282798974"),
                Field("count", "number", "149372"),
                Field("name", "string", "lucas")
            }) },

            { Key("open-iss", "/iss-now.json", "GET"), Meta(true, 200, "application/json", "object", new[]
            {
                Field("timestamp", "number", "1769884592"),
                Field("message", "string", "success"),
                Container("iss_position", "object"),
                Field("iss_position.longitude", "string", "123.1346"),
                Field("iss_position.latitude", "string", "-51.3091")
            }) },
            { Key("open-iss", "/astros.json", "GET"), Meta(true, 200, "application/json", "object", new[]
            {
                Container("people", "array"),
                Container("people[0]", "object"),
                Field("people[0].craft", "string", "ISS"),
                Field("people[0].name", "string", "Oleg Kononenko"),
                Field("number", "number", "12"),
                Field("message", "string", "success")
            }) },

            { Key("advice", "/advice", "GET"), Meta(true, 200, "text/html", "object", new[]
            {
                Container("slip", "object"),
                Field("slip.id", "number", "195"),
                Field("slip.advice", "string", "Exercise in the rain can really make you feel alive.")
            }) },

            { Key("rick-and-morty", "/api/episode", "GET"), Meta(true, 200, "application/json", "object", new[]
            {
                Container("info", "object"),
                Field("info.count", "number", "51"),
                Field("info.pages", "number", "3"),
                Field("info.next", "string", "https://rickandmortyapi.com/api/episode?page=2"),
                Field("info.prev", "null"),
                Container("results", "array"),
                Container("results[0]", "object"),
                Field("results[0].id", "number", "1"),
                Field("results[0].name", "string", "Pilot"),
                Field("results[0].air_date", "string", "December 2, 2013"),
                Field("results[0].episode", "string", "S01E01"),
                Container("results[0].characters", "array"),
                Field("results[0].characters[0]", "string", "https://rickandmortyapi.com/api/character/1"),
                Field("results[0].url", "string", "https://rickandmortyapi.com/api/episode/1"),
                Field("results[0].created", "string", "2017-11-10T12:56:33.798Z")
            }) },

            { Key("jokes", "/random_joke", "GET"), Meta(true, 200, "application/json", "object", new[]
            {
                Field("type", "string", "general"),
                Field("setup", "string", "Why can't a bicycle stand on its own?"),
                Field("punchline", "string", "It's two-tired."),
                Field("id", "number", "306")
            }) },

            { Key("coffee", "/random.json", "GET"), Meta(true, 200, "application/json", "object", new[] { Field("file", "string", "https://coffee.alexflipnote.dev/mMS3Sjs8siE_coffee.jpg") }) },

            { Key("genderize", "/?name=alex", "GET"), Meta(true, 200, "application/json", "object", new[]
            {
                Field("count", "number", "1665200"),
                Field("name", "string", "alex"),
                Field("gender", "string", "male"),
                Field("probability", "number", "0.95")
            }) },

            { Key("spaceflight-news", "/v4/articles", "GET"), Meta(true, 200, "application/json", "object", new[]
            {
                Field("count", "number", "32194"),
                Field("next", "string", "https://api.spaceflightnewsapi.net/v4/articles/?limit=10&offset=10"),
                Field("previous", "null"),
                Container("results", "array"),
                Container("results[0]", "object"),
                Field("results[0].id", "number", "35871"),
                Field("results[0].title", "string", "SpaceX files plans for million-satellite orbital data center constellation"),
                Container("results[0].authors", "array"),
                Container("results[0].authors[0]", "object"),
                Field("results[0].authors[0].name", "string", "Jeff Foust"),
                Container("results[0].authors[0].socials", "object"),
                Field("results[0].authors[0].socials.x", "string", "https://x.com/jeff_foust"),
                Field("results[0].authors[0].socials.youtube", "string", string.Empty),
                Field("results[0].authors[0].socials.instagram", "string", string.Empty),
                Field("results[0].authors[0].socials.linkedin", "string", "https://www.linkedin.com/in/jefffoust"),
                Field("results[0].authors[0].socials.mastodon", "string", "https://mastodon.social/@jfoust"),
                Field("results[0].authors[0].socials.bluesky", "string", "https://bsky.app/profile/jfoust.bsky.social"),
                Field("results[0].url", "string", "https://spacenews.com/spacex-files-plans-for-million-satellite-orbital-data-center-constellation/"),
                Field("results[0].image_url", "string", "https://i0.wp.com/spacenews.com/wp-content/uploads/2026/01/spacex-odc.jpeg?fit=1024%2C623&ssl=1"),
                Field("results[0].news_site", "string", "SpaceNews"),
                Field("results[0].summary", "string", "SpaceX is seeking Federal Communications Commission approval for a satellite constellation of unprecedented scale intended to function as an orbital data center..."),
                Field("results[0].published_at", "string", "2026-01-31T13:03:04Z"),
                Field("results[0].updated_at", "string", "2026-01-31T13:10:27.468876Z"),
                Field("results[0].featured", "boolean", "false"),
                Container("results[0].launches", "array"),
                Container("results[0].events", "array")
            }) },

            { Key("restcountries", "/v3.1/all", "GET"), Meta(false, 400, "application/json", null, Array.Empty<ApiFieldSpec>(), "HTTP 400") },

            { Key("bored", "/api/activity", "GET"), Meta(false, null, null, null, Array.Empty<ApiFieldSpec>(), "The requested name is valid, but no data of the requested type was found. (www.boredapi.com:443)") },

            { Key("randomuser", "/api", "GET"), Meta(true, 200, "application/json", "object", new[]
            {
                Container("results", "array"),
                Container("results[0]", "object"),
                Field("results[0].gender", "string", "female"),
                Container("results[0].name", "object"),
                Field("results[0].name.title", "string", "Miss"),
                Field("results[0].name.first", "string", "Deborah"),
                Field("results[0].name.last", "string", "Steward"),
                Container("results[0].location", "object"),
                Container("results[0].location.street", "object"),
                Field("results[0].location.street.number", "number", "2614"),
                Field("results[0].location.street.name", "string", "Church Road"),
                Field("results[0].location.city", "string", "Worcester"),
                Field("results[0].location.state", "string", "Nottinghamshire"),
                Field("results[0].location.country", "string", "United Kingdom"),
                Field("results[0].location.postcode", "string", "X1F 6GQ"),
                Container("results[0].location.coordinates", "object"),
                Field("results[0].location.coordinates.latitude", "string", "-12.4777"),
                Field("results[0].location.coordinates.longitude", "string", "129.1915"),
                Container("results[0].location.timezone", "object"),
                Field("results[0].location.timezone.offset", "string", "+9:00"),
                Field("results[0].location.timezone.description", "string", "Tokyo, Seoul, Osaka, Sapporo, Yakutsk"),
                Field("results[0].email", "string", "deborah.steward@example.com"),
                Container("results[0].login", "object"),
                Field("results[0].login.uuid", "string", "4d4e42fb-9c71-4370-b93e-ffba578e7cec"),
                Field("results[0].login.username", "string", "tinywolf968"),
                Field("results[0].login.password", "string", "catwoman"),
                Field("results[0].login.salt", "string", "XBhpCa9J"),
                Field("results[0].login.md5", "string", "f4cea06c2cd69a98203f0f51f4901dd2"),
                Field("results[0].login.sha1", "string", "fe7f5e494d76f8bffbb818565ad45f7e3c51cb0c"),
                Field("results[0].login.sha256", "string", "8c95c33bb1c0d652f92f0510f08128e97a9c5d456b1a6332e86330c09c404820"),
                Container("results[0].dob", "object"),
                Field("results[0].dob.date", "string", "1986-12-08T07:14:25.773Z"),
                Field("results[0].dob.age", "number", "39"),
                Container("results[0].registered", "object"),
                Field("results[0].registered.date", "string", "2015-09-16T08:36:07.744Z"),
                Field("results[0].registered.age", "number", "10"),
                Field("results[0].phone", "string", "016977 5115"),
                Field("results[0].cell", "string", "07351 512510"),
                Container("results[0].id", "object"),
                Field("results[0].id.name", "string", "NINO"),
                Field("results[0].id.value", "string", "XA 55 26 42 A"),
                Container("results[0].picture", "object"),
                Field("results[0].picture.large", "string", "https://randomuser.me/api/portraits/women/34.jpg"),
                Field("results[0].picture.medium", "string", "https://randomuser.me/api/portraits/med/women/34.jpg"),
                Field("results[0].picture.thumbnail", "string", "https://randomuser.me/api/portraits/thumb/women/34.jpg"),
                Field("results[0].nat", "string", "GB"),
                Container("info", "object"),
                Field("info.seed", "string", "5547eb446b37e523"),
                Field("info.results", "number", "1"),
                Field("info.page", "number", "1"),
                Field("info.version", "string", "1.4")
            }) },

            { Key("restcountries", "/v3.1/name/poland", "GET"), Meta(true, 200, "application/json", "array", new[]
            {
                Container("[0]", "object"),
                Container("[0].name", "object"),
                Field("[0].name.common", "string", "Poland"),
                Field("[0].name.official", "string", "Republic of Poland"),
                Container("[0].name.nativeName", "object"),
                Container("[0].name.nativeName.pol", "object"),
                Field("[0].name.nativeName.pol.official", "string", "Rzeczpospolita Polska"),
                Field("[0].name.nativeName.pol.common", "string", "Polska"),
                Container("[0].tld", "array"),
                Field("[0].tld[0]", "string", ".pl"),
                Field("[0].cca2", "string", "PL"),
                Field("[0].ccn3", "string", "616"),
                Field("[0].cioc", "string", "POL"),
                Field("[0].independent", "boolean", "true"),
                Field("[0].status", "string", "officially-assigned"),
                Field("[0].unMember", "boolean", "true"),
                Container("[0].currencies", "object"),
                Container("[0].currencies.PLN", "object"),
                Field("[0].currencies.PLN.symbol", "string", "zł"),
                Field("[0].currencies.PLN.name", "string", "Polish złoty"),
                Container("[0].idd", "object"),
                Field("[0].idd.root", "string", "+4"),
                Container("[0].idd.suffixes", "array"),
                Field("[0].idd.suffixes[0]", "string", "8"),
                Container("[0].capital", "array"),
                Field("[0].capital[0]", "string", "Warsaw"),
                Container("[0].altSpellings", "array"),
                Field("[0].altSpellings[0]", "string", "PL"),
                Field("[0].region", "string", "Europe"),
                Field("[0].subregion", "string", "Central Europe"),
                Container("[0].languages", "object"),
                Field("[0].languages.pol", "string", "Polish"),
                Container("[0].latlng", "array"),
                Field("[0].latlng[0]", "number", "52.0"),
                Field("[0].landlocked", "boolean", "false"),
                Container("[0].borders", "array"),
                Field("[0].borders[0]", "string", "BLR"),
                Field("[0].area", "number", "312679.0"),
                Container("[0].demonyms", "object"),
                Container("[0].demonyms.eng", "object"),
                Field("[0].demonyms.eng.f", "string", "Polish"),
                Field("[0].demonyms.eng.m", "string", "Polish"),
                Container("[0].demonyms.fra", "object"),
                Field("[0].demonyms.fra.f", "string", "Polonaise"),
                Field("[0].demonyms.fra.m", "string", "Polonais"),
                Field("[0].cca3", "string", "POL"),
                Container("[0].translations", "object"),
                Container("[0].translations.ara", "object"),
                Field("[0].translations.ara.official", "string", "الجمهورية البولندية"),
                Field("[0].translations.ara.common", "string", "بولندا"),
                Container("[0].translations.bre", "object"),
                Field("[0].translations.bre.official", "string", "Republik Polonia"),
                Field("[0].translations.bre.common", "string", "Polonia"),
                Container("[0].translations.ces", "object"),
                Field("[0].translations.ces.official", "string", "Polská republika"),
                Field("[0].translations.ces.common", "string", "Polsko"),
                Container("[0].translations.cym", "object"),
                Field("[0].translations.cym.official", "string", "Republic of Poland"),
                Field("[0].translations.cym.common", "string", "Poland"),
                Container("[0].translations.deu", "object"),
                Field("[0].translations.deu.official", "string", "Republik Polen"),
                Field("[0].translations.deu.common", "string", "Polen"),
                Container("[0].translations.est", "object"),
                Field("[0].translations.est.official", "string", "Poola Vabariik"),
                Field("[0].translations.est.common", "string", "Poola"),
                Container("[0].translations.fin", "object"),
                Field("[0].translations.fin.official", "string", "Puolan tasavalta"),
                Field("[0].translations.fin.common", "string", "Puola"),
                Container("[0].translations.fra", "object"),
                Field("[0].translations.fra.official", "string", "République de Pologne"),
                Field("[0].translations.fra.common", "string", "Pologne"),
                Container("[0].translations.hrv", "object"),
                Field("[0].translations.hrv.official", "string", "Republika Poljska"),
                Field("[0].translations.hrv.common", "string", "Poljska"),
                Container("[0].translations.hun", "object"),
                Field("[0].translations.hun.official", "string", "Lengyel Köztársaság"),
                Field("[0].translations.hun.common", "string", "Lengyelország"),
                Container("[0].translations.ind", "object"),
                Field("[0].translations.ind.official", "string", "Republik Polandia"),
                Field("[0].translations.ind.common", "string", "Polandia"),
                Container("[0].translations.ita", "object"),
                Field("[0].translations.ita.official", "string", "Repubblica di Polonia"),
                Field("[0].translations.ita.common", "string", "Polonia"),
                Container("[0].translations.jpn", "object"),
                Field("[0].translations.jpn.official", "string", "ポーランド共和国"),
                Field("[0].translations.jpn.common", "string", "ポーランド"),
                Container("[0].translations.kor", "object"),
                Field("[0].translations.kor.official", "string", "폴란드 공화국"),
                Field("[0].translations.kor.common", "string", "폴란드"),
                Container("[0].translations.nld", "object"),
                Field("[0].translations.nld.official", "string", "Republiek Polen"),
                Field("[0].translations.nld.common", "string", "Polen"),
                Container("[0].translations.per", "object"),
                Field("[0].translations.per.official", "string", "جمهوری لهستان"),
                Field("[0].translations.per.common", "string", "لهستان"),
                Container("[0].translations.pol", "object"),
                Field("[0].translations.pol.official", "string", "Rzeczpospolita Polska"),
                Field("[0].translations.pol.common", "string", "Polska"),
                Container("[0].translations.por", "object"),
                Field("[0].translations.por.official", "string", "República da Polónia"),
                Field("[0].translations.por.common", "string", "Polónia"),
                Container("[0].translations.rus", "object"),
                Field("[0].translations.rus.official", "string", "Республика Польша"),
                Field("[0].translations.rus.common", "string", "Польша"),
                Container("[0].translations.slk", "object"),
                Field("[0].translations.slk.official", "string", "Poľská republika"),
                Field("[0].translations.slk.common", "string", "Poľsko"),
                Container("[0].translations.spa", "object"),
                Field("[0].translations.spa.official", "string", "República de Polonia"),
                Field("[0].translations.spa.common", "string", "Polonia"),
                Container("[0].translations.srp", "object"),
                Field("[0].translations.srp.official", "string", "Република Пољска"),
                Field("[0].translations.srp.common", "string", "Пољска"),
                Container("[0].translations.swe", "object"),
                Field("[0].translations.swe.official", "string", "Republiken Polen"),
                Field("[0].translations.swe.common", "string", "Polen"),
                Container("[0].translations.tur", "object"),
                Field("[0].translations.tur.official", "string", "Polonya Cumhuriyeti"),
                Field("[0].translations.tur.common", "string", "Polonya"),
                Container("[0].translations.urd", "object"),
                Field("[0].translations.urd.official", "string", "جمہوریہ پولینڈ"),
                Field("[0].translations.urd.common", "string", "پولینڈ"),
                Container("[0].translations.zho", "object"),
                Field("[0].translations.zho.official", "string", "波兰共和国"),
                Field("[0].translations.zho.common", "string", "波兰"),
                Field("[0].flag", "string", "🇵🇱"),
                Container("[0].maps", "object"),
                Field("[0].maps.googleMaps", "string", "https://goo.gl/maps/gY9Xw4Sf4415P4949"),
                Field("[0].maps.openStreetMaps", "string", "https://www.openstreetmap.org/relation/49715"),
                Field("[0].population", "number", "37392000"),
                Container("[0].gini", "object"),
                Field("[0].gini.2018", "number", "30.2"),
                Field("[0].fifa", "string", "POL"),
                Container("[0].car", "object"),
                Container("[0].car.signs", "array"),
                Field("[0].car.signs[0]", "string", "PL"),
                Field("[0].car.side", "string", "right"),
                Container("[0].timezones", "array"),
                Field("[0].timezones[0]", "string", "UTC+01:00"),
                Container("[0].continents", "array"),
                Field("[0].continents[0]", "string", "Europe"),
                Container("[0].flags", "object"),
                Field("[0].flags.png", "string", "https://flagcdn.com/w320/pl.png"),
                Field("[0].flags.svg", "string", "https://flagcdn.com/pl.svg"),
                Field("[0].flags.alt", "string", "The flag of Poland is composed of two equal horizontal bands of white and red."),
                Container("[0].coatOfArms", "object"),
                Field("[0].coatOfArms.png", "string", "https://mainfacts.com/media/images/coats_of_arms/pl.png"),
                Field("[0].coatOfArms.svg", "string", "https://mainfacts.com/media/images/coats_of_arms/pl.svg"),
                Field("[0].startOfWeek", "string", "monday"),
                Container("[0].capitalInfo", "object"),
                Container("[0].capitalInfo.latlng", "array"),
                Field("[0].capitalInfo.latlng[0]", "number", "52.25"),
                Container("[0].postalCode", "object"),
                Field("[0].postalCode.format", "string", "##-###"),
                Field("[0].postalCode.regex", "string", "^(\\d{5})$")
            }) },

            { Key("open-meteo", "/v1/forecast", "GET"), Meta(true, 200, "application/json", "empty", Array.Empty<ApiFieldSpec>()) },

            { Key("openlibrary", "/search.json?q=harry+potter", "GET"), Meta(true, 200, "application/json", "object", new[]
            {
                Field("numFound", "number", "3753"),
                Field("start", "number", "0"),
                Field("numFoundExact", "boolean", "true"),
                Field("num_found", "number", "3753"),
                Field("documentation_url", "string", "https://openlibrary.org/dev/docs/api/search"),
                Field("q", "string", "harry potter"),
                Field("offset", "null"),
                Container("docs", "array"),
                Container("docs[0]", "object"),
                Container("docs[0].author_key", "array"),
                Field("docs[0].author_key[0]", "string", "OL23919A"),
                Container("docs[0].author_name", "array"),
                Field("docs[0].author_name[0]", "string", "J. K. Rowling"),
                Field("docs[0].cover_edition_key", "string", "OL61027601M"),
                Field("docs[0].cover_i", "number", "15155833"),
                Field("docs[0].ebook_access", "string", "borrowable"),
                Field("docs[0].edition_count", "number", "393"),
                Field("docs[0].first_publish_year", "number", "1997"),
                Field("docs[0].has_fulltext", "boolean", "true"),
                Container("docs[0].ia", "array"),
                Field("docs[0].ia[0]", "string", "harrypotterylapi0000rowl_q5r6"),
                Container("docs[0].ia_collection", "array"),
                Field("docs[0].ia_collection[0]", "string", "JaiGyan"),
                Field("docs[0].key", "string", "/works/OL82563W"),
                Container("docs[0].language", "array"),
                Field("docs[0].language[0]", "string", "spa"),
                Field("docs[0].lending_edition_s", "string", "OL38565767M"),
                Field("docs[0].lending_identifier_s", "string", "harrypotterylapi0000rowl_q5r6"),
                Field("docs[0].public_scan_b", "boolean", "false"),
                Field("docs[0].title", "string", "Harry Potter and the Philosopher's Stone")
            }) },

            { Key("pokeapi", "/api/v2/pokemon", "GET"), Meta(true, 200, "application/json", "object", new[]
            {
                Field("count", "number", "1350"),
                Field("next", "string", "https://pokeapi.co/api/v2/pokemon?offset=20&limit=20"),
                Field("previous", "null"),
                Container("results", "array"),
                Container("results[0]", "object"),
                Field("results[0].name", "string", "bulbasaur"),
                Field("results[0].url", "string", "https://pokeapi.co/api/v2/pokemon/1/")
            }) },
            { Key("pokeapi", "/api/v2/ability", "GET"), Meta(true, 200, "application/json", "object", new[]
            {
                Field("count", "number", "367"),
                Field("next", "string", "https://pokeapi.co/api/v2/ability?offset=20&limit=20"),
                Field("previous", "null"),
                Container("results", "array"),
                Container("results[0]", "object"),
                Field("results[0].name", "string", "stench"),
                Field("results[0].url", "string", "https://pokeapi.co/api/v2/ability/1/")
            }) },

            { Key("jsonplaceholder", "/posts", "GET"), Meta(true, 200, "application/json", "array", new[]
            {
                Container("[0]", "object"),
                Field("[0].userId", "number", "1"),
                Field("[0].id", "number", "1"),
                Field("[0].title", "string", "sunt aut facere repellat provident occaecati excepturi optio reprehenderit"),
                Field("[0].body", "string", "quia et suscipit suscipit recusandae consequuntur expedita et cum reprehenderit molestiae ut ut quas totam nostrum rerum est autem sunt rem eveniet architecto")
            }) },
            { Key("jsonplaceholder", "/users", "GET"), Meta(true, 200, "application/json", "array", new[]
            {
                Container("[0]", "object"),
                Field("[0].id", "number", "1"),
                Field("[0].name", "string", "Leanne Graham"),
                Field("[0].username", "string", "Bret"),
                Field("[0].email", "string", "Sincere@april.biz"),
                Container("[0].address", "object"),
                Field("[0].address.street", "string", "Kulas Light"),
                Field("[0].address.suite", "string", "Apt. 556"),
                Field("[0].address.city", "string", "Gwenborough"),
                Field("[0].address.zipcode", "string", "92998-3874"),
                Container("[0].address.geo", "object"),
                Field("[0].address.geo.lat", "string", "-37.3159"),
                Field("[0].address.geo.lng", "string", "81.1496"),
                Field("[0].phone", "string", "1-770-736-8031 x56442"),
                Field("[0].website", "string", "hildegard.org"),
                Container("[0].company", "object"),
                Field("[0].company.name", "string", "Romaguera-Crona"),
                Field("[0].company.catchPhrase", "string", "Multi-layered client-server neural-net"),
                Field("[0].company.bs", "string", "harness real-time e-markets")
            }) },

            { Key("dog-ceo", "/api/breeds/image/random", "GET"), Meta(true, 200, "application/json", "object", new[]
            {
                Field("message", "string", "https://images.dog.ceo/breeds/basenji/n02110806_4435.jpg"),
                Field("status", "string", "success")
            }) },

            { Key("randomfox", "/floof/", "GET"), Meta(true, 200, "application/json", "object", new[]
            {
                Field("image", "string", "https://randomfox.ca/images/118.jpg"),
                Field("link", "string", "https://randomfox.ca/?i=118")
            }) },

            { Key("randomdog", "/woof.json", "GET"), Meta(true, 200, "application/json", "object", new[]
            {
                Field("fileSizeBytes", "number", "107720"),
                Field("url", "string", "https://random.dog/e00b0661-9c04-463c-8f88-612613dd0ea0.jpeg")
            }) },

            { Key("randomduck", "/api/v2/random", "GET"), Meta(true, 200, "application/json", "object", new[]
            {
                Field("message", "string", "Powered by random-d.uk"),
                Field("url", "string", "http://random-d.uk/api/365.JPG")
            }) },

            { Key("opentrivia", "/api.php?amount=10", "GET"), Meta(true, 200, "application/json", "object", new[]
            {
                Field("response_code", "number", "0"),
                Container("results", "array"),
                Container("results[0]", "object"),
                Field("results[0].type", "string", "boolean"),
                Field("results[0].difficulty", "string", "medium"),
                Field("results[0].category", "string", "History"),
                Field("results[0].question", "string", "If you grab the bladed end of a longsword in a specific way, you will not cut yourself."),
                Field("results[0].correct_answer", "string", "True"),
                Container("results[0].incorrect_answers", "array"),
                Field("results[0].incorrect_answers[0]", "string", "False")
            }) },

            { Key("rick-and-morty", "/api/character", "GET"), Meta(true, 200, "application/json", "object", new[]
            {
                Container("info", "object"),
                Field("info.count", "number", "826"),
                Field("info.pages", "number", "42"),
                Field("info.next", "string", "https://rickandmortyapi.com/api/character?page=2"),
                Field("info.prev", "null"),
                Container("results", "array"),
                Container("results[0]", "object"),
                Field("results[0].id", "number", "1"),
                Field("results[0].name", "string", "Rick Sanchez"),
                Field("results[0].status", "string", "Alive"),
                Field("results[0].species", "string", "Human"),
                Field("results[0].type", "string", string.Empty),
                Field("results[0].gender", "string", "Male"),
                Container("results[0].origin", "object"),
                Field("results[0].origin.name", "string", "Earth (C-137)"),
                Field("results[0].origin.url", "string", "https://rickandmortyapi.com/api/location/1"),
                Container("results[0].location", "object"),
                Field("results[0].location.name", "string", "Citadel of Ricks"),
                Field("results[0].location.url", "string", "https://rickandmortyapi.com/api/location/3"),
                Field("results[0].image", "string", "https://rickandmortyapi.com/api/character/avatar/1.jpeg"),
                Container("results[0].episode", "array"),
                Field("results[0].episode[0]", "string", "https://rickandmortyapi.com/api/episode/1"),
                Field("results[0].url", "string", "https://rickandmortyapi.com/api/character/1"),
                Field("results[0].created", "string", "2017-11-04T18:48:46.250Z")
            }) },

            { Key("spacex", "/v5/launches", "GET"), Meta(true, 200, "application/json", "array", new[]
            {
                Container("[0]", "object"),
                Container("[0].fairings", "object"),
                Field("[0].fairings.reused", "boolean", "false"),
                Field("[0].fairings.recovery_attempt", "boolean", "false"),
                Field("[0].fairings.recovered", "boolean", "false"),
                Container("[0].fairings.ships", "array"),
                Container("[0].links", "object"),
                Container("[0].links.patch", "object"),
                Field("[0].links.patch.small", "string", "https://images2.imgbox.com/94/f2/NN6Ph45r_o.png"),
                Field("[0].links.patch.large", "string", "https://images2.imgbox.com/5b/02/QcxHUb5V_o.png"),
                Container("[0].links.reddit", "object"),
                Field("[0].links.reddit.campaign", "null"),
                Field("[0].links.reddit.launch", "null"),
                Field("[0].links.reddit.media", "null"),
                Field("[0].links.reddit.recovery", "null"),
                Container("[0].links.flickr", "object"),
                Container("[0].links.flickr.small", "array"),
                Container("[0].links.flickr.original", "array"),
                Field("[0].links.presskit", "null"),
                Field("[0].links.webcast", "string", "https://www.youtube.com/watch?v=0a_00nJ_Y88"),
                Field("[0].links.youtube_id", "string", "0a_00nJ_Y88"),
                Field("[0].links.article", "string", "https://www.space.com/2196-spacex-inaugural-falcon-1-rocket-lost-launch.html"),
                Field("[0].links.wikipedia", "string", "https://en.wikipedia.org/wiki/DemoSat"),
                Field("[0].static_fire_date_utc", "string", "2006-03-17T00:00:00.000Z"),
                Field("[0].static_fire_date_unix", "number", "1142553600"),
                Field("[0].net", "boolean", "false"),
                Field("[0].window", "number", "0"),
                Field("[0].rocket", "string", "5e9d0d95eda69955f709d1eb"),
                Field("[0].success", "boolean", "false"),
                Container("[0].failures", "array"),
                Container("[0].failures[0]", "object"),
                Field("[0].failures[0].time", "number", "33"),
                Field("[0].failures[0].altitude", "null"),
                Field("[0].failures[0].reason", "string", "merlin engine failure"),
                Field("[0].details", "string", "Engine failure at 33 seconds and loss of vehicle"),
                Container("[0].crew", "array"),
                Container("[0].ships", "array"),
                Container("[0].capsules", "array"),
                Container("[0].payloads", "array"),
                Field("[0].payloads[0]", "string", "5eb0e4b5b6c3bb0006eeb1e1"),
                Field("[0].launchpad", "string", "5e9e4502f5090995de566f86"),
                Field("[0].flight_number", "number", "1"),
                Field("[0].name", "string", "FalconSat"),
                Field("[0].date_utc", "string", "2006-03-24T22:30:00.000Z"),
                Field("[0].date_unix", "number", "1143239400"),
                Field("[0].date_local", "string", "2006-03-25T10:30:00+12:00"),
                Field("[0].date_precision", "string", "hour"),
                Field("[0].upcoming", "boolean", "false"),
                Container("[0].cores", "array"),
                Container("[0].cores[0]", "object"),
                Field("[0].cores[0].core", "string", "5e9e289df35918033d3b2623"),
                Field("[0].cores[0].flight", "number", "1"),
                Field("[0].cores[0].gridfins", "boolean", "false"),
                Field("[0].cores[0].legs", "boolean", "false"),
                Field("[0].cores[0].reused", "boolean", "false"),
                Field("[0].cores[0].landing_attempt", "boolean", "false"),
                Field("[0].cores[0].landing_success", "null"),
                Field("[0].cores[0].landing_type", "null"),
                Field("[0].cores[0].landpad", "null"),
                Field("[0].auto_update", "boolean", "true"),
                Field("[0].tbd", "boolean", "false"),
                Field("[0].launch_library_id", "null"),
                Field("[0].id", "string", "5eb87cd9ffd86e000604b32a")
            }) },

            { Key("spacex", "/v5/launches/latest", "GET"), Meta(true, 200, "application/json", "object", new[]
            {
                Field("fairings", "null"),
                Container("links", "object"),
                Container("links.patch", "object"),
                Field("links.patch.small", "string", "https://images2.imgbox.com/eb/d8/D1Yywp0w_o.png"),
                Field("links.patch.large", "string", "https://images2.imgbox.com/33/2e/k6VE4iYl_o.png"),
                Container("links.reddit", "object"),
                Field("links.reddit.campaign", "null"),
                Field("links.reddit.launch", "string", "https://www.reddit.com/r/spacex/comments/xvm76j/rspacex_crew5_launchcoast_docking_discussion_and/"),
                Field("links.reddit.media", "null"),
                Field("links.reddit.recovery", "null"),
                Container("links.flickr", "object"),
                Container("links.flickr.small", "array"),
                Container("links.flickr.original", "array"),
                Field("links.presskit", "null"),
                Field("links.webcast", "string", "https://youtu.be/5EwW8ZkArL4"),
                Field("links.youtube_id", "string", "5EwW8ZkArL4"),
                Field("links.article", "null"),
                Field("links.wikipedia", "string", "https://en.wikipedia.org/wiki/SpaceX_Crew-5"),
                Field("static_fire_date_utc", "null"),
                Field("static_fire_date_unix", "null"),
                Field("net", "boolean", "false"),
                Field("window", "null"),
                Field("rocket", "string", "5e9d0d95eda69973a809d1ec"),
                Field("success", "boolean", "true"),
                Container("failures", "array"),
                Field("details", "null"),
                Container("crew", "array"),
                Container("crew[0]", "object"),
                Field("crew[0].crew", "string", "62dd7196202306255024d13c"),
                Field("crew[0].role", "string", "Commander"),
                Container("ships", "array"),
                Container("capsules", "array"),
                Field("capsules[0]", "string", "617c05591bad2c661a6e2909"),
                Container("payloads", "array"),
                Field("payloads[0]", "string", "62dd73ed202306255024d145"),
                Field("launchpad", "string", "5e9e4502f509094188566f88"),
                Field("flight_number", "number", "187"),
                Field("name", "string", "Crew-5"),
                Field("date_utc", "string", "2022-10-05T16:00:00.000Z"),
                Field("date_unix", "number", "1664985600"),
                Field("date_local", "string", "2022-10-05T12:00:00-04:00"),
                Field("date_precision", "string", "hour"),
                Field("upcoming", "boolean", "false"),
                Container("cores", "array"),
                Container("cores[0]", "object"),
                Field("cores[0].core", "string", "633d9da635a71d1d9c66797b"),
                Field("cores[0].flight", "number", "1"),
                Field("cores[0].gridfins", "boolean", "true"),
                Field("cores[0].legs", "boolean", "true"),
                Field("cores[0].reused", "boolean", "false"),
                Field("cores[0].landing_attempt", "boolean", "true"),
                Field("cores[0].landing_success", "boolean", "true"),
                Field("cores[0].landing_type", "string", "ASDS"),
                Field("cores[0].landpad", "string", "5e9e3033383ecbb9e534e7cc"),
                Field("auto_update", "boolean", "true"),
                Field("tbd", "boolean", "false"),
                Field("launch_library_id", "string", "f33d5ece-e825-4cd8-809f-1d4c72a2e0d3"),
                Field("id", "string", "62dd70d5202306255024d139")
            }) },

            { Key("httpbin", "/get", "GET"), Meta(true, 200, "application/json", "object", new[]
            {
                Container("args", "object"),
                Container("headers", "object"),
                Field("headers.Accept", "string", "application/json, text/plain, */*; q=0.1"),
                Field("headers.Host", "string", "httpbin.org"),
                Field("headers.User-Agent", "string", "StreamCraft/1.0"),
                Field("headers.X-Amzn-Trace-Id", "string", "Root=1-697e4ba4-66e8dfa7391e838e0d23acbc"),
                Field("origin", "string", "151.248.41.234"),
                Field("url", "string", "https://httpbin.org/get")
            }) },
            { Key("httpbin", "/anything", "GET"), Meta(true, 200, "application/json", "object", new[]
            {
                Container("args", "object"),
                Container("headers", "object"),
                Field("headers.Accept", "string", "application/json, text/plain, */*; q=0.1"),
                Field("headers.Host", "string", "httpbin.org"),
                Field("headers.User-Agent", "string", "StreamCraft/1.0"),
                Field("headers.X-Amzn-Trace-Id", "string", "Root=1-697e4ba4-2fd0ff3b0c05908a5d278a9e"),
                Field("json", "null"),
                Field("method", "string", "GET"),
                Field("origin", "string", "151.248.41.234"),
                Field("url", "string", "https://httpbin.org/anything")
            }) },

            { Key("cat-facts", "/fact", "GET"), Meta(true, 200, "application/json", "object", new[]
            {
                Field("fact", "string", "Some cats have survived falls of over 65 feet (20 meters), due largely to their “righting reflex.” The eyes and balance organs in the inner ear tell it where it..."),
                Field("length", "number", "249")
            }) }
        };

    public static bool TryGet(string sourceId, string endpointPath, string method, out ApiResponseMetadata metadata)
    {
        return Map.TryGetValue(Key(sourceId, endpointPath, method), out metadata);
    }

    private static (string Source, string Path, string Method) Key(string sourceId, string path, string method)
    {
        return (Normalize(sourceId), Normalize(path), Normalize(method));
    }

    private static string Normalize(string value)
    {
        return string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim().ToLowerInvariant();
    }

    private static ApiResponseMetadata Meta(bool success, int? statusCode, string? contentType, string? rootKind, IReadOnlyList<ApiFieldSpec> fields, string? error = null)
    {
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

    private static ApiFieldSpec Field(string path, string type, string? example = null)
    {
        return new ApiFieldSpec(path, type, example, IsContainer: false);
    }

    private static ApiFieldSpec Container(string path, string type)
    {
        return new ApiFieldSpec(path, type, null, IsContainer: true);
    }

    private sealed class MetadataKeyComparer : IEqualityComparer<(string Source, string Path, string Method)>
    {
        public bool Equals((string Source, string Path, string Method) x, (string Source, string Path, string Method) y)
        {
            return x.Source == y.Source && x.Path == y.Path && x.Method == y.Method;
        }

        public int GetHashCode((string Source, string Path, string Method) obj)
        {
            return HashCode.Combine(obj.Source, obj.Path, obj.Method);
        }
    }
}

