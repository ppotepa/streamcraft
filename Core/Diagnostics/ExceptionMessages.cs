using Core.Messaging;
using Messaging.Shared;

namespace Core.Diagnostics;

public enum ExceptionSeverity
{
    Info,
    Warning,
    Error,
    Critical
}

public sealed class ExceptionNotice
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public DateTime TimestampUtc { get; init; } = DateTime.UtcNow;
    public ExceptionSeverity Severity { get; init; } = ExceptionSeverity.Error;
    public string Message { get; init; } = string.Empty;
    public string? ExceptionType { get; init; }
    public string? Source { get; init; }
    public string? BitId { get; init; }
    public string? CorrelationId { get; init; }
    public string? StackTrace { get; init; }
    public IReadOnlyDictionary<string, string?>? Context { get; init; }
}

public sealed class ExceptionNoticeMessage : Message<ExceptionNotice>
{
    public ExceptionNoticeMessage(ExceptionNotice payload) : base(payload)
    {
        Metadata = MessageMetadata.Create(source: payload.Source, correlationId: payload.CorrelationId);
    }

    public override MessageType Type => ExceptionMessageType.ExceptionRaised;
}

public static class ExceptionMessageType
{
    private const string Category = "Exceptions";
    public static readonly MessageType ExceptionRaised = MessageType.Create(Category, nameof(ExceptionRaised));
}
