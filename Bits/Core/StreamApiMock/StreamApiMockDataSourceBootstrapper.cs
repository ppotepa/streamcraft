using Microsoft.Extensions.Hosting;
using Serilog;
using StreamCraft.Core.DataSources;
using StreamCraft.Core.Runtime.Chat;
using StreamCraft.Core.Runtime.Preview;

namespace StreamCraft.Bits.StreamApiMock;

public sealed class StreamApiMockDataSourceBootstrapper : IHostedService
{
    private readonly IDataSourceRegistry _sourceRegistry;
    private readonly IDataSourceProviderRegistry _previewRegistry;
    private readonly IChatSourceHistoryProviderRegistry _chatRegistry;
    private readonly StreamApiMockHistory _history;
    private readonly ILogger _logger;

    public StreamApiMockDataSourceBootstrapper(
        IDataSourceRegistry sourceRegistry,
        IDataSourceProviderRegistry previewRegistry,
        IChatSourceHistoryProviderRegistry chatRegistry,
        StreamApiMockHistory history,
        ILogger logger)
    {
        _sourceRegistry = sourceRegistry;
        _previewRegistry = previewRegistry;
        _chatRegistry = chatRegistry;
        _history = history;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        var source = new StreamApiMockChatSource();
        var provider = new StreamApiMockChatProvider(_history);

        _sourceRegistry.Register(source);
        _previewRegistry.Register(provider);
        _chatRegistry.Register(provider);

        _logger.Information("StreamApiMock chat source registered: {SourceId}", source.Id);
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}

