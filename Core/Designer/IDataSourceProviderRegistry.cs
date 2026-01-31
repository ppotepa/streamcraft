namespace Core.Designer;

public interface IDataSourceProviderRegistry
{
    IReadOnlyList<IDataSourceProvider> GetAll();
    IDataSourceProvider? Get(string sourceId);
    void Register(IDataSourceProvider provider);
    void RegisterRange(IEnumerable<IDataSourceProvider> providers);
}
