using Core.Messaging;
using Serilog;

namespace Core.Diagnostics;

public static class ExceptionFactory
{
    private static readonly object Sync = new();
    private static readonly object RecentSync = new();
    private static IMessageBus? _bus;
    private static ILogger? _logger;
    private static int _handlersAttached;
    private const int MaxRecent = 200;
    private static readonly Queue<ExceptionNotice> Recent = new();

    public static event Action<ExceptionNotice>? ExceptionReported;

    public static void Initialize(IMessageBus messageBus, ILogger logger)
    {
        if (messageBus == null) throw new ArgumentNullException(nameof(messageBus));
        if (logger == null) throw new ArgumentNullException(nameof(logger));

        lock (Sync)
        {
            _bus = messageBus;
            _logger = logger;
        }

        if (Interlocked.Exchange(ref _handlersAttached, 1) == 0)
        {
            AttachUnhandledHandlers();
        }
    }

    public static Exception Create(ExceptionSeverity severity, string message, Exception? inner = null, string? source = null, string? bitId = null,
        string? correlationId = null, IReadOnlyDictionary<string, string?>? context = null)
    {
        var exception = inner == null ? new Exception(message) : new Exception(message, inner);
        Report(exception, severity, source, bitId, correlationId, context);
        return exception;
    }

    public static TException Create<TException>(ExceptionSeverity severity, string message, Exception? inner = null, string? source = null,
        string? bitId = null, string? correlationId = null, IReadOnlyDictionary<string, string?>? context = null)
        where TException : Exception
    {
        var exception = CreateException<TException>(message, inner);
        Report(exception, severity, source, bitId, correlationId, context);
        return exception;
    }

    public static ArgumentNullException ArgumentNull(string paramName, string? message = null, ExceptionSeverity severity = ExceptionSeverity.Error,
        string? source = null, string? bitId = null, string? correlationId = null, IReadOnlyDictionary<string, string?>? context = null)
    {
        var exception = message == null ? new ArgumentNullException(paramName) : new ArgumentNullException(paramName, message);
        Report(exception, severity, source, bitId, correlationId, context);
        return exception;
    }

    public static ArgumentException Argument(string message, string? paramName = null, ExceptionSeverity severity = ExceptionSeverity.Error,
        string? source = null, string? bitId = null, string? correlationId = null, IReadOnlyDictionary<string, string?>? context = null)
    {
        var exception = paramName == null ? new ArgumentException(message) : new ArgumentException(message, paramName);
        Report(exception, severity, source, bitId, correlationId, context);
        return exception;
    }

    public static ArgumentOutOfRangeException ArgumentOutOfRange(string paramName, string? message = null, object? actualValue = null,
        ExceptionSeverity severity = ExceptionSeverity.Error, string? source = null, string? bitId = null, string? correlationId = null,
        IReadOnlyDictionary<string, string?>? context = null)
    {
        ArgumentOutOfRangeException exception;
        if (actualValue != null)
        {
            exception = new ArgumentOutOfRangeException(paramName, actualValue, message);
        }
        else if (message != null)
        {
            exception = new ArgumentOutOfRangeException(paramName, message);
        }
        else
        {
            exception = new ArgumentOutOfRangeException(paramName);
        }

        Report(exception, severity, source, bitId, correlationId, context);
        return exception;
    }

    public static InvalidOperationException InvalidOperation(string message, ExceptionSeverity severity = ExceptionSeverity.Error,
        string? source = null, string? bitId = null, string? correlationId = null, IReadOnlyDictionary<string, string?>? context = null)
    {
        var exception = new InvalidOperationException(message);
        Report(exception, severity, source, bitId, correlationId, context);
        return exception;
    }

    public static DirectoryNotFoundException DirectoryNotFound(string message, ExceptionSeverity severity = ExceptionSeverity.Error,
        string? source = null, string? bitId = null, string? correlationId = null, IReadOnlyDictionary<string, string?>? context = null)
    {
        var exception = new DirectoryNotFoundException(message);
        Report(exception, severity, source, bitId, correlationId, context);
        return exception;
    }

    public static void Report(Exception exception, ExceptionSeverity severity = ExceptionSeverity.Error, string? source = null, string? bitId = null,
        string? correlationId = null, IReadOnlyDictionary<string, string?>? context = null)
    {
        if (exception == null)
        {
            return;
        }

        var notice = new ExceptionNotice
        {
            Severity = severity,
            Message = exception.Message,
            ExceptionType = exception.GetType().FullName,
            Source = source ?? exception.Source,
            BitId = bitId,
            CorrelationId = correlationId,
            StackTrace = exception.StackTrace ?? exception.ToString(),
            Context = context
        };

        Publish(notice, exception, severity);
    }

    private static void Publish(ExceptionNotice notice, Exception? exception, ExceptionSeverity severity)
    {
        IMessageBus? bus;
        ILogger? logger;
        lock (Sync)
        {
            bus = _bus;
            logger = _logger;
        }

        if (bus != null)
        {
            bus.Publish(ExceptionMessageType.ExceptionRaised, notice, MessageMetadata.Create(source: notice.Source, correlationId: notice.CorrelationId));
        }

        lock (RecentSync)
        {
            Recent.Enqueue(notice);
            while (Recent.Count > MaxRecent)
            {
                Recent.Dequeue();
            }
        }

        ExceptionReported?.Invoke(notice);

        if (logger == null)
        {
            return;
        }

        var message = "Exception reported: {ExceptionMessage}";
        switch (severity)
        {
            case ExceptionSeverity.Info:
                logger.Information(exception, message, notice.Message);
                break;
            case ExceptionSeverity.Warning:
                logger.Warning(exception, message, notice.Message);
                break;
            case ExceptionSeverity.Critical:
                logger.Fatal(exception, message, notice.Message);
                break;
            default:
                logger.Error(exception, message, notice.Message);
                break;
        }
    }

    private static void AttachUnhandledHandlers()
    {
        AppDomain.CurrentDomain.UnhandledException += (_, args) =>
        {
            if (args.ExceptionObject is Exception ex)
            {
                Report(ex, ExceptionSeverity.Critical, source: "UnhandledException");
            }
        };

        TaskScheduler.UnobservedTaskException += (_, args) =>
        {
            Report(args.Exception, ExceptionSeverity.Error, source: "UnobservedTaskException");
            args.SetObserved();
        };
    }

    public static IReadOnlyList<ExceptionNotice> GetRecentSnapshot()
    {
        lock (RecentSync)
        {
            return Recent.ToList();
        }
    }

    private static TException CreateException<TException>(string message, Exception? inner) where TException : Exception
    {
        var type = typeof(TException);

        if (inner != null)
        {
            var withInner = type.GetConstructor(new[] { typeof(string), typeof(Exception) });
            if (withInner != null)
            {
                return (TException)withInner.Invoke(new object?[] { message, inner });
            }
        }

        var withMessage = type.GetConstructor(new[] { typeof(string) });
        if (withMessage != null)
        {
            return (TException)withMessage.Invoke(new object?[] { message });
        }

        var parameterless = type.GetConstructor(Type.EmptyTypes);
        if (parameterless != null)
        {
            return (TException)parameterless.Invoke(Array.Empty<object>());
        }

        return new Exception(message, inner) as TException
            ?? throw new InvalidOperationException($"Could not create exception type {type.FullName}.");
    }
}
