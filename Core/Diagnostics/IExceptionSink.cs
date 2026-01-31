namespace Core.Diagnostics;

public interface IExceptionSink
{
    Task WriteAsync(ExceptionNotice notice, CancellationToken cancellationToken = default);
}
