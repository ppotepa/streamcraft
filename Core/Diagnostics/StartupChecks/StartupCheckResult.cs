namespace Core.Diagnostics.StartupChecks;

public sealed class StartupCheckResult
{
    public string Name { get; init; } = string.Empty;
    public StartupCheckStatus Status { get; init; } = StartupCheckStatus.Ok;
    public string? Message { get; init; }
    public IReadOnlyDictionary<string, string?>? Details { get; init; }
    public TimeSpan Duration { get; init; }
    public DateTime TimestampUtc { get; init; } = DateTime.UtcNow;

    public static StartupCheckResult Ok(string name, string? message = null, IReadOnlyDictionary<string, string?>? details = null, TimeSpan? duration = null)
        => new()
        {
            Name = name,
            Status = StartupCheckStatus.Ok,
            Message = message,
            Details = details,
            Duration = duration ?? TimeSpan.Zero,
            TimestampUtc = DateTime.UtcNow
        };

    public static StartupCheckResult Warning(string name, string? message = null, IReadOnlyDictionary<string, string?>? details = null, TimeSpan? duration = null)
        => new()
        {
            Name = name,
            Status = StartupCheckStatus.Warning,
            Message = message,
            Details = details,
            Duration = duration ?? TimeSpan.Zero,
            TimestampUtc = DateTime.UtcNow
        };

    public static StartupCheckResult Fail(string name, string? message = null, IReadOnlyDictionary<string, string?>? details = null, TimeSpan? duration = null)
        => new()
        {
            Name = name,
            Status = StartupCheckStatus.Fail,
            Message = message,
            Details = details,
            Duration = duration ?? TimeSpan.Zero,
            TimestampUtc = DateTime.UtcNow
        };
}
