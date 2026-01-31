using System.Collections.Concurrent;

namespace Core.Diagnostics;

public sealed class InMemoryExceptionStore : IExceptionSink, IExceptionStream
{
    private readonly ConcurrentQueue<ExceptionNotice> _recent = new();
    private readonly int _maxRecent;
    private int _count;

    public event Action<ExceptionNotice>? ExceptionReceived;

    public InMemoryExceptionStore(Microsoft.Extensions.Options.IOptions<ExceptionPipelineOptions> options)
    {
        var value = options?.Value ?? new ExceptionPipelineOptions();
        _maxRecent = Math.Max(10, value.MaxRecent);
    }

    public Task WriteAsync(ExceptionNotice notice, CancellationToken cancellationToken = default)
    {
        _recent.Enqueue(notice);
        Trim();
        ExceptionReceived?.Invoke(notice);
        return Task.CompletedTask;
    }

    public IReadOnlyList<ExceptionNotice> GetRecent()
    {
        return _recent.ToArray();
    }

    private void Trim()
    {
        while (_count < _maxRecent)
        {
            var current = _recent.Count;
            if (current <= _maxRecent)
            {
                _count = current;
                return;
            }

            if (_recent.TryDequeue(out _))
            {
                _count = current - 1;
            }
            else
            {
                return;
            }
        }

        while (_recent.Count > _maxRecent)
        {
            _recent.TryDequeue(out _);
        }
        _count = _recent.Count;
    }
}
