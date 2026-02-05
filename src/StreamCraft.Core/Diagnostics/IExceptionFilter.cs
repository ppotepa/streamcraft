namespace StreamCraft.Core.Diagnostics;

public interface IExceptionFilter
{
    bool ShouldStore(ExceptionNotice notice);
}



