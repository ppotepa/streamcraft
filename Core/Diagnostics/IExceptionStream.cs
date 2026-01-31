namespace Core.Diagnostics;

public interface IExceptionStream
{
    event Action<ExceptionNotice> ExceptionReceived;
    IReadOnlyList<ExceptionNotice> GetRecent();
}
