namespace Core.Designer;

public interface IApiSourceRegistry
{
    IReadOnlyList<IApiSource> GetAll();
    void Register(IApiSource source);
    void RegisterRange(IEnumerable<IApiSource> sources);
}

public sealed class ApiSourceRegistry : IApiSourceRegistry, IDataSourceRegistry
{
    private readonly List<IDataSource> _sources = new();

    public IReadOnlyList<IApiSource> GetAll() => _sources.OfType<IApiSource>().ToArray();

    public void Register(IApiSource source)
    {
        ((IDataSourceRegistry)this).Register(source);
    }

    public void RegisterRange(IEnumerable<IApiSource> sources)
    {
        ((IDataSourceRegistry)this).RegisterRange(sources);
    }

    IReadOnlyList<IDataSource> IDataSourceRegistry.GetAll() => _sources.AsReadOnly();

    void IDataSourceRegistry.Register(IDataSource source)
    {
        if (source == null) return;
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
