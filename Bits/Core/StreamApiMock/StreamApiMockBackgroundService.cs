using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StreamCraft.Core.Messaging;

namespace StreamCraft.Bits.StreamApiMock;

public sealed class StreamApiMockBackgroundService : BackgroundService
{
    private readonly IStreamApiMockScenarioRegistry _scenarioRegistry;
    private readonly StreamApiMockDataset _dataset;
    private readonly StreamApiMockHistory _history;
    private readonly StreamApiMockStatistics _statistics;
    private readonly IMessageBusEx _messageBus;
    private readonly ILogger<StreamApiMockBackgroundService> _logger;
    private readonly StreamApiMockOptions _options;
    private readonly Random _random = new();

    public StreamApiMockBackgroundService(
        IStreamApiMockScenarioRegistry scenarioRegistry,
        StreamApiMockDataset dataset,
        StreamApiMockHistory history,
        StreamApiMockStatistics statistics,
        IMessageBusEx messageBus,
        IOptions<StreamApiMockOptions> options,
        ILogger<StreamApiMockBackgroundService> logger)
    {
        _scenarioRegistry = scenarioRegistry;
        _dataset = dataset;
        _history = history;
        _statistics = statistics;
        _messageBus = messageBus;
        _logger = logger;
        _options = options.Value;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!StreamApiMockDefaults.IsDevelopmentEnvironment())
        {
            _logger.LogInformation("StreamApiMock background service disabled because environment is not Development.");
            return;
        }

        if (!_options.Enabled)
        {
            _logger.LogInformation("StreamApiMock background service disabled via configuration.");
            return;
        }

        var scenarios = _scenarioRegistry.List();
        if (scenarios.Count == 0)
        {
            _logger.LogWarning("StreamApiMock background service cannot start because no scenarios are registered.");
            return;
        }

        _logger.LogInformation("StreamApiMock background service starting with {ScenarioCount} scenarios.", scenarios.Count);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(_random.Next(4, 11)), stoppingToken);
                var scenario = scenarios[_random.Next(scenarios.Count)];
                PublishScenario(scenario);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "StreamApiMock background service failed to publish mock event.");
            }
        }

        _logger.LogInformation("StreamApiMock background service stopping.");
    }

    private void PublishScenario(StreamApiMockScenario scenario)
    {
        var context = new StreamApiMockScenarioContext
        {
            Dataset = _dataset,
            Random = _random,
            TimestampUtc = DateTime.UtcNow
        };

        var payload = scenario.PayloadFactory(context);
        var metadata = MessageMetadata.Create(_options.SourceName);

        _messageBus.Publish(scenario.MessageType, payload, metadata);

        var record = new StreamApiMockEventRecord(
            metadata.MessageId,
            scenario.MessageType.ToString(),
            scenario.Id,
            scenario.Name,
            payload,
            metadata.Timestamp);

        _history.Record(record);
        _statistics.Record(record);

        _logger.LogDebug("StreamApiMock published {ScenarioId} as {MessageType}.", scenario.Id, scenario.MessageType);
    }
}
