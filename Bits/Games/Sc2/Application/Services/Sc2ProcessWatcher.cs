using Bits.Sc2.Configuration;
using Core.Diagnostics.ProcessEvents;
using Microsoft.Extensions.Options;
using System.Collections.Concurrent;
using System.Threading.Channels;

namespace Bits.Sc2.Application.Services;

public sealed class Sc2ProcessWatcher : ISc2ProcessWatcher
{
    private readonly Sc2RuntimeOptions _options;
    private readonly List<ProcessEventHub> _hubs = new();
    private readonly Channel<ProcessChange> _channel = Channel.CreateUnbounded<ProcessChange>(new UnboundedChannelOptions
    {
        SingleReader = false,
        SingleWriter = false
    });
    private readonly ConcurrentDictionary<string, bool> _runningStates = new(StringComparer.OrdinalIgnoreCase);
    private readonly ConcurrentDictionary<string, bool> _initialized = new(StringComparer.OrdinalIgnoreCase);
    private readonly CancellationTokenSource _cts = new();
    private Task? _runner;
    private bool _aggregateRunning;

    public Sc2ProcessWatcher(IOptions<Sc2RuntimeOptions> options)
    {
        _options = options?.Value ?? new Sc2RuntimeOptions();
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        if (_runner != null)
        {
            return Task.CompletedTask;
        }

        foreach (var name in _options.ProcessNames)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                continue;
            }

            var hub = new ProcessEventHub(name.Trim(), TimeSpan.FromMilliseconds(Math.Max(100, _options.PollIntervalMs)));
            hub.Start();
            _hubs.Add(hub);
        }

        _runner = Task.Run(() => RunAsync(_cts.Token), _cts.Token);
        return Task.CompletedTask;
    }

    public async IAsyncEnumerable<ProcessChange> WatchAsync([System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken)
    {
        while (await _channel.Reader.WaitToReadAsync(cancellationToken))
        {
            while (_channel.Reader.TryRead(out var item))
            {
                yield return item;
            }
        }
    }

    public async ValueTask DisposeAsync()
    {
        _cts.Cancel();
        if (_runner != null)
        {
            try
            {
                await _runner.ConfigureAwait(false);
            }
            catch
            {
                // ignore
            }
        }

        foreach (var hub in _hubs)
        {
            await hub.DisposeAsync().ConfigureAwait(false);
        }
        _hubs.Clear();
    }

    private async Task RunAsync(CancellationToken cancellationToken)
    {
        var tasks = _hubs.Select(h => ConsumeHubAsync(h, cancellationToken)).ToList();

        if (tasks.Count == 0)
        {
            _channel.Writer.TryWrite(new ProcessChange(ProcessChangeKind.Stopped, "SC2", 0, DateTime.UtcNow));
            _channel.Writer.TryComplete();
            return;
        }

        try
        {
            await Task.WhenAll(tasks).ConfigureAwait(false);
        }
        catch (OperationCanceledException)
        {
            // shutdown
        }
        finally
        {
            _channel.Writer.TryComplete();
        }
    }

    private async Task ConsumeHubAsync(ProcessEventHub hub, CancellationToken cancellationToken)
    {
        await foreach (var change in hub.WatchAsync(cancellationToken))
        {
            var name = change.ProcessName;
            _runningStates[name] = change.Kind == ProcessChangeKind.Started;
            _initialized[name] = true;

            EmitAggregateIfReady();
        }
    }

    private void EmitAggregateIfReady()
    {
        if (_initialized.Count < _hubs.Count)
        {
            return;
        }

        var isRunning = _runningStates.Values.Any(v => v);
        if (isRunning == _aggregateRunning)
        {
            return;
        }

        _aggregateRunning = isRunning;
        _channel.Writer.TryWrite(new ProcessChange(
            isRunning ? ProcessChangeKind.Started : ProcessChangeKind.Stopped,
            "SC2",
            0,
            DateTime.UtcNow));
    }
}
