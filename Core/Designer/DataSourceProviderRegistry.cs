namespace Core.Designer;

public sealed class DataSourceProviderRegistry : IDataSourceProviderRegistry
{
    private readonly List<IDataSourceProvider> _providers = new();

    public IReadOnlyList<IDataSourceProvider> GetAll() => _providers.AsReadOnly();

    public IDataSourceProvider? Get(string sourceId)
    {
        if (string.IsNullOrWhiteSpace(sourceId)) return null;
        return _providers.FirstOrDefault(p => string.Equals(p.SourceId, sourceId, StringComparison.OrdinalIgnoreCase));
    }

    public void Register(IDataSourceProvider provider)
    {
        if (provider == null) return;
        if (_providers.Any(p => string.Equals(p.SourceId, provider.SourceId, StringComparison.OrdinalIgnoreCase)))
        {
            return;
        }

        _providers.Add(provider);
    }

    public void RegisterRange(IEnumerable<IDataSourceProvider> providers)
    {
        if (providers == null) return;
        foreach (var provider in providers)
        {
            Register(provider);
        }
    }
}
