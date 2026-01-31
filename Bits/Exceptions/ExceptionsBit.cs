using Core.Bits;
using Core.Logging;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using System.Text.Json;

namespace StreamCraft.Bits.Exceptions;

[BitRoute("/logging")]
[HasUserInterface]
public sealed class ExceptionsBit : StreamBit<LoggingBitState>, IBitEndpointContributor
{
    private const int MaxRecent = 500;
    private readonly HashSet<Guid> _seenIds = new();
    private readonly object _seenLock = new();
    private ILogEventStream? _logStream;

    public override string Name => "Logging";
    public override string Description => "Central logging console for exceptions and diagnostics";

    protected override void OnInitialize()
    {
        _logStream = Context?.ServiceProvider.GetService<ILogEventStream>() ?? LoggerFactory.LogStream;
        if (_logStream == null)
        {
            Context?.Logger.Warning("Logging bit could not connect to log stream. ILogEventStream missing.");
            return;
        }

        _logStream.LogReceived += OnLogEvent;

        var existing = _logStream.GetRecent();
        if (existing.Count > 0)
        {
            SyncEntries(existing);
        }
    }

    private void OnLogEvent(LogEventNotice notice)
    {
        if (!TryMarkSeen(notice.Id))
        {
            return;
        }

        if (StateStore != null)
        {
            StateStore.Update(state => AddNotice(state, notice));
            return;
        }

        AddNotice(State, notice);
    }

    private void AddNotice(LoggingBitState state, LogEventNotice notice)
    {
        var entry = LogEntry.FromNotice(notice);
        state.Add(entry, MaxRecent);
    }

    private bool TryMarkSeen(Guid id)
    {
        lock (_seenLock)
        {
            return _seenIds.Add(id);
        }
    }

    private void SyncEntries(IReadOnlyList<LogEventNotice> notices)
    {
        if (notices.Count == 0)
        {
            return;
        }

        if (StateStore != null)
        {
            StateStore.Update(state =>
            {
                foreach (var notice in notices)
                {
                    if (TryMarkSeen(notice.Id))
                    {
                        AddNotice(state, notice);
                    }
                }
            });
            return;
        }

        foreach (var notice in notices)
        {
            if (TryMarkSeen(notice.Id))
            {
                AddNotice(State, notice);
            }
        }
    }

    public override async Task HandleAsync(HttpContext httpContext)
    {
        var snapshot = StateStore?.GetSnapshot() ?? State;
        httpContext.Response.ContentType = "application/json";
        await httpContext.Response.WriteAsync(JsonSerializer.Serialize(snapshot, new JsonSerializerOptions
        {
            WriteIndented = true
        }));
    }

    public void MapEndpoints(IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/exceptions/{*path}", async context =>
        {
            var path = context.Request.Path.Value ?? string.Empty;
            var suffix = path.Length > "/exceptions".Length
                ? path["/exceptions".Length..]
                : string.Empty;
            var target = "/logging" + suffix;
            context.Response.Redirect(target, permanent: true);
            await Task.CompletedTask;
        });
    }
}

public sealed class LoggingBitState : IBitState
{
    public int TotalCount { get; set; }
    public int ExceptionCount { get; set; }
    public Dictionary<string, int> LevelCounts { get; } = new(StringComparer.OrdinalIgnoreCase);
    public List<LogEntry> Recent { get; } = new();
    public LogEntry? Last { get; set; }
    public DateTime? LastSeenUtc { get; set; }

    public void Add(LogEntry entry, int maxRecent)
    {
        TotalCount++;
        if (entry.IsException)
        {
            ExceptionCount++;
        }
        Last = entry;
        LastSeenUtc = entry.TimestampUtc;

        if (LevelCounts.TryGetValue(entry.Level, out var current))
        {
            LevelCounts[entry.Level] = current + 1;
        }
        else
        {
            LevelCounts[entry.Level] = 1;
        }

        Recent.Insert(0, entry);
        if (Recent.Count > maxRecent)
        {
            Recent.RemoveRange(maxRecent, Recent.Count - maxRecent);
        }
    }
}

public sealed class LogEntry
{
    public Guid Id { get; init; }
    public DateTime TimestampUtc { get; init; }
    public string Level { get; init; } = "Info";
    public string Message { get; init; } = string.Empty;
    public string? ExceptionType { get; init; }
    public string? SourceContext { get; init; }
    public string? BitId { get; init; }
    public string? CorrelationId { get; init; }
    public string? StackTrace { get; init; }
    public bool IsException { get; init; }
    public IReadOnlyDictionary<string, string?>? Properties { get; init; }

    public static LogEntry FromNotice(LogEventNotice notice)
    {
        return new LogEntry
        {
            Id = notice.Id,
            TimestampUtc = notice.TimestampUtc,
            Level = notice.Level,
            Message = notice.Message,
            ExceptionType = notice.ExceptionType,
            SourceContext = notice.SourceContext,
            BitId = notice.BitId,
            CorrelationId = notice.CorrelationId,
            StackTrace = notice.StackTrace,
            IsException = notice.IsException,
            Properties = notice.Properties
        };
    }
}