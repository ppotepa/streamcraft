namespace Core.DataSources;

public interface IApiSourceRegistry
{
    IReadOnlyList<IPublicApiDataSource> GetAll();
    void Register(IPublicApiDataSource source);
    void RegisterRange(IEnumerable<IPublicApiDataSource> sources);
}

public sealed class ApiSourceRegistry : IApiSourceRegistry, IDataSourceRegistry
{
    private readonly List<IDataSource> _sources = new();

    public IReadOnlyList<IPublicApiDataSource> GetAll() => _sources.OfType<IPublicApiDataSource>().ToArray();

    public void Register(IPublicApiDataSource source)
    {
        ((IDataSourceRegistry)this).Register(source);
    }

    public void RegisterRange(IEnumerable<IPublicApiDataSource> sources)
    {
        ((IDataSourceRegistry)this).RegisterRange(sources);
    }

    IReadOnlyList<IDataSource> IDataSourceRegistry.GetAll() => _sources.AsReadOnly();

    void IDataSourceRegistry.Register(IDataSource source)
    {
        if (source == null) return;
        DataSourceCategoryResolver.Validate(source);
        if (_sources.Any(s => string.Equals(s.Id, source.Id, StringComparison.OrdinalIgnoreCase)))
        {
            return;
        }

        _sources.Add(source);
    }

    void IDataSourceRegistry.RegisterRange(IEnumerable<IDataSource> sources)
    {
        if (sources == null) return;
        foreach (var source in sources)
        {
            ((IDataSourceRegistry)this).Register(source);
        }
    }
}

