using System.Collections.Concurrent;
using System.Diagnostics;
using System.Runtime.CompilerServices;
using System.Threading.Channels;

namespace Core.Diagnostics.ProcessEvents;

public enum ProcessChangeKind
{
    Started,
    Stopped
}

public sealed record ProcessChange(ProcessChangeKind Kind, string ProcessName, int ProcessId, DateTime TimestampUtc);

public sealed class ProcessEventHub : IAsyncDisposable
{
    private readonly string _processName;
    private readonly TimeSpan _pollInterval;
    private readonly Channel<ProcessChange> _channel;
    private readonly CancellationTokenSource _cts = new();
    private Task? _runner;
    private bool _isRunning;
    private int _initialBroadcasted;

    public ProcessEventHub(string processName, TimeSpan pollInterval)
    {
        if (string.IsNullOrWhiteSpace(processName))
        {
            throw new ArgumentException("Process name is required.", nameof(processName));
        }

        _processName = processName;
        _pollInterval = pollInterval <= TimeSpan.Zero ? TimeSpan.FromSeconds(1) : pollInterval;
        _channel = Channel.CreateUnbounded<ProcessChange>(new UnboundedChannelOptions
        {
            SingleReader = false,
            SingleWriter = true
        });
    }

    public void Start()
    {
        _runner ??= Task.Run(RunAsync);
    }

    public async IAsyncEnumerable<ProcessChange> WatchAsync([EnumeratorCancellation] CancellationToken cancellationToken)
    {
        while (await _channel.Reader.WaitToReadAsync(cancellationToken))
        {
            while (_channel.Reader.TryRead(out var item))
            {
                yield return item;
            }
        }
    }

    private async Task RunAsync()
    {
        try
        {
            using var timer = new PeriodicTimer(_pollInterval);
            _isRunning = IsRunning();
            if (_initialBroadcasted == 0)
            {
                _initialBroadcasted = 1;
                _channel.Writer.TryWrite(new ProcessChange(
                    _isRunning ? ProcessChangeKind.Started : ProcessChangeKind.Stopped,
                    _processName,
                    _isRunning ? GetFirstProcessId() : 0,
                    DateTime.UtcNow));
            }

            while (await timer.WaitForNextTickAsync(_cts.Token))
            {
                var running = IsRunning();
                if (running == _isRunning)
                {
                    continue;
                }

                _isRunning = running;
                var change = new ProcessChange(
                    running ? ProcessChangeKind.Started : ProcessChangeKind.Stopped,
                    _processName,
                    running ? GetFirstProcessId() : 0,
                    DateTime.UtcNow);
                _channel.Writer.TryWrite(change);
            }
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

    private bool IsRunning()
    {
        return Process.GetProcessesByName(_processName).Length > 0;
    }

    private int GetFirstProcessId()
    {
        var proc = Process.GetProcessesByName(_processName).FirstOrDefault();
        return proc?.Id ?? 0;
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
        _cts.Dispose();
    }
}
