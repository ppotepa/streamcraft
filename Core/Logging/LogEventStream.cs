using Serilog.Core;
using Serilog.Events;
using System.Collections.Concurrent;

namespace Core.Logging;

public sealed class LogEventStream : ILogEventStream, ILogEventSink
{
    private readonly ConcurrentQueue<LogEventNotice> _recent = new();
    private readonly int _maxRecent;
    private int _count;

    public event Action<LogEventNotice>? LogReceived;

    public LogEventStream(int maxRecent = 500)
    {
        _maxRecent = Math.Max(50, maxRecent);
    }

    public void Emit(LogEvent logEvent)
    {
        if (logEvent == null)
        {
            return;
        }

        var notice = new LogEventNotice
        {
            TimestampUtc = logEvent.Timestamp.UtcDateTime,
            Level = MapLevel(logEvent.Level),
            Message = logEvent.RenderMessage(),
            ExceptionType = logEvent.Exception?.GetType().FullName,
            StackTrace = logEvent.Exception?.ToString(),
            SourceContext = GetProperty(logEvent, "SourceContext"),
            BitId = GetProperty(logEvent, "BitId"),
            CorrelationId = GetProperty(logEvent, "CorrelationId"),
            IsException = logEvent.Exception != null,
            Properties = ExtractProperties(logEvent)
        };

        _recent.Enqueue(notice);
        Trim();
        LogReceived?.Invoke(notice);
    }

    public IReadOnlyList<LogEventNotice> GetRecent()
    {
        return _recent.ToArray();
    }

    private void Trim()
    {
        while (_count < _maxRecent)
        {
            var current = _recent.Count;
            if (current <= _maxRecent)
            {
                _count = current;
                return;
            }

            if (_recent.TryDequeue(out _))
            {
                _count = current - 1;
            }
            else
            {
                return;
            }
        }

        while (_recent.Count > _maxRecent)
        {
            _recent.TryDequeue(out _);
        }
        _count = _recent.Count;
    }

    private static string MapLevel(LogEventLevel level)
    {
        return level switch
        {
            LogEventLevel.Verbose => "Verbose",
            LogEventLevel.Debug => "Debug",
            LogEventLevel.Information => "Info",
            LogEventLevel.Warning => "Warning",
            LogEventLevel.Error => "Error",
            LogEventLevel.Fatal => "Critical",
            _ => "Info"
        };
    }

    private static string? GetProperty(LogEvent logEvent, string name)
    {
        if (logEvent.Properties.TryGetValue(name, out var value))
        {
            if (value is ScalarValue scalar && scalar.Value is string str)
            {
                return str;
            }

            var rendered = value.ToString();
            if (rendered.StartsWith("\"", StringComparison.Ordinal) && rendered.EndsWith("\"", StringComparison.Ordinal))
            {
                return rendered.Trim('"');
            }
            return rendered;
        }

        return null;
    }

    private static IReadOnlyDictionary<string, string?> ExtractProperties(LogEvent logEvent)
    {
        if (logEvent.Properties.Count == 0)
        {
            return new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
        }

        var result = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
        foreach (var kvp in logEvent.Properties)
        {
            if (kvp.Value is ScalarValue scalar)
            {
                result[kvp.Key] = scalar.Value?.ToString();
                continue;
            }

            var rendered = kvp.Value.ToString();
            if (rendered.StartsWith("\"", StringComparison.Ordinal) && rendered.EndsWith("\"", StringComparison.Ordinal))
            {
                rendered = rendered.Trim('"');
            }
            result[kvp.Key] = rendered;
        }

        return result;
    }
}
