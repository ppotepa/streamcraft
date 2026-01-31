namespace Core.Diagnostics;

public interface IExceptionEnricher
{
    ExceptionNotice Enrich(ExceptionNotice notice);
}
