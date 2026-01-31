namespace Core.Logging;

public sealed class LogEventNotice
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public DateTime TimestampUtc { get; init; } = DateTime.UtcNow;
    public string Level { get; init; } = "Info";
    public string Message { get; init; } = string.Empty;
    public string? ExceptionType { get; init; }
    public string? StackTrace { get; init; }
    public string? SourceContext { get; init; }
    public string? BitId { get; init; }
    public string? CorrelationId { get; init; }
    public bool IsException { get; init; }
    public IReadOnlyDictionary<string, string?>? Properties { get; init; }
}
