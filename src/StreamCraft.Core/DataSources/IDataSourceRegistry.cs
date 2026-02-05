namespace StreamCraft.Core.DataSources;

public interface IDataSourceRegistry
{
    IReadOnlyList<IDataSource> GetAll();
    void Register(IDataSource source);
    void RegisterRange(IEnumerable<IDataSource> sources);
}




