using System.Collections.Concurrent;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using StreamCraft.Core.Messaging;

namespace StreamCraft.Core.Events;

public sealed class EventProducerHost : IHostedService
{
    private readonly IEventProducerRegistry _registry;
    private readonly IMessageBus _messageBus;
    private readonly ILogger<EventProducerHost> _logger;
    private readonly ConcurrentDictionary<string, (CancellationTokenSource Cts, Task Task)> _running = new(StringComparer.OrdinalIgnoreCase);
    private CancellationToken _hostToken;

    public EventProducerHost(IEventProducerRegistry registry, IMessageBus messageBus, ILogger<EventProducerHost> logger)
    {
        _registry = registry;
        _messageBus = messageBus;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _hostToken = cancellationToken;
        _registry.Changed += OnRegistryChanged;

        foreach (var registration in _registry.GetAll())
        {
            StartProducer(registration, cancellationToken);
        }

        return Task.CompletedTask;
    }

    public async Task StopAsync(CancellationToken cancellationToken)
    {
        _registry.Changed -= OnRegistryChanged;

        foreach (var entry in _running.Values)
        {
            entry.Cts.Cancel();
        }

        if (_running.Count > 0)
        {
            try
            {
                await Task.WhenAll(_running.Values.Select(x => x.Task)).WaitAsync(cancellationToken).ConfigureAwait(false);
            }
            catch (OperationCanceledException)
            {
                // shutting down
            }
        }

        _running.Clear();
    }

    private void OnRegistryChanged(object? sender, EventProducerRegistryChangedEventArgs args)
    {
        if (args.ChangeType == EventProducerRegistryChangeType.Added)
        {
            StartProducer(args.Registration, _hostToken);
        }
        else
        {
            StopProducer(args.Registration.ProducerId);
        }
    }

    private void StartProducer(IEventProducerRegistration registration, CancellationToken cancellationToken)
    {
        if (_running.ContainsKey(registration.ProducerId))
        {
            return;
        }

        var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        var task = RunProducerAsync(registration, cts.Token);
        _running[registration.ProducerId] = (cts, task);
        _logger.LogInformation("Started event producer {ProducerId} for {MessageType}.", registration.ProducerId, registration.MessageType);
    }

    private void StopProducer(string producerId)
    {
        if (_running.TryRemove(producerId, out var entry))
        {
            entry.Cts.Cancel();
            _logger.LogInformation("Stopped event producer {ProducerId}.", producerId);
        }
    }

    private async Task RunProducerAsync(IEventProducerRegistration registration, CancellationToken cancellationToken)
    {
        try
        {
            await registration.RunAsync(_messageBus, _logger, cancellationToken).ConfigureAwait(false);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // graceful shutdown
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Event producer {ProducerId} terminated unexpectedly.", registration.ProducerId);
        }
        finally
        {
            StopProducer(registration.ProducerId);
        }
    }
}
