namespace Core.Designer;

public interface IDataSource
{
    string Id { get; }
    string Name { get; }
    string Description { get; }
    string Kind { get; }
}
