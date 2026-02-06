namespace StreamCraft.Core.Diagnostics.ShutdownChecks;

public sealed class ShutdownCheckResult
{
    public string Name { get; init; } = string.Empty;
    public ShutdownCheckStatus Status { get; init; } = ShutdownCheckStatus.Ok;
    public string? Message { get; init; }
    public IReadOnlyDictionary<string, string?>? Details { get; init; }
    public TimeSpan Duration { get; init; }
    public DateTime TimestampUtc { get; init; } = DateTime.UtcNow;

    public static ShutdownCheckResult Ok(string name, string? message = null, IReadOnlyDictionary<string, string?>? details = null, TimeSpan? duration = null)
    {
        return new ShutdownCheckResult
        {
            Name = name,
            Status = ShutdownCheckStatus.Ok,
            Message = message,
            Details = details,
            Duration = duration ?? TimeSpan.Zero,
            TimestampUtc = DateTime.UtcNow
        };
    }

    public static ShutdownCheckResult Warning(string name, string? message = null, IReadOnlyDictionary<string, string?>? details = null, TimeSpan? duration = null)
    {
        return new ShutdownCheckResult
        {
            Name = name,
            Status = ShutdownCheckStatus.Warning,
            Message = message,
            Details = details,
            Duration = duration ?? TimeSpan.Zero,
            TimestampUtc = DateTime.UtcNow
        };
    }

    public static ShutdownCheckResult Fail(string name, string? message = null, IReadOnlyDictionary<string, string?>? details = null, TimeSpan? duration = null)
    {
        return new ShutdownCheckResult
        {
            Name = name,
            Status = ShutdownCheckStatus.Fail,
            Message = message,
            Details = details,
            Duration = duration ?? TimeSpan.Zero,
            TimestampUtc = DateTime.UtcNow
        };
    }
}
