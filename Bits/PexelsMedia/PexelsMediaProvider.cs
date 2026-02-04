using Core.DataSources;
using Core.Runtime.Preview;

namespace StreamCraft.Bits.PexelsMedia;

public sealed class PexelsMediaProvider : IDataSourceProvider
{
    private readonly PexelsMediaService _service;
    private readonly string _sourceId;

    public PexelsMediaProvider(PexelsMediaService service, string sourceId)
    {
        _service = service;
        _sourceId = sourceId;
    }

    public string SourceId => _sourceId;

    public async Task<object?> GetPreviewAsync(CancellationToken cancellationToken)
    {
        if (string.Equals(_sourceId, "pexels-videos", StringComparison.OrdinalIgnoreCase))
        {
            return await _service.GetRandomVideoAsync(null, cancellationToken);
        }
        return await _service.GetRandomImageAsync(null, cancellationToken);
    }
}

