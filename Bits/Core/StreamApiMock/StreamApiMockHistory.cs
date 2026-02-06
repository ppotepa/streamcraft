using System.Collections.Concurrent;
using System.Collections.Generic;

namespace StreamCraft.Bits.StreamApiMock;

public sealed class StreamApiMockHistory
{
    private readonly ConcurrentQueue<StreamApiMockEventRecord> _events = new();
    private readonly int _capacity;

    public StreamApiMockHistory(StreamApiMockOptions options)
    {
        _capacity = Math.Max(10, options.HistorySize);
    }

    public void Record(StreamApiMockEventRecord record)
    {
        _events.Enqueue(record);
        while (_events.Count > _capacity && _events.TryDequeue(out _))
        {
        }
    }

    public IReadOnlyList<StreamApiMockEventRecord> Snapshot()
    {
        return _events.ToArray();
    }
}
