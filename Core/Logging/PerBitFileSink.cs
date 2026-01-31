using Serilog.Core;
using Serilog.Events;
using Serilog.Formatting;
using System.Collections.Concurrent;
using System.Text;

namespace Core.Logging;

internal sealed class PerBitFileSink : ILogEventSink, IDisposable
{
    private readonly string _logsFolder;
    private readonly string _runId;
    private readonly ITextFormatter _formatter;
    private readonly ConcurrentDictionary<string, TextWriter> _writers = new(StringComparer.OrdinalIgnoreCase);

    public PerBitFileSink(string logsFolder, string runId, ITextFormatter formatter)
    {
        _logsFolder = logsFolder;
        _runId = runId;
        _formatter = formatter;
    }

    public void Emit(LogEvent logEvent)
    {
        if (!logEvent.Properties.TryGetValue("BitName", out var bitNameValue))
        {
            return;
        }

        var bitName = (bitNameValue as ScalarValue)?.Value?.ToString()
                      ?? bitNameValue.ToString().Trim('"');

        if (string.IsNullOrWhiteSpace(bitName))
        {
            return;
        }

        var safeName = SanitizeFileName(bitName);
        if (string.IsNullOrWhiteSpace(safeName))
        {
            return;
        }

        var writer = _writers.GetOrAdd(safeName, CreateWriter);
        _formatter.Format(logEvent, writer);
        writer.Flush();
    }

    public void Dispose()
    {
        foreach (var writer in _writers.Values)
        {
            writer.Dispose();
        }
        _writers.Clear();
    }

    private TextWriter CreateWriter(string bitName)
    {
        var filePath = Path.Combine(_logsFolder, $"{_runId}.{bitName}.log");
        var stream = new FileStream(filePath, FileMode.Append, FileAccess.Write, FileShare.Read);
        var writer = new StreamWriter(stream) { AutoFlush = true };
        return TextWriter.Synchronized(writer);
    }

    private static string SanitizeFileName(string name)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var builder = new StringBuilder(name.Length);

        foreach (var ch in name)
        {
            builder.Append(invalid.Contains(ch) ? '-' : ch);
        }

        return builder.ToString().Trim().ToLowerInvariant();
    }
}
