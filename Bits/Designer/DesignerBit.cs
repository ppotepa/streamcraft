using Core.Bits;
using Core.Designer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using System.Text.Json;
using System.Linq;
using System.IO;

namespace StreamCraft.Bits.Designer;

[BitRoute("/designer")]
[HasUserInterface]
public sealed class DesignerBit : StreamBit<DesignerBitState>, IBuiltInFeature, IBitEndpointContributor
{
    public override string Name => "Bit Designer";
    public override string Description => "Visual builder for creating and configuring bits without code.";

    protected override void OnInitialize()
    {
        var registry = Context?.ServiceProvider.GetService<IDataSourceRegistry>();
        State.ApiSourceCount = registry?.GetAll().Count ?? 0;
        State.TimestampUtc = DateTime.UtcNow;
    }

    public override async Task HandleAsync(HttpContext httpContext)
    {
        var snapshot = StateStore?.GetSnapshot() ?? State;
        httpContext.Response.ContentType = "application/json";
        await httpContext.Response.WriteAsync(JsonSerializer.Serialize(snapshot, new JsonSerializerOptions
        {
            WriteIndented = true
        }));
    }

    public void MapEndpoints(IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/designer/sources", async context =>
        {
            var registry = context.RequestServices.GetService<IDataSourceRegistry>();
            var sources = registry?.GetAll().ToArray() ?? Array.Empty<IDataSource>();
            var payload = sources.Select(source =>
            {
                if (source is IApiSource api)
                {
                    return new DataSourceDto
                    {
                        Id = api.Id,
                        Name = api.Name,
                        Description = api.Description,
                        Kind = api.Kind,
                        BaseUrl = api.BaseUrl,
                        DocsUrl = api.DocsUrl,
                            Endpoints = api.Endpoints
                                .Select(endpoint => new EndpointDto
                            {
                                Name = endpoint.Name,
                                Path = endpoint.Path,
                                Method = endpoint.Method,
                                Description = endpoint.Description,
                                Response = endpoint.Response
                            })
                            .ToArray()
                    };
                }

                return new DataSourceDto
                {
                    Id = source.Id,
                    Name = source.Name,
                    Description = source.Description,
                    Kind = source.Kind
                };
            });
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(payload, new JsonSerializerOptions
            {
                WriteIndented = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            }));
        });

        endpoints.MapGet("/designer/widgets", async context =>
        {
            var registry = context.RequestServices.GetService<IWidgetRegistry>();
            var widgets = registry?.GetAll().ToArray() ?? Array.Empty<WidgetDefinition>();
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(widgets, new JsonSerializerOptions
            {
                WriteIndented = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            }));
        });

        endpoints.MapGet("/designer/preview", async context =>
        {
            var sourceId = context.Request.Query["sourceId"].ToString();
            if (string.IsNullOrWhiteSpace(sourceId))
            {
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                await context.Response.WriteAsync("Missing sourceId.");
                return;
            }

            var providerRegistry = context.RequestServices.GetService<IDataSourceProviderRegistry>();
            var provider = providerRegistry?.Get(sourceId);
            if (provider == null)
            {
                var sourceRegistry = context.RequestServices.GetService<IDataSourceRegistry>();
                var source = sourceRegistry?.GetAll()
                    .FirstOrDefault(s => string.Equals(s.Id, sourceId, StringComparison.OrdinalIgnoreCase));
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync(JsonSerializer.Serialize(new
                {
                    Message = "No live preview provider registered for this source.",
                    Source = source
                }, new JsonSerializerOptions
                {
                    WriteIndented = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                }));
                return;
            }

            var preview = await provider.GetPreviewAsync(context.RequestAborted);
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(preview, new JsonSerializerOptions
            {
                WriteIndented = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            }));
        });

        endpoints.MapGet("/designer/layout", async context =>
        {
            var layoutId = context.Request.Query["layoutId"].ToString();
            if (string.IsNullOrWhiteSpace(layoutId))
            {
                layoutId = "default";
            }

            var store = context.RequestServices.GetService<DesignerLayoutStore>();
            if (store == null)
            {
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                await context.Response.WriteAsync("DesignerLayoutStore is not configured.");
                return;
            }

            var json = await store.ReadAsync(layoutId, context.RequestAborted);
            if (string.IsNullOrWhiteSpace(json))
            {
                context.Response.StatusCode = StatusCodes.Status204NoContent;
                return;
            }

            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(json);
        });

        endpoints.MapPost("/designer/layout", async context =>
        {
            var layoutId = context.Request.Query["layoutId"].ToString();
            if (string.IsNullOrWhiteSpace(layoutId))
            {
                layoutId = "default";
            }

            var store = context.RequestServices.GetService<DesignerLayoutStore>();
            if (store == null)
            {
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                await context.Response.WriteAsync("DesignerLayoutStore is not configured.");
                return;
            }

            using var reader = new StreamReader(context.Request.Body);
            var json = await reader.ReadToEndAsync();
            if (string.IsNullOrWhiteSpace(json))
            {
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                await context.Response.WriteAsync("Missing layout payload.");
                return;
            }

            await store.WriteAsync(layoutId, json, context.RequestAborted);
            context.Response.StatusCode = StatusCodes.Status204NoContent;
        });
    }
}

public sealed class DesignerBitState : IBitState
{
    public string Status { get; set; } = "idle";
    public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;
    public int ApiSourceCount { get; set; }
    public string[] Capabilities { get; set; } =
    [
        "api-sources",
        "layout-canvas",
        "field-mapping",
        "preview"
    ];
}

internal sealed record DataSourceDto
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string Kind { get; init; } = string.Empty;
    public string? BaseUrl { get; init; }
    public string? DocsUrl { get; init; }
    public IReadOnlyList<EndpointDto>? Endpoints { get; init; }
}

internal sealed record EndpointDto
{
    public string Name { get; init; } = string.Empty;
    public string Path { get; init; } = string.Empty;
    public string Method { get; init; } = string.Empty;
    public string? Description { get; init; }
    public ApiResponseMetadata? Response { get; init; }
}
