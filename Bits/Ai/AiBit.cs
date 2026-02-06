using StreamCraft.Core.Bits;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using System.Text.Json;

namespace StreamCraft.Bits.Ai;

[BitRoute("/ai")]
[HasUserInterface]
public sealed class AiBit : ConfigurableBit<AiBitState, AiBitConfig>, IValidateConfiguration
{
    public override string Name => "AI Gateway";
    public override string Description => "Configuration for the AI engine gateway and theme generation.";

    public override IReadOnlyList<BitConfigurationSection> GetConfigurationSections()
    {
        var providers = Context?.ServiceProvider
            .GetService<AiProviderRegistry>()
            ?.ListProviders()
            ?? new List<AiProviderDescriptor> { new(AiProviderDefaults.DefaultProviderId, "OpenAI") };

        var providerOptions = providers
            .Select(p => new BitConfigurationOption(p.Id, p.Name))
            .ToList();

        var providerId = !string.IsNullOrWhiteSpace(Configuration.ProviderId)
            ? Configuration.ProviderId!
            : AiProviderDefaults.DefaultProviderId;

        var modelOptions = new List<BitConfigurationOption>();
        var defaultModel = AiEnvironment.GetDefaultModel();
        var providerRegistry = Context?.ServiceProvider.GetService<AiProviderRegistry>();
        if (providerRegistry != null)
        {
            try
            {
                var provider = providerRegistry.GetProvider(providerId);
                defaultModel = provider.GetDefaultModel();
                modelOptions = provider.ListModels()
                    .Select(model => new BitConfigurationOption(model, model))
                    .ToList();
            }
            catch
            {
            }
        }

        if (modelOptions.Count == 0)
        {
            modelOptions = AiEnvironment.GetConfiguredModels()
                .Select(model => new BitConfigurationOption(model, model))
                .ToList();
        }

        if (modelOptions.All(option => !string.Equals(option.Value, defaultModel, StringComparison.OrdinalIgnoreCase)))
        {
            modelOptions.Insert(0, new BitConfigurationOption(defaultModel, defaultModel));
        }

        var modelFieldType = modelOptions.Count > 0 ? "select" : "text";

        var boolOptions = new[]
        {
            new BitConfigurationOption("false", "Disabled"),
            new BitConfigurationOption("true", "Enabled (Dev Only)")
        };

        return new[]
        {
            new BitConfigurationSection(
                id: "engine",
                title: "AI Engine",
                description: "Configure provider, access token, and target model used by the AI gateway.",
                fields: new[]
                {
                    new BitConfigurationField(
                        key: "ProviderId",
                        label: "Provider",
                        type: "select",
                        description: "AI provider used by the gateway.",
                        defaultValue: AiProviderDefaults.DefaultProviderId,
                        required: true,
                        options: providerOptions
                    ),
                    new BitConfigurationField(
                        key: "AccessToken",
                        label: "Access Token",
                        type: "password",
                        description: "Access token for the selected provider.",
                        placeholder: "sk-...",
                        required: false
                    ),
                    new BitConfigurationField(
                        key: "TargetModel",
                        label: "Target Model",
                        type: modelFieldType,
                        description: "Model identifier used for requests.",
                        placeholder: defaultModel,
                        defaultValue: defaultModel,
                        required: false,
                        options: modelOptions
                    )
                }),
            new BitConfigurationSection(
                id: "free-tier",
                title: "ChatGPT Free Tier (Dev Only)",
                description: "Use browser-extracted tokens to call the ChatGPT free tier endpoint. Tokens expire quickly.",
                fields: new[]
                {
                    new BitConfigurationField(
                        key: "UseFreeTier",
                        label: "Use Free Tier",
                        type: "select",
                        description: "Enable the ChatGPT free tier provider (development only).",
                        defaultValue: "false",
                        required: false,
                        options: boolOptions
                    ),
                    new BitConfigurationField(
                        key: "FreeTierChatRequirementsToken",
                        label: "openai-sentinel-chat-requirements-token",
                        type: "password",
                        description: "Required header value for ChatGPT free tier.",
                        required: false
                    ),
                    new BitConfigurationField(
                        key: "FreeTierProofToken",
                        label: "openai-sentinel-proof-token",
                        type: "password",
                        description: "Required header value for ChatGPT free tier.",
                        required: false
                    ),
                    new BitConfigurationField(
                        key: "FreeTierTurnstileToken",
                        label: "openai-sentinel-turnstile-token",
                        type: "password",
                        description: "Required header value for ChatGPT free tier.",
                        required: false
                    ),
                    new BitConfigurationField(
                        key: "FreeTierConduitToken",
                        label: "x-conduit-token",
                        type: "password",
                        description: "Required header value for ChatGPT free tier.",
                        required: false
                    )
                })
        };
    }

    protected override async Task HandleBitRequestAsync(HttpContext httpContext)
    {
        var status = new
        {
            name = Name,
            route = Route,
            provider = Configuration.ProviderId,
            targetModel = Configuration.TargetModel,
            updatedUtc = State.LastUpdatedUtc
        };

        httpContext.Response.ContentType = "application/json";
        await httpContext.Response.WriteAsync(JsonSerializer.Serialize(status, JsonOptions));
    }

    protected override IReadOnlyDictionary<string, object?> BuildConfigurationValueMap()
    {
        return new Dictionary<string, object?>
        {
            ["ProviderId"] = Configuration.ProviderId ?? string.Empty,
            ["AccessToken"] = Configuration.AccessToken ?? string.Empty,
            ["TargetModel"] = Configuration.TargetModel ?? string.Empty,
            ["UseFreeTier"] = Configuration.UseFreeTier ? "true" : "false",
            ["FreeTierChatRequirementsToken"] = Configuration.FreeTierChatRequirementsToken ?? string.Empty,
            ["FreeTierProofToken"] = Configuration.FreeTierProofToken ?? string.Empty,
            ["FreeTierTurnstileToken"] = Configuration.FreeTierTurnstileToken ?? string.Empty,
            ["FreeTierConduitToken"] = Configuration.FreeTierConduitToken ?? string.Empty
        };
    }

    protected override async Task<bool> OnConfigurationUpdateAsync(JsonElement root)
    {
        var updated = false;

        var configStore = Context?.ServiceProvider.GetService<IAiConfigStore>();
        var current = configStore != null
            ? await configStore.GetAsync(CancellationToken.None)
            : new AiProviderConfig(Configuration.ProviderId ?? AiProviderDefaults.DefaultProviderId, Configuration.AccessToken, Configuration.TargetModel);

        var providerId = current.ProviderId;
        var accessToken = current.AccessToken;
        var targetModel = current.TargetModel;
        var useFreeTier = Configuration.UseFreeTier;
        var chatReqToken = Configuration.FreeTierChatRequirementsToken;
        var proofToken = Configuration.FreeTierProofToken;
        var turnstileToken = Configuration.FreeTierTurnstileToken;
        var conduitToken = Configuration.FreeTierConduitToken;

        if (root.TryGetProperty("ProviderId", out var providerProp) && providerProp.ValueKind == JsonValueKind.String)
        {
            var nextProvider = providerProp.GetString()?.Trim();
            if (!string.IsNullOrWhiteSpace(nextProvider))
            {
                providerId = nextProvider;
                updated = true;
            }
        }

        if (root.TryGetProperty("AccessToken", out var tokenProp) && tokenProp.ValueKind == JsonValueKind.String)
        {
            var nextToken = tokenProp.GetString();
            accessToken = string.IsNullOrWhiteSpace(nextToken) ? null : nextToken.Trim();
            updated = true;
        }

        if (root.TryGetProperty("TargetModel", out var modelProp) && modelProp.ValueKind == JsonValueKind.String)
        {
            var model = modelProp.GetString()?.Trim();
            targetModel = string.IsNullOrWhiteSpace(model) ? null : model;
            updated = true;
        }

        if (root.TryGetProperty("UseFreeTier", out var freeTierProp))
        {
            var parsed = TryParseBool(freeTierProp);
            if (parsed.HasValue)
            {
                useFreeTier = parsed.Value;
                updated = true;
            }
        }

        if (root.TryGetProperty("FreeTierChatRequirementsToken", out var chatReqProp) && chatReqProp.ValueKind == JsonValueKind.String)
        {
            chatReqToken = NormalizeToken(chatReqProp.GetString());
            updated = true;
        }

        if (root.TryGetProperty("FreeTierProofToken", out var proofProp) && proofProp.ValueKind == JsonValueKind.String)
        {
            proofToken = NormalizeToken(proofProp.GetString());
            updated = true;
        }

        if (root.TryGetProperty("FreeTierTurnstileToken", out var turnstileProp) && turnstileProp.ValueKind == JsonValueKind.String)
        {
            turnstileToken = NormalizeToken(turnstileProp.GetString());
            updated = true;
        }

        if (root.TryGetProperty("FreeTierConduitToken", out var conduitProp) && conduitProp.ValueKind == JsonValueKind.String)
        {
            conduitToken = NormalizeToken(conduitProp.GetString());
            updated = true;
        }

        if (updated)
        {
            Configuration.ProviderId = providerId;
            Configuration.AccessToken = accessToken;
            Configuration.TargetModel = targetModel;
            Configuration.UseFreeTier = useFreeTier;
            Configuration.FreeTierChatRequirementsToken = chatReqToken;
            Configuration.FreeTierProofToken = proofToken;
            Configuration.FreeTierTurnstileToken = turnstileToken;
            Configuration.FreeTierConduitToken = conduitToken;

            if (configStore != null)
            {
                var metadata = BuildMetadata(Configuration);
                await configStore.SaveAsync(new AiProviderConfig(providerId, accessToken, targetModel, metadata), CancellationToken.None);
            }

            State.LastUpdatedUtc = DateTime.UtcNow;
            State.ProviderId = Configuration.ProviderId;
            State.TargetModel = Configuration.TargetModel;
        }

        return updated;
    }

    public async Task<ConfigurationValidationResult> ValidateConfigurationAsync(JsonElement payload, CancellationToken cancellationToken)
    {
        var providerRegistry = Context?.ServiceProvider.GetService<AiProviderRegistry>();
        if (providerRegistry == null)
        {
            return new ConfigurationValidationResult(false, "AI provider registry is unavailable.");
        }

        var configStore = Context?.ServiceProvider.GetService<IAiConfigStore>();
        var current = configStore != null
            ? await configStore.GetAsync(cancellationToken)
            : new AiProviderConfig(
                Configuration.ProviderId ?? AiProviderDefaults.DefaultProviderId,
                Configuration.AccessToken,
                Configuration.TargetModel);

        var providerId = current.ProviderId;
        var accessToken = current.AccessToken;
        var targetModel = current.TargetModel;

        if (payload.TryGetProperty("ProviderId", out var providerProp) && providerProp.ValueKind == JsonValueKind.String)
        {
            var nextProvider = providerProp.GetString()?.Trim();
            if (!string.IsNullOrWhiteSpace(nextProvider))
            {
                providerId = nextProvider;
            }
        }

        if (payload.TryGetProperty("AccessToken", out var tokenProp) && tokenProp.ValueKind == JsonValueKind.String)
        {
            var nextToken = tokenProp.GetString();
            accessToken = string.IsNullOrWhiteSpace(nextToken) ? null : nextToken.Trim();
        }

        if (payload.TryGetProperty("TargetModel", out var modelProp) && modelProp.ValueKind == JsonValueKind.String)
        {
            var model = modelProp.GetString()?.Trim();
            targetModel = string.IsNullOrWhiteSpace(model) ? null : model;
        }

        try
        {
            var provider = providerRegistry.GetProvider(providerId);
            var result = await provider.ValidateConfigurationAsync(
                new AiProviderConfig(provider.Id, accessToken, targetModel),
                cancellationToken);
            return new ConfigurationValidationResult(result.Ok, result.Message);
        }
        catch (Exception ex)
        {
            return new ConfigurationValidationResult(false, ex.Message);
        }
    }

    protected override void OnInitialize()
    {
        base.OnInitialize();

        var configStore = Context?.ServiceProvider.GetService<IAiConfigStore>();
        if (configStore != null)
        {
            try
            {
                var config = configStore.GetAsync(CancellationToken.None).GetAwaiter().GetResult();
                var hasLocalConfig = !string.IsNullOrWhiteSpace(Configuration.AccessToken) ||
                                     !string.IsNullOrWhiteSpace(Configuration.TargetModel) ||
                                     !string.IsNullOrWhiteSpace(Configuration.ProviderId);
                var isEmptyStore = string.Equals(config.ProviderId, AiProviderDefaults.DefaultProviderId, StringComparison.OrdinalIgnoreCase) &&
                                   string.IsNullOrWhiteSpace(config.AccessToken) &&
                                   string.IsNullOrWhiteSpace(config.TargetModel);

                if (isEmptyStore && hasLocalConfig)
                {
                    var providerId = string.IsNullOrWhiteSpace(Configuration.ProviderId)
                        ? AiProviderDefaults.DefaultProviderId
                        : Configuration.ProviderId!;
                    var accessToken = string.IsNullOrWhiteSpace(Configuration.AccessToken) ? null : Configuration.AccessToken;
                    var targetModel = string.IsNullOrWhiteSpace(Configuration.TargetModel) ? null : Configuration.TargetModel;
                    config = new AiProviderConfig(providerId, accessToken, targetModel);
                    configStore.SaveAsync(config, CancellationToken.None).GetAwaiter().GetResult();
                }

                ApplyProviderConfig(config);
                State.ProviderId = Configuration.ProviderId;
                State.TargetModel = Configuration.TargetModel;
            }
            catch
            {
            }
        }
    }

    private void ApplyProviderConfig(AiProviderConfig config)
    {
        Configuration.ProviderId = config.ProviderId;
        Configuration.AccessToken = config.AccessToken;
        Configuration.TargetModel = config.TargetModel;

        if (config.Metadata.HasValue && config.Metadata.Value.ValueKind == JsonValueKind.Object)
        {
            var metadata = config.Metadata.Value;
            Configuration.UseFreeTier = metadata.TryGetProperty("useFreeTier", out var freeTierProp) &&
                                        freeTierProp.ValueKind == JsonValueKind.True;
            Configuration.FreeTierChatRequirementsToken = ReadMetadataString(metadata, "openai-sentinel-chat-requirements-token");
            Configuration.FreeTierProofToken = ReadMetadataString(metadata, "openai-sentinel-proof-token");
            Configuration.FreeTierTurnstileToken = ReadMetadataString(metadata, "openai-sentinel-turnstile-token");
            Configuration.FreeTierConduitToken = ReadMetadataString(metadata, "x-conduit-token");
        }
        else
        {
            Configuration.UseFreeTier = false;
            Configuration.FreeTierChatRequirementsToken = null;
            Configuration.FreeTierProofToken = null;
            Configuration.FreeTierTurnstileToken = null;
            Configuration.FreeTierConduitToken = null;
        }
    }

    private static JsonElement? BuildMetadata(AiBitConfig config)
    {
        var metadata = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
        if (config.UseFreeTier)
        {
            metadata["useFreeTier"] = true;
        }

        AddMetadata(metadata, "openai-sentinel-chat-requirements-token", config.FreeTierChatRequirementsToken);
        AddMetadata(metadata, "openai-sentinel-proof-token", config.FreeTierProofToken);
        AddMetadata(metadata, "openai-sentinel-turnstile-token", config.FreeTierTurnstileToken);
        AddMetadata(metadata, "x-conduit-token", config.FreeTierConduitToken);

        if (metadata.Count == 0)
        {
            return null;
        }

        var json = JsonSerializer.Serialize(metadata);
        return JsonSerializer.Deserialize<JsonElement>(json);
    }

    private static void AddMetadata(IDictionary<string, object?> metadata, string key, string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return;
        }

        metadata[key] = value.Trim();
    }

    private static string? ReadMetadataString(JsonElement metadata, string key)
    {
        if (metadata.TryGetProperty(key, out var value) && value.ValueKind == JsonValueKind.String)
        {
            return value.GetString();
        }

        return null;
    }

    private static bool? TryParseBool(JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.True) return true;
        if (element.ValueKind == JsonValueKind.False) return false;
        if (element.ValueKind == JsonValueKind.String && bool.TryParse(element.GetString(), out var parsed)) return parsed;
        return null;
    }

    private static string? NormalizeToken(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }
}



