namespace StreamCraft.Core.Runtime.Chat;

public sealed class ChatSourceHistoryProviderRegistry : IChatSourceHistoryProviderRegistry
{
    private readonly List<IChatSourceHistoryProvider> _providers = new();

    public IReadOnlyList<IChatSourceHistoryProvider> GetAll() => _providers.AsReadOnly();

    public IChatSourceHistoryProvider? Get(string sourceId)
    {
        if (string.IsNullOrWhiteSpace(sourceId))
        {
            return null;
        }

        return _providers.FirstOrDefault(p => string.Equals(p.SourceId, sourceId, StringComparison.OrdinalIgnoreCase));
    }

    public void Register(IChatSourceHistoryProvider provider)
    {
        if (provider == null)
        {
            return;
        }

        if (_providers.Any(p => string.Equals(p.SourceId, provider.SourceId, StringComparison.OrdinalIgnoreCase)))
        {
            return;
        }

        _providers.Add(provider);
    }

    public void RegisterRange(IEnumerable<IChatSourceHistoryProvider> providers)
    {
        if (providers == null)
        {
            return;
        }

        foreach (var provider in providers)
        {
            Register(provider);
        }
    }
}

