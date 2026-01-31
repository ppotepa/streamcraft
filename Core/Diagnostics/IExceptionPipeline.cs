namespace Core.Diagnostics;

public interface IExceptionPipeline
{
    void Report(ExceptionNotice notice);
}
