using Core.Bits;
using Microsoft.AspNetCore.Http;
using System.Text.Json;

namespace StreamCraft.Bits.Ai;

[BitRoute("/ai")]
public sealed class AiBit : ConfigurableBit<AiBitState, AiBitConfig>
{
    public override string Name => "AI Gateway";
    public override string Description => "Configuration for the AI engine gateway and theme generation.";

    public override IReadOnlyList<BitConfigurationSection> GetConfigurationSections()
    {
        return new[]
        {
            new BitConfigurationSection(
                id: "engine",
                title: "AI Engine",
                description: "These settings control the active model used by the AI gateway. API keys are managed in KeyVault.",
                fields: new[]
                {
                    new BitConfigurationField(
                        key: "ActiveModel",
                        label: "Active Model",
                        type: "text",
                        description: "Stored in KeyVault key \"openai-model\". Leave empty to keep the current KeyVault value.",
                        placeholder: AiEnvironment.GetDefaultModel(),
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
            activeModel = Configuration.ActiveModel,
            updatedUtc = State.LastUpdatedUtc
        };

        httpContext.Response.ContentType = "application/json";
        await httpContext.Response.WriteAsync(JsonSerializer.Serialize(status, JsonOptions));
    }

    protected override IReadOnlyDictionary<string, object?> BuildConfigurationValueMap()
    {
        return new Dictionary<string, object?>
        {
            ["ActiveModel"] = Configuration.ActiveModel ?? string.Empty
        };
    }

    protected override async Task<bool> OnConfigurationUpdateAsync(JsonElement root)
    {
        var updated = false;

        if (root.TryGetProperty("ActiveModel", out var modelProp) && modelProp.ValueKind == JsonValueKind.String)
        {
            var model = modelProp.GetString()?.Trim();
            if (!string.IsNullOrWhiteSpace(model))
            {
                Configuration.ActiveModel = model;
                updated = true;

                var store = Context?.ServiceProvider.GetService(typeof(IAiModelStore)) as IAiModelStore;
                if (store != null)
                {
                    await store.SetActiveModelAsync(model, CancellationToken.None);
                }
            }
        }

        if (updated)
        {
            State.LastUpdatedUtc = DateTime.UtcNow;
            State.ActiveModel = Configuration.ActiveModel;
        }

        return updated;
    }

    protected override void OnInitialize()
    {
        base.OnInitialize();

        var store = Context?.ServiceProvider.GetService(typeof(IAiModelStore)) as IAiModelStore;
        if (store != null && string.IsNullOrWhiteSpace(Configuration.ActiveModel))
        {
            try
            {
                Configuration.ActiveModel = store.GetActiveModelAsync(CancellationToken.None).GetAwaiter().GetResult();
                State.ActiveModel = Configuration.ActiveModel;
            }
            catch
            {
            }
        }
    }
}
