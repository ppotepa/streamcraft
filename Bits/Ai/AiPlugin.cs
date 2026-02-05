using System.Text.Json;
using StreamCraft.Core.Plugins;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging;

namespace StreamCraft.Bits.Ai;

public sealed class AiPlugin : IStreamCraftBit
{
    public void ConfigureServices(IServiceCollection services, BitContext context)
    {
        services.AddHttpClient<OpenAiProvider>();
        services.AddSingleton<IAiProvider, OpenAiProvider>();
        services.AddSingleton<AiProviderRegistry>();
        services.AddSingleton<IAiConfigStore, AiConfigStore>();
        services.AddSingleton<IAiMetapromptStore, AiMetapromptStore>();
        services.AddSingleton<IAiModelStore, AiModelStore>();
        services.AddSingleton<AiService>();
    }

    public void MapEndpoints(IEndpointRouteBuilder endpoints, BitContext context)
    {
        static async Task WriteJson(HttpContext httpContext, object payload)
        {
            httpContext.Response.ContentType = "application/json";
            await httpContext.Response.WriteAsync(JsonSerializer.Serialize(payload, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = true
            }));
        }

        static async Task WriteError(HttpContext httpContext, int statusCode, string error, string message, string? detail = null)
        {
            httpContext.Response.StatusCode = statusCode;
            await WriteJson(httpContext, new
            {
                error,
                message,
                detail
            });
        }

        endpoints.MapGet("/ai/status", async httpContext =>
        {
            try
            {
                var service = httpContext.RequestServices.GetRequiredService<AiService>();
                var status = await service.GetStatusAsync(httpContext.RequestAborted);
                await WriteJson(httpContext, status);
            }
            catch (Exception ex)
            {
                var logger = httpContext.RequestServices.GetService<ILogger<AiPlugin>>();
                logger?.LogError(ex, "AI status check failed.");
                await WriteError(httpContext, StatusCodes.Status500InternalServerError, "ai_status_error", "Failed to load AI status.", ex.Message);
            }
        });

        static async Task HandlePrompt(HttpContext httpContext)
        {
            AiPromptRequest? payload = null;
            try
            {
                payload = await JsonSerializer.DeserializeAsync<AiPromptRequest>(httpContext.Request.Body, cancellationToken: httpContext.RequestAborted);
            }
            catch
            {
            }

            if (payload == null || string.IsNullOrWhiteSpace(payload.Prompt))
            {
                await WriteError(httpContext, StatusCodes.Status400BadRequest, "missing_prompt", "Prompt is required.");
                return;
            }

            try
            {
                var service = httpContext.RequestServices.GetRequiredService<AiService>();
                var output = await service.RunPromptAsync(payload.Prompt, httpContext.RequestAborted);
                await WriteJson(httpContext, new
                {
                    output
                });
            }
            catch (Exception ex)
            {
                var logger = httpContext.RequestServices.GetService<ILogger<AiPlugin>>();
                logger?.LogError(ex, "AI prompt failed.");
                await WriteError(httpContext, StatusCodes.Status500InternalServerError, "ai_prompt_error", "AI prompt failed.", ex.Message);
            }
        }

        endpoints.MapPost("/ai/test", HandlePrompt);
        endpoints.MapPost("/ai/prompt", HandlePrompt);
        endpoints.MapPost("/ai", HandlePrompt);

        endpoints.MapGet("/ai/models", async httpContext =>
        {
            try
            {
                var store = httpContext.RequestServices.GetRequiredService<IAiModelStore>();
                var configStore = httpContext.RequestServices.GetRequiredService<IAiConfigStore>();
                var config = await configStore.GetAsync(httpContext.RequestAborted);
                var active = await store.GetActiveModelAsync(httpContext.RequestAborted);
                var list = store.ListModels();
                await WriteJson(httpContext, new
                {
                    provider = config.ProviderId,
                    activeModel = active,
                    models = list
                });
            }
            catch (Exception ex)
            {
                var logger = httpContext.RequestServices.GetService<ILogger<AiPlugin>>();
                logger?.LogError(ex, "AI model list failed.");
                await WriteError(httpContext, StatusCodes.Status500InternalServerError, "ai_models_error", "Failed to load AI models.", ex.Message);
            }
        });

        endpoints.MapPost("/ai/models", async httpContext =>
        {
            string? model = null;
            try
            {
                using var doc = await JsonDocument.ParseAsync(httpContext.Request.Body, cancellationToken: httpContext.RequestAborted);
                if (doc.RootElement.TryGetProperty("model", out var modelProp))
                {
                    model = modelProp.GetString();
                }
            }
            catch
            {
            }

            if (string.IsNullOrWhiteSpace(model))
            {
                await WriteError(httpContext, StatusCodes.Status400BadRequest, "missing_model", "Model is required.");
                return;
            }

            try
            {
                var store = httpContext.RequestServices.GetRequiredService<IAiModelStore>();
                await store.SetActiveModelAsync(model, httpContext.RequestAborted);
                await WriteJson(httpContext, new
                {
                    activeModel = model
                });
            }
            catch (Exception ex)
            {
                var logger = httpContext.RequestServices.GetService<ILogger<AiPlugin>>();
                logger?.LogError(ex, "AI model update failed.");
                await WriteError(httpContext, StatusCodes.Status500InternalServerError, "ai_model_error", "Failed to update AI model.", ex.Message);
            }
        });

        endpoints.MapPost("/ai/themes/generate", async httpContext =>
        {
            AiThemeRequest? payload = null;
            try
            {
                payload = await JsonSerializer.DeserializeAsync<AiThemeRequest>(httpContext.Request.Body, cancellationToken: httpContext.RequestAborted);
            }
            catch
            {
            }

            if (payload == null || string.IsNullOrWhiteSpace(payload.Prompt))
            {
                await WriteError(httpContext, StatusCodes.Status400BadRequest, "missing_prompt", "Prompt is required.");
                return;
            }

            try
            {
                var service = httpContext.RequestServices.GetRequiredService<AiService>();
                var result = await service.GenerateThemeAsync(payload, httpContext.RequestAborted);
                await WriteJson(httpContext, result);
            }
            catch (Exception ex)
            {
                var logger = httpContext.RequestServices.GetService<ILogger<AiPlugin>>();
                logger?.LogError(ex, "AI theme generation failed.");
                await WriteError(httpContext, StatusCodes.Status500InternalServerError, "ai_theme_error", "AI theme generation failed.", ex.Message);
            }
        });

        var uiRoot = TryResolveUiRoot(context.BitDirectory);
        if (!string.IsNullOrWhiteSpace(uiRoot) && endpoints is IApplicationBuilder appBuilder)
        {
            appBuilder.Map("/ai/ui", uiApp => ConfigureUiStaticFiles(uiApp, uiRoot));
        }
        else
        {
            endpoints.MapGet("/ai/ui", async httpContext =>
            {
                httpContext.Response.ContentType = "text/html; charset=utf-8";
                await httpContext.Response.WriteAsync(AiUiMarkup.Html);
            });
        }
    }

    private static string? TryResolveUiRoot(string bitDirectory)
    {
        if (string.IsNullOrWhiteSpace(bitDirectory))
        {
            return null;
        }

        var distPath = Path.Combine(bitDirectory, "ui", "dist");
        if (Directory.Exists(distPath))
        {
            return distPath;
        }

        var uiPath = Path.Combine(bitDirectory, "ui");
        return Directory.Exists(uiPath) ? uiPath : null;
    }

    private static void ConfigureUiStaticFiles(IApplicationBuilder app, string uiRoot)
    {
        var fileProvider = new PhysicalFileProvider(uiRoot);

        app.UseDefaultFiles(new DefaultFilesOptions
        {
            FileProvider = fileProvider
        });

        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = fileProvider
        });

        app.Run(async context =>
        {
            if (!Path.HasExtension(context.Request.Path.Value ?? string.Empty))
            {
                var indexPath = Path.Combine(uiRoot, "index.html");
                if (File.Exists(indexPath))
                {
                    context.Response.ContentType = "text/html";
                    await context.Response.SendFileAsync(indexPath);
                    return;
                }
            }

            context.Response.StatusCode = StatusCodes.Status404NotFound;
            await context.Response.WriteAsync("UI file not found.");
        });
    }
}




