using Core.Diagnostics;
using Microsoft.Extensions.Options;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace Sc2GameDataClient;

public sealed class Sc2GameDataClient : ISc2GameDataClient, IDisposable
{
    private readonly HttpClient _httpClient;
    private readonly Sc2GameDataClientOptions _options;
    private readonly JsonSerializerOptions _jsonOptions;
    private readonly SemaphoreSlim _tokenLock = new(1, 1);
    private string? _accessToken;
    private DateTime _accessTokenExpiresUtc = DateTime.MinValue;

    public Sc2GameDataClient(IOptions<Sc2GameDataClientOptions> options)
    {
        if (options == null) throw ExceptionFactory.ArgumentNull(nameof(options));
        _options = options.Value;
        _httpClient = new HttpClient
        {
            BaseAddress = new Uri(_options.ApiBaseUrl)
        };
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };
    }

    public Uri BaseAddress => _httpClient.BaseAddress ?? throw ExceptionFactory.InvalidOperation("HttpClient.BaseAddress is null");

    public void Dispose()
    {
        _httpClient.Dispose();
        _tokenLock.Dispose();
    }

    public Task<JsonDocument> GetProfileAsync(int regionId, int realmId, int profileId, string? locale = null, CancellationToken cancellationToken = default)
        => GetAsync($"/sc2/profile/{regionId}/{realmId}/{profileId}", locale, cancellationToken);

    public Task<JsonDocument> GetProfileMetadataAsync(int regionId, int realmId, int profileId, string? locale = null, CancellationToken cancellationToken = default)
        => GetAsync($"/sc2/metadata/profile/{regionId}/{realmId}/{profileId}", locale, cancellationToken);

    public Task<JsonDocument> GetLadderSummaryAsync(int regionId, int realmId, int profileId, string? locale = null, CancellationToken cancellationToken = default)
        => GetAsync($"/sc2/profile/{regionId}/{realmId}/{profileId}/ladder/summary", locale, cancellationToken);

    public Task<JsonDocument> GetPlayerAsync(long accountId, string? locale = null, CancellationToken cancellationToken = default)
        => GetAsync($"/sc2/player/{accountId}", locale, cancellationToken);

    private async Task<JsonDocument> GetAsync(string path, string? locale, CancellationToken cancellationToken)
    {
        var token = await GetAccessTokenAsync(cancellationToken).ConfigureAwait(false);

        var request = new HttpRequestMessage(HttpMethod.Get, AppendLocale(path, locale ?? _options.Locale));
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        using var response = await _httpClient.SendAsync(request, cancellationToken).ConfigureAwait(false);
        response.EnsureSuccessStatusCode();

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken).ConfigureAwait(false);
        return await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken).ConfigureAwait(false);
    }

    private async Task<string> GetAccessTokenAsync(CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(_accessToken) && DateTime.UtcNow < _accessTokenExpiresUtc)
        {
            return _accessToken;
        }

        await _tokenLock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            if (!string.IsNullOrWhiteSpace(_accessToken) && DateTime.UtcNow < _accessTokenExpiresUtc)
            {
                return _accessToken;
            }

            if (string.IsNullOrWhiteSpace(_options.ClientId) || string.IsNullOrWhiteSpace(_options.ClientSecret))
            {
                throw ExceptionFactory.InvalidOperation("Blizzard API client credentials are not configured.");
            }

            var tokenUri = new Uri($"{_options.AuthBaseUrl}/token");
            using var request = new HttpRequestMessage(HttpMethod.Post, tokenUri);
            var basic = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_options.ClientId}:{_options.ClientSecret}"));
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic", basic);
            request.Content = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("grant_type", "client_credentials")
            });

            using var response = await _httpClient.SendAsync(request, cancellationToken).ConfigureAwait(false);
            response.EnsureSuccessStatusCode();

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken).ConfigureAwait(false);
            var tokenResponse = await JsonSerializer.DeserializeAsync<TokenResponse>(stream, _jsonOptions, cancellationToken).ConfigureAwait(false);

            if (tokenResponse == null || string.IsNullOrWhiteSpace(tokenResponse.AccessToken))
            {
                throw ExceptionFactory.InvalidOperation("Failed to retrieve Blizzard API access token.");
            }

            _accessToken = tokenResponse.AccessToken;
            _accessTokenExpiresUtc = DateTime.UtcNow.AddSeconds(Math.Max(30, tokenResponse.ExpiresIn - 30));
            return _accessToken;
        }
        finally
        {
            _tokenLock.Release();
        }
    }

    private static string AppendLocale(string path, string? locale)
    {
        if (string.IsNullOrWhiteSpace(locale))
        {
            return path;
        }

        var separator = path.Contains('?', StringComparison.Ordinal) ? "&" : "?";
        return $"{path}{separator}locale={Uri.EscapeDataString(locale)}";
    }

    private sealed class TokenResponse
    {
        public string? AccessToken { get; set; }
        public int ExpiresIn { get; set; }
    }
}
