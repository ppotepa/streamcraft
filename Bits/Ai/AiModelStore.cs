using Core.Utilities;

namespace StreamCraft.Bits.Ai;

public interface IAiModelStore
{
    Task<string> GetActiveModelAsync(CancellationToken cancellationToken);
    Task SetActiveModelAsync(string model, CancellationToken cancellationToken);
    IReadOnlyList<string> ListModels();
}

public sealed class AiModelStore : IAiModelStore
{
    private const string ModelKey = "openai-model";
    private readonly IKeyVault _keyVault;

    public AiModelStore(IKeyVault keyVault)
    {
        _keyVault = keyVault;
    }

    public IReadOnlyList<string> ListModels()
    {
        var configured = AiEnvironment.GetConfiguredModels();
        return configured.ToArray();
    }

    public async Task<string> GetActiveModelAsync(CancellationToken cancellationToken)
    {
        var key = await _keyVault.GetAsync(ModelKey, AiEnvironment.GetEnvironment(), cancellationToken);
        if (string.IsNullOrWhiteSpace(key))
        {
            return AiEnvironment.GetDefaultModel();
        }
        return key.Trim();
    }

    public async Task SetActiveModelAsync(string model, CancellationToken cancellationToken)
    {
        var trimmed = (model ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
        {
            throw new InvalidOperationException("Model name is required.");
        }

        await _keyVault.SetAsync(ModelKey, trimmed, trimmed, trimmed, cancellationToken);
    }
}
