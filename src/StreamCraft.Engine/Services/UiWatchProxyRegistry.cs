using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Serilog;

namespace StreamCraft.Engine.Services;

internal sealed class UiWatchProxyRegistry
{
    private readonly Dictionary<string, UiWatchProxyRoute> _routes = new(StringComparer.OrdinalIgnoreCase);
    private string? _source;
    private readonly ILogger? _logger;
    private readonly bool _watchModeEnabled;

    public UiWatchProxyRegistry(ILogger? logger)
    {
        _logger = logger;
        _watchModeEnabled = string.Equals(Environment.GetEnvironmentVariable("STREAMCRAFT_WATCH_MODE"), "1", StringComparison.OrdinalIgnoreCase);

        if (!_watchModeEnabled)
        {
            _logger?.Debug("UI watch proxy registry disabled (STREAMCRAFT_WATCH_MODE != 1).");
            return;
        }

        if (TryLoadFromWatchMapFile())
        {
            _source = "watch-map";
            _logger?.Information("Configured {Count} UI watch proxy routes from watch map.", _routes.Count);
        }
        else if (TryLoadFromEnvironment())
        {
            _source = "env";
            _logger?.Information("Configured {Count} UI watch proxy routes from STREAMCRAFT_VITE_PORTS.", _routes.Count);
        }
        else
        {
            _logger?.Debug("No UI watch proxy routes configured.");
        }
    }

    public bool TryGetRoute(string route, out UiWatchProxyRoute? proxy)
    {
        proxy = null;
        var normalized = NormalizeRoute(route);
        if (string.IsNullOrEmpty(normalized))
        {
            return false;
        }

        return _routes.TryGetValue(normalized, out proxy);
    }

    public IReadOnlyList<UiWatchProxyRegistryEntry> GetAllRoutes()
    {
        if (!_watchModeEnabled)
        {
            return Array.Empty<UiWatchProxyRegistryEntry>();
        }
        return _routes.Values
            .Select(r => new UiWatchProxyRegistryEntry(r.Route, r.DevServerBaseUri, _source ?? "none"))
            .ToList();
    }

    public string Source => _source ?? "none";

    private bool TryLoadFromWatchMapFile()
    {
        var mapPath = FindWatchMapPath();
        if (mapPath == null)
        {
            return false;
        }

        try
        {
            var json = File.ReadAllText(mapPath);
            var entries = JsonSerializer.Deserialize<List<WatchMapEntry>>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (entries == null)
            {
                return false;
            }

            foreach (var entry in entries)
            {
                if (string.IsNullOrWhiteSpace(entry.Route) || string.IsNullOrWhiteSpace(entry.DevUrl))
                {
                    continue;
                }

                if (!Uri.TryCreate(entry.DevUrl, UriKind.Absolute, out var devUri))
                {
                    _logger?.Warning("Skipping UI watch entry for {BitId}: invalid devUrl {DevUrl}", entry.BitId, entry.DevUrl);
                    continue;
                }

                var normalized = NormalizeRoute(entry.Route);
                if (string.IsNullOrEmpty(normalized))
                {
                    continue;
                }

                AddRoute(normalized, EnsureTrailingSlash(devUri));
            }

            return _routes.Count > 0;
        }
        catch (Exception ex)
        {
            _logger?.Warning(ex, "Failed to load UI watch map from {Path}", mapPath);
            return false;
        }
    }

    private bool TryLoadFromEnvironment()
    {
        var envValue = Environment.GetEnvironmentVariable("STREAMCRAFT_VITE_PORTS");
        if (string.IsNullOrWhiteSpace(envValue))
        {
            return false;
        }

        foreach (var token in envValue.Split(';', StringSplitOptions.RemoveEmptyEntries))
        {
            var parts = token.Split('=', 2);
            if (parts.Length != 2)
            {
                continue;
            }

            var normalizedRoute = NormalizeRoute(parts[0]);
            if (string.IsNullOrEmpty(normalizedRoute))
            {
                continue;
            }

            if (!int.TryParse(parts[1], out var port))
            {
                _logger?.Warning("Unable to parse port from STREAMCRAFT_VITE_PORTS entry '{Entry}'", token);
                continue;
            }

            var builder = new UriBuilder("http", "localhost", port)
            {
                Path = normalizedRoute.TrimStart('/') + "/"
            };

            AddRoute(normalizedRoute, EnsureTrailingSlash(builder.Uri));
        }

        return _routes.Count > 0;
    }

    private static string NormalizeRoute(string? route)
    {
        if (string.IsNullOrWhiteSpace(route))
        {
            return string.Empty;
        }

        var trimmed = route.Trim();
        if (!trimmed.StartsWith("/"))
        {
            trimmed = "/" + trimmed;
        }

        return trimmed.TrimEnd('/');
    }

    private static Uri EnsureTrailingSlash(Uri uri)
    {
        var absolute = uri.AbsoluteUri;
        if (absolute.EndsWith("/", StringComparison.Ordinal))
        {
            return uri;
        }

        return new Uri(absolute + "/");
    }

    private void AddRoute(string normalizedRoute, Uri devBaseUri)
    {
        _routes[normalizedRoute] = new UiWatchProxyRoute(normalizedRoute, devBaseUri, _logger);
    }

    private static string? FindWatchMapPath()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        for (var depth = 0; depth < 10 && directory != null; depth++)
        {
            var candidate = Path.Combine(directory.FullName, "artifacts", "watch", "watch-map.json");
            if (File.Exists(candidate))
            {
                return candidate;
            }

            directory = directory.Parent;
        }

        return null;
    }

    private sealed record WatchMapEntry(string BitId, string Route, string ProxyUrl, string DevUrl, int Port);
}

internal sealed class UiWatchProxyRoute
{
    private readonly ILogger? _logger;
    private readonly HttpClient _httpClient;

    public UiWatchProxyRoute(string route, Uri devBaseUri, ILogger? logger)
    {
        Route = route;
        DevServerBaseUri = devBaseUri;
        _logger = logger;
        _httpClient = new HttpClient
        {
            BaseAddress = DevServerBaseUri
        };
    }

    public string Route { get; }

    public Uri DevServerBaseUri { get; }

    public async Task ProxyAsync(HttpContext context)
    {
        var targetUri = BuildTargetUri(context);
        _logger?.Debug("Proxying UI watch request {Path} → {Target}", context.Request.Path, targetUri);
        using var requestMessage = CreateRequestMessage(context, targetUri);
        using var responseMessage = await _httpClient.SendAsync(requestMessage, HttpCompletionOption.ResponseHeadersRead, context.RequestAborted);

        context.Response.StatusCode = (int)responseMessage.StatusCode;
        CopyResponseHeaders(context, responseMessage);
        await responseMessage.Content.CopyToAsync(context.Response.Body, context.RequestAborted);
    }

    private HttpRequestMessage CreateRequestMessage(HttpContext context, Uri targetUri)
    {
        var requestMessage = new HttpRequestMessage(new HttpMethod(context.Request.Method), targetUri);
        if (HasRequestBody(context))
        {
            var streamContent = new StreamContent(context.Request.Body);
            requestMessage.Content = streamContent;
            CopyContentHeaders(context, streamContent);
        }

        CopyRequestHeaders(context, requestMessage);
        return requestMessage;
    }

    private Uri BuildTargetUri(HttpContext context)
    {
        var requestPath = context.Request.Path.Value ?? string.Empty;
        var normalizedRoute = Route;
        if (!normalizedRoute.StartsWith("/", StringComparison.Ordinal))
        {
            normalizedRoute = "/" + normalizedRoute;
        }

        var relativePath = requestPath;
        if (relativePath.StartsWith(normalizedRoute, StringComparison.OrdinalIgnoreCase))
        {
            relativePath = relativePath[normalizedRoute.Length..];
        }

        while (relativePath.StartsWith("/", StringComparison.Ordinal))
        {
            relativePath = relativePath[1..];
        }

        var query = context.Request.QueryString.HasValue ? context.Request.QueryString.Value : string.Empty;
        var relative = string.Concat(relativePath, query);
        return new Uri(DevServerBaseUri, relative);
    }

    private static bool HasRequestBody(HttpContext context)
    {
        if (context.Request.ContentLength.GetValueOrDefault() > 0)
        {
            return true;
        }

        return context.Request.Headers.ContainsKey("Transfer-Encoding");
    }

    private static void CopyRequestHeaders(HttpContext context, HttpRequestMessage destination)
    {
        foreach (var header in context.Request.Headers)
        {
            if (header.Key.Equals("Host", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (!destination.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray()) && destination.Content != null)
            {
                destination.Content.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
            }
        }
    }

    private static void CopyContentHeaders(HttpContext context, StreamContent destination)
    {
        foreach (var header in context.Request.Headers)
        {
            if (header.Key.Equals("Content-Type", StringComparison.OrdinalIgnoreCase) || header.Key.Equals("Content-Encoding", StringComparison.OrdinalIgnoreCase))
            {
                destination.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
            }
        }
    }

    private static void CopyResponseHeaders(HttpContext context, HttpResponseMessage response)
    {
        foreach (var header in response.Headers)
        {
            context.Response.Headers[header.Key] = header.Value.ToArray();
        }

        foreach (var header in response.Content.Headers)
        {
            context.Response.Headers[header.Key] = header.Value.ToArray();
        }

        context.Response.Headers.Remove("transfer-encoding");
    }
}

internal sealed record UiWatchProxyRegistryEntry(string Route, Uri DevUrl, string Source);