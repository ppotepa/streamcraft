using Bits.Sc2.Configuration;
using Core.Diagnostics.ProcessEvents;
using Microsoft.Extensions.Options;

namespace Bits.Sc2.Application.Services;

public sealed class Sc2ProcessWatcher : ISc2ProcessWatcher
{
    private readonly Sc2RuntimeOptions _options;
    private readonly List<ProcessEventHub> _hubs = new();

    public Sc2ProcessWatcher(IOptions<Sc2RuntimeOptions> options)
    {
        _options = options?.Value ?? new Sc2RuntimeOptions();
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
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

        return Task.CompletedTask;
    }

    public async IAsyncEnumerable<ProcessChange> WatchAsync([System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var tasks = _hubs.Select(h => h.WatchAsync(cancellationToken)).ToList();
        var enumerators = tasks.Select(t => t.GetAsyncEnumerator(cancellationToken)).ToList();
        try
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                var moveNextTasks = enumerators.Select(e => e.MoveNextAsync().AsTask()).ToList();
                var completed = await Task.WhenAny(moveNextTasks).ConfigureAwait(false);

                var index = moveNextTasks.IndexOf(completed);
                if (index < 0)
                {
                    yield break;
                }

                if (completed.Result)
                {
                    yield return enumerators[index].Current;
                }
                else
                {
                    // Enumerator finished
                    yield break;
                }
            }
        }
        finally
        {
            foreach (var e in enumerators)
            {
                await e.DisposeAsync().ConfigureAwait(false);
            }
        }
    }

    public async ValueTask DisposeAsync()
    {
        foreach (var hub in _hubs)
        {
            await hub.DisposeAsync().ConfigureAwait(false);
        }
        _hubs.Clear();
    }
}
