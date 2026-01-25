using Microsoft.AspNetCore.Http;
using System.Text.Json;
using StreamCraft.Core.Utilities;

namespace StreamCraft.Core.Bits;

/// <summary>
/// Base class for bits that support user configuration
/// Provides automatic handling of:
/// - Config schema/value endpoints
/// - Config persistence (JSON files)
/// - UI asset serving from dist/ folder
/// </summary>
public abstract class ConfigurableBit<TState, TConfig> : StreamBit<TState>, IBitConfiguration<TConfig>
    where TState : IBitState, new()
    where TConfig : class, IConfigurationModel, new()
{
    protected static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true
    };

    private string _configPath = string.Empty;

    public TConfig Configuration { get; protected set; } = new();

    public abstract IReadOnlyList<BitConfigurationSection> GetConfigurationSections();

    protected override void OnInitialize()
    {
        base.OnInitialize();
        _configPath = GetConfigPath();
        Configuration = LoadConfiguration();
    }

    public override async Task HandleAsync(HttpContext httpContext)
    {
        if (IsConfigRequest(httpContext.Request.Path))
        {
            await HandleConfigAsync(httpContext);
            return;
        }

        await HandleBitRequestAsync(httpContext);
    }

    protected abstract Task HandleBitRequestAsync(HttpContext httpContext);

    public override async Task HandleUIAsync(HttpContext httpContext)
    {
        var assemblyLocation = Path.GetDirectoryName(GetType().Assembly.Location);
        var uiRoot = Path.Combine(assemblyLocation!, "ui", "dist");
        var requestPath = httpContext.Request.Path.Value ?? string.Empty;

        var routePrefix = (Route ?? string.Empty).TrimEnd('/');
        var relativePath = requestPath;
        if (!string.IsNullOrEmpty(routePrefix) && requestPath.StartsWith(routePrefix, StringComparison.OrdinalIgnoreCase))
        {
            relativePath = requestPath[routePrefix.Length..];
        }

        relativePath = relativePath.TrimStart('/');
        if (string.IsNullOrEmpty(relativePath) || relativePath.Equals("ui", StringComparison.OrdinalIgnoreCase))
        {
            relativePath = "index.html";
        }
        else if (relativePath.StartsWith("ui/", StringComparison.OrdinalIgnoreCase))
        {
            relativePath = relativePath[3..];
        }

        if (relativePath.Contains("..", StringComparison.Ordinal))
        {
            httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await httpContext.Response.WriteAsync("Invalid UI asset path.");
            return;
        }

        var filePath = Path.Combine(uiRoot, relativePath);

        if (File.Exists(filePath))
        {
            httpContext.Response.ContentType = MimeTypeHelper.GetContentType(filePath);
            await httpContext.Response.SendFileAsync(filePath);
        }
        else
        {
            httpContext.Response.StatusCode = 404;
            await httpContext.Response.WriteAsync($"UI file not found: {relativePath}");
        }
    }

    private async Task HandleConfigAsync(HttpContext httpContext)
    {
        var subPath = GetConfigSubPath(httpContext.Request.Path);
        var method = httpContext.Request.Method;

        if (method.Equals("GET", StringComparison.OrdinalIgnoreCase))
        {
            if (string.Equals(subPath, "schema", StringComparison.OrdinalIgnoreCase))
            {
                await RespondWithConfigSchemaAsync(httpContext);
                return;
            }

            if (string.Equals(subPath, "value", StringComparison.OrdinalIgnoreCase))
            {
                await RespondWithConfigValuesAsync(httpContext);
                return;
            }
        }
        else if (method.Equals("POST", StringComparison.OrdinalIgnoreCase) &&
                 string.Equals(subPath, "value", StringComparison.OrdinalIgnoreCase))
        {
            await UpdateConfigValuesAsync(httpContext);
            return;
        }

        httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
        await httpContext.Response.WriteAsync("Config resource not found.");
    }

    private bool IsConfigRequest(PathString path)
    {
        var basePath = $"{Route}/config";
        return path.HasValue && path.Value!.StartsWith(basePath, StringComparison.OrdinalIgnoreCase);
    }

    private string GetConfigSubPath(PathString path)
    {
        var basePath = $"{Route}/config";
        var value = path.Value ?? string.Empty;

        if (!value.StartsWith(basePath, StringComparison.OrdinalIgnoreCase))
        {
            return string.Empty;
        }

        if (value.Length == basePath.Length)
        {
            return string.Empty;
        }

        return value.Substring(basePath.Length).TrimStart('/');
    }

    private async Task RespondWithConfigSchemaAsync(HttpContext httpContext)
    {
        var payload = new
        {
            name = Name,
            description = Description,
            route = Route,
            sections = GetConfigurationSections()
        };
        httpContext.Response.ContentType = "application/json";
        await httpContext.Response.WriteAsync(JsonSerializer.Serialize(payload, JsonOptions));
    }

    private async Task RespondWithConfigValuesAsync(HttpContext httpContext)
    {
        var values = BuildConfigurationValueMap();
        httpContext.Response.ContentType = "application/json";
        await httpContext.Response.WriteAsync(JsonSerializer.Serialize(values, JsonOptions));
    }

    private async Task UpdateConfigValuesAsync(HttpContext httpContext)
    {
        try
        {
            using var document = await JsonDocument.ParseAsync(httpContext.Request.Body);
            var root = document.RootElement;

            var updated = await OnConfigurationUpdateAsync(root);

            if (!updated)
            {
                httpContext.Response.StatusCode = StatusCodes.Status204NoContent;
                return;
            }

            PersistConfiguration();
            await OnConfigurationPersistedAsync();

            httpContext.Response.StatusCode = StatusCodes.Status204NoContent;
        }
        catch (JsonException)
        {
            httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await httpContext.Response.WriteAsync("Invalid JSON payload.");
        }
        catch (ArgumentException ex)
        {
            httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await httpContext.Response.WriteAsync(ex.Message);
        }
    }

    protected abstract IReadOnlyDictionary<string, object?> BuildConfigurationValueMap();

    protected abstract Task<bool> OnConfigurationUpdateAsync(JsonElement root);

    protected virtual Task OnConfigurationPersistedAsync()
    {
        return Task.CompletedTask;
    }

    private string GetConfigPath()
    {
        var assemblyDir = Path.GetDirectoryName(GetType().Assembly.Location) ?? AppContext.BaseDirectory;
        var configDir = Path.Combine(assemblyDir, "config");
        Directory.CreateDirectory(configDir);
        return Path.Combine(configDir, "config.json");
    }

    protected TConfig LoadConfiguration()
    {
        if (!File.Exists(_configPath))
        {
            return CreateDefaultConfiguration();
        }

        try
        {
            var json = File.ReadAllText(_configPath);
            return DeserializeConfiguration(json) ?? CreateDefaultConfiguration();
        }
        catch
        {
            return CreateDefaultConfiguration();
        }
    }

    protected virtual TConfig DeserializeConfiguration(string json)
    {
        return JsonSerializer.Deserialize<TConfig>(json, JsonOptions) ?? new TConfig();
    }

    protected virtual TConfig CreateDefaultConfiguration()
    {
        return new TConfig();
    }

    protected void PersistConfiguration()
    {
        try
        {
            var directory = Path.GetDirectoryName(_configPath);
            if (!string.IsNullOrEmpty(directory))
            {
                Directory.CreateDirectory(directory);
            }

            var json = JsonSerializer.Serialize(Configuration, JsonOptions);
            File.WriteAllText(_configPath, json);
        }
        catch
        {
            // Swallow persistence errors
        }
    }

    protected static int? TryParseInt(JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.Number && element.TryGetInt32(out var number))
        {
            return number;
        }

        if (element.ValueKind == JsonValueKind.String && int.TryParse(element.GetString(), out var parsed))
        {
            return parsed;
        }

        return null;
    }
}
