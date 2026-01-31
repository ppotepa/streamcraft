namespace Core.Logging;

public interface ILogEventStream
{
    event Action<LogEventNotice> LogReceived;
    IReadOnlyList<LogEventNotice> GetRecent();
}
