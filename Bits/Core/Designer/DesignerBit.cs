using StreamCraft.Core.Bits;
using StreamCraft.Core.DataSources;
using StreamCraft.Core.Designer;
using StreamCraft.Core.Runtime.Chat;
using StreamCraft.Core.Runtime.Preview;
using StreamCraft.Core.Ui.Extensions;
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
                var categoryInfo = DataSourceCategoryResolver.Resolve(source);
                if (source is IPublicApiDataSource api)
                {
                    return new DataSourceDto
                    {
                        Id = api.Id,
                        Name = api.Name,
                        Description = api.Description,
                        Kind = categoryInfo.CategoryId,
                        KindLabel = categoryInfo.CategoryLabel,
                        CategoryId = categoryInfo.SubcategoryId,
                        CategoryLabel = categoryInfo.SubcategoryLabel,
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
                    Kind = categoryInfo.CategoryId,
                    KindLabel = categoryInfo.CategoryLabel,
                    CategoryId = categoryInfo.SubcategoryId,
                    CategoryLabel = categoryInfo.SubcategoryLabel
                };
            });
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(payload, new JsonSerializerOptions
            {
                WriteIndented = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            }));
        });

        endpoints.MapGet("/designer/chat-sources", async context =>
        {
            var registry = context.RequestServices.GetService<IDataSourceRegistry>();
            var sources = registry?.GetAll().OfType<IChatSource>().ToArray() ?? Array.Empty<IChatSource>();

            var payload = sources.Select(source => new
            {
                id = source.Id,
                name = source.Name,
                description = source.Description,
                kind = source.Kind,
                categoryId = source.CategoryId
            });

            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(payload, new JsonSerializerOptions
            {
                WriteIndented = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            }));
        });

        endpoints.MapGet("/designer/chat-sources/{sourceId}/history", async context =>
        {
            var sourceId = context.Request.RouteValues["sourceId"]?.ToString();
            if (string.IsNullOrWhiteSpace(sourceId))
            {
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                await context.Response.WriteAsync("Missing sourceId.");
                return;
            }

            var registry = context.RequestServices.GetService<IChatSourceHistoryProviderRegistry>();
            var provider = registry?.Get(sourceId);
            if (provider == null)
            {
                context.Response.StatusCode = StatusCodes.Status404NotFound;
                await context.Response.WriteAsync("Chat source history provider not found.");
                return;
            }

            var history = await provider.GetHistoryAsync(context.RequestAborted);
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(history, cancellationToken: context.RequestAborted);
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

        endpoints.MapGet("/designer/extensions", async context =>
        {
            var registry = context.RequestServices.GetService<IDesignerUiExtensionRegistry>();
            var extensions = registry?.GetAll().ToArray() ?? Array.Empty<DesignerUiExtensionDefinition>();
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(extensions, new JsonSerializerOptions
            {
                WriteIndented = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            }));
        });

        endpoints.MapPost("/designer/extensions/data", async context =>
        {
            var registry = context.RequestServices.GetService<IDesignerUiExtensionRegistry>();
            if (registry == null)
            {
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                await context.Response.WriteAsync("Designer UI extension registry not available.");
                return;
            }

            var payload = await JsonSerializer.DeserializeAsync<ExtensionDataPayload>(context.Request.Body, cancellationToken: context.RequestAborted);
            if (payload == null || string.IsNullOrWhiteSpace(payload.IdOrGroup) || payload.Data == null)
            {
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                await context.Response.WriteAsync("Missing idOrGroup or data.");
                return;
            }

            registry.UpdateData(payload.IdOrGroup, payload.Data, payload.Merge);
            context.Response.StatusCode = StatusCodes.Status204NoContent;
        });

        endpoints.MapGet("/designer/preview/{projectId}", async context =>
        {
            var projectId = context.Request.RouteValues["projectId"]?.ToString();
            if (string.IsNullOrWhiteSpace(projectId))
            {
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                await context.Response.WriteAsync("Missing project.");
                return;
            }

            var target = $"/designer/ui/preview/{Uri.EscapeDataString(projectId)}";
            context.Response.Redirect(target, permanent: false);
        });

        endpoints.MapGet("/layout/{layoutId}", async context =>
        {
            var layoutId = context.Request.RouteValues["layoutId"]?.ToString();
            if (string.IsNullOrWhiteSpace(layoutId))
            {
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                await context.Response.WriteAsync("Missing layout.");
                return;
            }

            var store = context.RequestServices.GetService<DesignerLayoutStore>();
            if (store == null)
            {
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                await context.Response.WriteAsync("DesignerLayoutStore is not configured.");
                return;
            }

            var existingLayout = await store.ReadAsync(layoutId, context.RequestAborted);
            if (string.IsNullOrWhiteSpace(existingLayout))
            {
                context.Response.StatusCode = StatusCodes.Status404NotFound;
                await context.Response.WriteAsync("Layout not found.");
                return;
            }

            var target = $"/designer/ui/preview/{Uri.EscapeDataString(layoutId)}";
            context.Response.Redirect(target, permanent: false);
        });

        endpoints.MapGet("/designer/preview", async context =>
        {
            var projectId = context.Request.Query["project"].ToString();
            var sourceId = context.Request.Query["sourceId"].ToString();
            if (string.IsNullOrWhiteSpace(sourceId) && !string.IsNullOrWhiteSpace(projectId))
            {
                var target = $"/designer/ui/preview/{Uri.EscapeDataString(projectId)}";
                context.Response.Redirect(target, permanent: false);
                return;
            }

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

        endpoints.MapGet("/designer/layouts", async context =>
        {
            var limitRaw = context.Request.Query["limit"].ToString();
            var limit = 20;
            if (int.TryParse(limitRaw, out var parsedLimit) && parsedLimit > 0)
            {
                limit = Math.Min(parsedLimit, 100);
            }

            var store = context.RequestServices.GetService<DesignerLayoutStore>();
            if (store == null)
            {
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                await context.Response.WriteAsync("DesignerLayoutStore is not configured.");
                return;
            }

            var layouts = await store.ListAsync(limit, context.RequestAborted);
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(layouts, new JsonSerializerOptions
            {
                WriteIndented = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            }));
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

        endpoints.MapGet("/designer/autosave", async context =>
        {
            var sessionId = context.Request.Query["sessionId"].ToString();
            if (string.IsNullOrWhiteSpace(sessionId))
            {
                sessionId = "default";
            }

            var store = context.RequestServices.GetService<DesignerAutosaveStore>();
            if (store == null)
            {
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                await context.Response.WriteAsync("DesignerAutosaveStore is not configured.");
                return;
            }

            var json = await store.ReadAsync(sessionId, context.RequestAborted);
            if (string.IsNullOrWhiteSpace(json))
            {
                context.Response.StatusCode = StatusCodes.Status204NoContent;
                return;
            }

            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(json);
        });

        endpoints.MapPost("/designer/autosave", async context =>
        {
            var sessionId = context.Request.Query["sessionId"].ToString();
            if (string.IsNullOrWhiteSpace(sessionId))
            {
                sessionId = "default";
            }

            var store = context.RequestServices.GetService<DesignerAutosaveStore>();
            if (store == null)
            {
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                await context.Response.WriteAsync("DesignerAutosaveStore is not configured.");
                return;
            }

            using var reader = new StreamReader(context.Request.Body);
            var json = await reader.ReadToEndAsync();
            if (string.IsNullOrWhiteSpace(json))
            {
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                await context.Response.WriteAsync("Missing autosave payload.");
                return;
            }

            var projectName = context.Request.Query["projectName"].ToString();
            projectName = string.IsNullOrWhiteSpace(projectName) ? null : projectName;
            await store.WriteAsync(sessionId, json, projectName, context.RequestAborted);
            context.Response.StatusCode = StatusCodes.Status204NoContent;
        });
    }
}
