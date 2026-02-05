namespace StreamCraft.Core.Runtime.Preview;

public interface IDataSourceProviderRegistry
{
    IReadOnlyList<IDataSourceProvider> GetAll();
    IDataSourceProvider? Get(string sourceId);
    void Register(IDataSourceProvider provider);
    void RegisterRange(IEnumerable<IDataSourceProvider> providers);
}





