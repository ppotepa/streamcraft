namespace StreamCraft.Core.Runtime.Preview;

public interface IDataSourceProvider
{
    string SourceId { get; }
    Task<object?> GetPreviewAsync(CancellationToken cancellationToken);
}





