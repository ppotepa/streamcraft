using Core.Designer;
using Core.Plugins;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Serilog;
using System;
using System.Text.Json;
using System.Linq;

namespace StreamCraft.Bits.PublicApiSources;

public sealed class PublicApiSourcesPlugin : IStreamCraftPlugin
{
    public void ConfigureServices(IServiceCollection services, PluginContext context)
    {
        services.AddSingleton<PublicApiSourceLoader>();
        services.AddSingleton<PublicApiResponseModelRegistry>();
        services.AddSingleton(sp => new PublicApiMetadataBuilder(context.Logger, sp.GetRequiredService<PublicApiResponseModelRegistry>()));
        services.AddSingleton<PublicApiMetadataStore>();
        services.AddHostedService(sp =>
            new PublicApiSourcesBootstrapper(
                sp.GetRequiredService<IDataSourceRegistry>(),
                sp.GetRequiredService<PublicApiSourceLoader>(),
                sp.GetRequiredService<PublicApiMetadataBuilder>(),
                sp.GetRequiredService<PublicApiMetadataStore>(),
                context.Logger));
    }

    public void MapEndpoints(IEndpointRouteBuilder endpoints, PluginContext context)
    {
        endpoints.MapGet("/public-api-sources/test", async httpContext =>
        {
            var sourceId = httpContext.Request.Query["sourceId"].ToString();
            var endpointPathRaw = httpContext.Request.Query["endpointPath"].ToString();

            if (string.IsNullOrWhiteSpace(sourceId) || string.IsNullOrWhiteSpace(endpointPathRaw))
            {
                httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
                await httpContext.Response.WriteAsync("Missing sourceId or endpointPath.");
                return;
            }

            var parsedMethod = "";
            var parsedPath = endpointPathRaw;
            var colonIndex = endpointPathRaw.IndexOf(':');
            if (colonIndex > 0)
            {
                parsedMethod = endpointPathRaw[..colonIndex];
                parsedPath = endpointPathRaw[(colonIndex + 1)..];
            }

            var registry = httpContext.RequestServices.GetService<IApiSourceRegistry>();
            var source = registry?.GetAll()
                .FirstOrDefault(item => string.Equals(item.Id, sourceId, StringComparison.OrdinalIgnoreCase));

            if (source == null)
            {
                httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
                await httpContext.Response.WriteAsync("API source not found.");
                return;
            }

            var endpoint = source.Endpoints.FirstOrDefault(item =>
                (string.IsNullOrWhiteSpace(parsedMethod) || string.Equals(item.Method, parsedMethod, StringComparison.OrdinalIgnoreCase)) &&
                (string.Equals(item.Path, parsedPath, StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(item.Name, parsedPath, StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(item.Path, endpointPathRaw, StringComparison.OrdinalIgnoreCase)));

            if (endpoint == null)
            {
                httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
                await httpContext.Response.WriteAsync("Endpoint not found.");
                return;
            }

            if (!string.Equals(endpoint.Method, "GET", StringComparison.OrdinalIgnoreCase))
            {
                httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
                await httpContext.Response.WriteAsync("Only GET endpoints are supported.");
                return;
            }

            var effectivePath = string.IsNullOrWhiteSpace(parsedPath) ? endpoint.Path : parsedPath;
            var uri = BuildUri(source.BaseUrl, effectivePath);
            if (uri == null)
            {
                httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
                await httpContext.Response.WriteAsync("Invalid base URL or endpoint path.");
                return;
            }

            try
            {
                using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
                using var response = await client.GetAsync(uri, httpContext.RequestAborted);
                var contentType = response.Content.Headers.ContentType?.MediaType;
                var payload = await response.Content.ReadAsStringAsync(httpContext.RequestAborted);

                object? responseBody = payload;
                if (LooksLikeJson(payload, contentType))
                {
                    try
                    {
                        responseBody = JsonSerializer.Deserialize<object>(payload);
                    }
                    catch
                    {
                        responseBody = payload;
                    }
                }

                var result = new
                {
                    success = response.IsSuccessStatusCode,
                    statusCode = (int)response.StatusCode,
                    url = uri.ToString(),
                    contentType,
                    fetchedUtc = DateTime.UtcNow,
                    response = responseBody
                };

                httpContext.Response.ContentType = "application/json";
                await httpContext.Response.WriteAsync(JsonSerializer.Serialize(result, new JsonSerializerOptions
                {
                    WriteIndented = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                }));
            }
            catch (Exception ex)
            {
                httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
                await httpContext.Response.WriteAsync(JsonSerializer.Serialize(new
                {
                    success = false,
                    error = ex.Message,
                    fetchedUtc = DateTime.UtcNow
                }, new JsonSerializerOptions
                {
                    WriteIndented = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                }));
            }
        });
    }

    private static Uri? BuildUri(string baseUrl, string path)
    {
        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            return null;
        }

        if (Uri.TryCreate(path, UriKind.Absolute, out var absolute))
        {
            return absolute;
        }

        if (!Uri.TryCreate(baseUrl.TrimEnd('/') + "/", UriKind.Absolute, out var baseUri))
        {
            return null;
        }

        var relative = path.StartsWith("/", StringComparison.Ordinal) ? path[1..] : path;
        return new Uri(baseUri, relative);
    }

    private static bool LooksLikeJson(string payload, string? contentType)
    {
        if (!string.IsNullOrWhiteSpace(contentType) &&
            contentType.Contains("json", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        var trimmed = payload.TrimStart();
        return trimmed.StartsWith("{", StringComparison.Ordinal) || trimmed.StartsWith("[", StringComparison.Ordinal);
    }
}
