using Core.DataSources;

namespace StreamCraft.Bits.SystemDataSources;

public sealed class OnDemandPreviewProvider : IDataSourceProvider
{
    private readonly Func<CancellationToken, Task<object?>> _factory;

    public OnDemandPreviewProvider(string sourceId, Func<CancellationToken, Task<object?>> factory)
    {
        SourceId = sourceId ?? string.Empty;
        _factory = factory ?? throw new ArgumentNullException(nameof(factory));
    }

    public string SourceId { get; }

    public Task<object?> GetPreviewAsync(CancellationToken cancellationToken)
    {
        return _factory(cancellationToken);
    }
}

