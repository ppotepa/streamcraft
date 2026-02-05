namespace StreamCraft.Bits.Ai;

public interface IAiModelStore
{
    Task<string> GetActiveModelAsync(CancellationToken cancellationToken);
    Task SetActiveModelAsync(string model, CancellationToken cancellationToken);
    IReadOnlyList<string> ListModels();
}

public sealed class AiModelStore : IAiModelStore
{
    private readonly IAiConfigStore _configStore;
    private readonly AiProviderRegistry _providerRegistry;

    public AiModelStore(IAiConfigStore configStore, AiProviderRegistry providerRegistry)
    {
        _configStore = configStore;
        _providerRegistry = providerRegistry;
    }

    public IReadOnlyList<string> ListModels()
    {
        var config = _configStore.GetAsync(CancellationToken.None).GetAwaiter().GetResult();
        var provider = _providerRegistry.GetProvider(config.ProviderId);
        return provider.ListModels().ToArray();
    }

    public async Task<string> GetActiveModelAsync(CancellationToken cancellationToken)
    {
        var config = await _configStore.GetAsync(cancellationToken);
        var provider = _providerRegistry.GetProvider(config.ProviderId);
        if (string.IsNullOrWhiteSpace(config.TargetModel))
        {
            return provider.GetDefaultModel();
        }
        return config.TargetModel!.Trim();
    }

    public async Task SetActiveModelAsync(string model, CancellationToken cancellationToken)
    {
        var trimmed = (model ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
        {
            throw new InvalidOperationException("Model name is required.");
        }

        var config = await _configStore.GetAsync(cancellationToken);
        await _configStore.SaveAsync(config with { TargetModel = trimmed }, cancellationToken);
    }
}



