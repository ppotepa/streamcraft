using Microsoft.AspNetCore.Mvc;
using Serilog;

namespace Engine.Controllers;

public abstract class BaseController : ControllerBase
{
    protected ILogger? Logger { get; private set; }

    public virtual void Initialize(ILogger? logger)
    {
        Logger = logger;
    }

    protected void LogInformation(string message, params object[] args)
    {
        Logger?.Information(message, args);
    }

    protected void LogWarning(Exception? ex, string message, params object[] args)
    {
        if (ex != null)
            Logger?.Warning(ex, message, args);
        else
            Logger?.Warning(message, args);
    }

    protected void LogError(Exception ex, string message, params object[] args)
    {
        Logger?.Error(ex, message, args);
    }
}
