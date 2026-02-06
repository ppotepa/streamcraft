using System.Threading;

namespace StreamCraft.Bits.StreamApiMock;

public sealed class StreamApiMockStatistics
{
    private long _totalEvents;
    private StreamApiMockEventRecord? _lastEvent;

    public void Record(StreamApiMockEventRecord record)
    {
        Interlocked.Increment(ref _totalEvents);
        Volatile.Write(ref _lastEvent, record);
    }

    public StreamApiMockStatisticsSnapshot Snapshot()
    {
        var total = Interlocked.Read(ref _totalEvents);
        var last = Volatile.Read(ref _lastEvent);
        return new StreamApiMockStatisticsSnapshot(total, last);
    }
}

public sealed record StreamApiMockStatisticsSnapshot(long TotalEvents, StreamApiMockEventRecord? LastRecord);
