namespace Core.DataSources;

public interface IDataSourceProvider
{
    string SourceId { get; }
    Task<object?> GetPreviewAsync(CancellationToken cancellationToken);
}

