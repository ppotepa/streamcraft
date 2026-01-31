namespace Core.Designer;

public interface IApiSourceRegistry
{
    IReadOnlyList<IApiSource> GetAll();
    void Register(IApiSource source);
    void RegisterRange(IEnumerable<IApiSource> sources);
}

public sealed class ApiSourceRegistry : IApiSourceRegistry
{
    private readonly List<IApiSource> _sources = new();

    public IReadOnlyList<IApiSource> GetAll() => _sources.AsReadOnly();

    public void Register(IApiSource source)
    {
        if (source == null) return;
        if (_sources.Any(s => string.Equals(s.Id, source.Id, StringComparison.OrdinalIgnoreCase)))
        {
            return;
        }

        _sources.Add(source);
    }

    public void RegisterRange(IEnumerable<IApiSource> sources)
    {
        if (sources == null) return;
        foreach (var source in sources)
        {
            Register(source);
        }
    }
}
