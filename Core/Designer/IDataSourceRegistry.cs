namespace Core.Designer;

public interface IDataSourceRegistry
{
    IReadOnlyList<IDataSource> GetAll();
    void Register(IDataSource source);
    void RegisterRange(IEnumerable<IDataSource> sources);
}
