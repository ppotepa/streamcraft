using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Core.Utilities;
using System.Text.Json;

namespace Core.Bits;

/// <summary>
/// Base class for bits that support user configuration
/// Provides automatic handling of:
/// - Config schema/value endpoints
/// - Config persistence (appsettings.json)
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

    private string _bitConfigKey = string.Empty;
    private IBitConfigStore? _configStore;

    public TConfig Configuration { get; protected set; } = new();

    public abstract IReadOnlyList<BitConfigurationSection> GetConfigurationSections();

    public bool RequiresConfiguration => GetType().GetCustomAttributes(typeof(RequiresConfigurationAttribute), false).Any();

    protected override void OnInitialize()
    {
        base.OnInitialize();
        _bitConfigKey = GetBitConfigKey();
        _configStore = Context?.ServiceProvider.GetService<IBitConfigStore>() ?? new FileBitConfigStore();
        Configuration = LoadConfiguration();
    }

    public override async Task HandleAsync(HttpContext httpContext)
    {
        if (IsConfigRequest(httpContext.Request.Path))
        {
            await HandleConfigAsync(httpContext);
            return;
        }

        // Check if configuration is required and missing
        if (RequiresConfiguration && !IsConfigured())
        {
            httpContext.Response.Redirect($"{Route}/config");
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
        var fullPath = Path.GetFullPath(filePath);
        var fullRoot = Path.GetFullPath(uiRoot) + Path.DirectorySeparatorChar;

        if (!fullPath.StartsWith(fullRoot, StringComparison.OrdinalIgnoreCase))
        {
            httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await httpContext.Response.WriteAsync("Invalid UI asset path.");
            return;
        }

        if (File.Exists(fullPath))
        {
            httpContext.Response.ContentType = MimeTypeHelper.GetContentType(fullPath);
            await httpContext.Response.SendFileAsync(fullPath);
            return;
        }

        var extension = Path.GetExtension(relativePath);
        if (string.IsNullOrEmpty(extension))
        {
            var indexPath = Path.Combine(uiRoot, "index.html");
            if (File.Exists(indexPath))
            {
                httpContext.Response.ContentType = "text/html";
                await httpContext.Response.SendFileAsync(indexPath);
                return;
            }
        }

        httpContext.Response.StatusCode = 404;
        await httpContext.Response.WriteAsync($"UI file not found: {relativePath}");
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

        return value[basePath.Length..].TrimStart('/');
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

            try
            {
                PersistConfiguration();
                ReloadConfiguration();
                await OnConfigurationPersistedAsync();
                httpContext.Response.StatusCode = StatusCodes.Status204NoContent;
            }
            catch (Exception ex)
            {
                Context?.Logger.Error(ex, "Failed to persist configuration for bit {BitName}", Name);
                httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
                await httpContext.Response.WriteAsync("Failed to persist configuration.");
            }
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

    private string GetBitConfigKey()
    {
        // Use lowercase bit name as config key (e.g., "sc2", "lol")
        return GetType().Name.Replace("Bit", "").ToLowerInvariant();
    }

    private bool IsConfigured()
    {
        if (_configStore?.Exists(_bitConfigKey) == true)
        {
            return true;
        }

        if (Context?.Configuration == null)
        {
            return false;
        }

        var configSection = Context.Configuration.GetSection($"StreamCraft:Bits:{_bitConfigKey}");
        return configSection.Exists();
    }

    protected TConfig LoadConfiguration()
    {
        try
        {
            if (_configStore != null)
            {
                var json = _configStore.Read(_bitConfigKey);
                if (!string.IsNullOrWhiteSpace(json))
                {
                    return DeserializeConfiguration(json);
                }
            }

            var fallback = LoadConfigurationFromAppSettings();
            if (fallback != null)
            {
                return fallback;
            }

            return CreateDefaultConfiguration();
        }
        catch (Exception ex)
        {
            Context?.Logger.Error(ex, "Failed to load configuration for bit {BitName}", Name);
            return CreateDefaultConfiguration();
        }
    }

    private void ReloadConfiguration()
    {
        Configuration = LoadConfiguration();
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
        if (_configStore == null)
        {
            throw new InvalidOperationException("Configuration store is not available.");
        }

        var json = JsonSerializer.Serialize(Configuration, JsonOptions);
        _configStore.Write(_bitConfigKey, json);
    }

    private TConfig? LoadConfigurationFromAppSettings()
    {
        if (Context?.Configuration == null)
        {
            return null;
        }

        var configSection = Context.Configuration.GetSection($"StreamCraft:Bits:{_bitConfigKey}");
        if (!configSection.Exists())
        {
            return null;
        }

        var config = new TConfig();
        configSection.Bind(config);
        return config;
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
