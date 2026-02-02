using Core.Designer;
using Microsoft.Extensions.Hosting;
using Serilog;
using System.Linq;

namespace StreamCraft.Bits.PublicApiSources;

public sealed class PublicApiSourcesBootstrapper : IHostedService
{
    private readonly IDataSourceRegistry _registry;
    private readonly PublicApiSourceLoader _loader;
    private readonly PublicApiMetadataBuilder _metadataBuilder;
    private readonly PublicApiMetadataStore _metadataStore;
    private readonly ILogger _logger;

    public PublicApiSourcesBootstrapper(
        IDataSourceRegistry registry,
        PublicApiSourceLoader loader,
        PublicApiMetadataBuilder metadataBuilder,
        PublicApiMetadataStore metadataStore,
        ILogger logger)
    {
        _registry = registry;
        _loader = loader;
        _metadataBuilder = metadataBuilder;
        _metadataStore = metadataStore;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        var sources = _loader.LoadAll();
        var cachedMetadata = await _metadataStore.ReadAllAsync(cancellationToken);
        if (cachedMetadata.Count > 0)
        {
            sources = _metadataStore.ApplyCachedMetadata(sources, cachedMetadata);
        }
        IReadOnlyList<IPublicApiDataSource> enriched = sources;

        try
        {
            enriched = await _metadataBuilder.EnrichAsync(sources, cancellationToken);
        }
        catch (Exception ex) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.Warning(ex, "Public API metadata build failed. Falling back to base sources.");
        }

        _registry.RegisterRange(enriched);

        var endpointCount = enriched.Sum(source => source.Endpoints.Count);
        var metadataCount = enriched.Sum(source => source.Endpoints.Count(endpoint => endpoint.Response != null));
        var successCount = enriched.Sum(source => source.Endpoints.Count(endpoint => endpoint.Response?.Success == true));

        _logger.Information(
            "PublicApiSources loaded: {Count} (endpoints: {Endpoints}, metadata: {Metadata}, success: {Success})",
            enriched.Count,
            endpointCount,
            metadataCount,
            successCount);

        try
        {
            await _metadataStore.WriteAsync(enriched, cancellationToken);
        }
        catch (Exception ex) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.Warning(ex, "Failed to persist public API metadata to Postgres.");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}
