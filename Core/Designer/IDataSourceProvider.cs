namespace Core.Designer;

public interface IDataSourceProvider
{
    string SourceId { get; }
    Task<object?> GetPreviewAsync(CancellationToken cancellationToken);
}
