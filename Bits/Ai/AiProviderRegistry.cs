namespace StreamCraft.Bits.Ai;

public sealed class AiProviderRegistry
{
    private readonly Dictionary<string, IAiProvider> _providers;

    public AiProviderRegistry(IEnumerable<IAiProvider> providers)
    {
        _providers = providers?
            .GroupBy(p => p.Id, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.First())
            .ToDictionary(p => p.Id, StringComparer.OrdinalIgnoreCase)
            ?? new Dictionary<string, IAiProvider>(StringComparer.OrdinalIgnoreCase);
    }

    public IAiProvider GetProvider(string? providerId)
    {
        if (!string.IsNullOrWhiteSpace(providerId) && _providers.TryGetValue(providerId.Trim(), out var provider))
        {
            return provider;
        }

        return _providers.Values.FirstOrDefault()
               ?? throw new InvalidOperationException("No AI providers registered.");
    }

    public IReadOnlyList<AiProviderDescriptor> ListProviders()
    {
        return _providers.Values
            .OrderBy(p => p.DisplayName, StringComparer.OrdinalIgnoreCase)
            .Select(p => new AiProviderDescriptor(p.Id, p.DisplayName))
            .ToList();
    }
}
