using Core.Bits;
using Core.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using System.Reflection;
using System.Text.Json;

namespace StreamCraft.Bits.Exceptions;

[BitRoute("/exceptions")]
[HasUserInterface]
public sealed class ExceptionsBit : StreamBit<ExceptionsBitState>
{
    private const int MaxRecent = 200;
    private Guid _subscriptionId = Guid.Empty;
    private readonly HashSet<Guid> _seenIds = new();
    private readonly object _seenLock = new();
    private IDisposable? _syncHandle;
    private readonly List<Delegate> _externalFactoryHandlers = new();

    public override string Name => "Exceptions";
    public override string Description => "Aggregates exceptions published by the exception factory";

    protected override void OnInitialize()
    {
        if (Context?.MessageBus == null)
        {
            Context?.Logger.Warning("Exceptions bit could not subscribe to exception messages. Message bus missing.");
        }
        else
        {
            _subscriptionId = Context.MessageBus.Subscribe<ExceptionNotice>(
                ExceptionMessageType.ExceptionRaised,
                OnExceptionNotice);
        }

        ExceptionFactory.ExceptionReported += OnExceptionNotice;

        var existing = ExceptionFactory.GetRecentSnapshot();
        if (existing.Count > 0)
        {
            SyncNotices(existing);
        }

        AttachExternalFactories();

        var scheduler = Context?.ServiceProvider.GetService<Core.Scheduling.IScheduler>();
        if (scheduler != null)
        {
            _syncHandle = scheduler.SchedulePeriodic(
                name: "exceptions.sync",
                interval: TimeSpan.FromSeconds(1),
                action: _ =>
                {
                    var snapshot = ExceptionFactory.GetRecentSnapshot();
                    if (snapshot.Count > 0)
                    {
                        SyncNotices(snapshot);
                    }
                    return Task.CompletedTask;
                });
        }
    }

    private void OnExceptionNotice(ExceptionNotice notice)
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

    private void AddNotice(ExceptionsBitState state, ExceptionNotice notice)
    {
        var entry = ExceptionEntry.FromNotice(notice);
        state.Add(entry, MaxRecent);
    }

    private bool TryMarkSeen(Guid id)
    {
        lock (_seenLock)
        {
            return _seenIds.Add(id);
        }
    }

    private void SyncNotices(IReadOnlyList<ExceptionNotice> notices)
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

    private void AttachExternalFactories()
    {
        var currentAssembly = typeof(ExceptionFactory).Assembly;

        foreach (var assembly in AppDomain.CurrentDomain.GetAssemblies())
        {
            if (!string.Equals(assembly.GetName().Name, "Core", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (assembly == currentAssembly)
            {
                continue;
            }

            try
            {
                var factoryType = assembly.GetType("Core.Diagnostics.ExceptionFactory");
                if (factoryType == null)
                {
                    continue;
                }

                var eventInfo = factoryType.GetEvent("ExceptionReported", BindingFlags.Public | BindingFlags.Static);
                if (eventInfo?.EventHandlerType == null)
                {
                    continue;
                }

                var handler = Delegate.CreateDelegate(eventInfo.EventHandlerType, this, nameof(OnExternalExceptionNotice));
                eventInfo.AddEventHandler(null, handler);
                _externalFactoryHandlers.Add(handler);

                var snapshotMethod = factoryType.GetMethod("GetRecentSnapshot", BindingFlags.Public | BindingFlags.Static);
                if (snapshotMethod?.Invoke(null, null) is System.Collections.IEnumerable snapshot)
                {
                    foreach (var notice in snapshot)
                    {
                        AddExternalNotice(notice);
                    }
                }
            }
            catch (Exception ex)
            {
                Context?.Logger.Warning(ex, "Failed to attach external ExceptionFactory from assembly {Assembly}", assembly.FullName);
            }
        }
    }

    private void OnExternalExceptionNotice(object notice)
    {
        AddExternalNotice(notice);
    }

    private void AddExternalNotice(object notice)
    {
        if (notice == null)
        {
            return;
        }

        var entry = ExceptionEntry.FromExternal(notice);
        if (entry == null || !TryMarkSeen(entry.Id))
        {
            return;
        }

        if (StateStore != null)
        {
            StateStore.Update(state => state.Add(entry, MaxRecent));
            return;
        }

        State.Add(entry, MaxRecent);
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
}

public sealed class ExceptionsBitState : IBitState
{
    public int TotalCount { get; set; }
    public Dictionary<ExceptionSeverity, int> SeverityCounts { get; } = new();
    public List<ExceptionEntry> Recent { get; } = new();
    public ExceptionEntry? Last { get; set; }
    public DateTime? LastSeenUtc { get; set; }

    public void Add(ExceptionEntry entry, int maxRecent)
    {
        TotalCount++;
        Last = entry;
        LastSeenUtc = entry.TimestampUtc;

        if (SeverityCounts.TryGetValue(entry.Severity, out var current))
        {
            SeverityCounts[entry.Severity] = current + 1;
        }
        else
        {
            SeverityCounts[entry.Severity] = 1;
        }

        Recent.Insert(0, entry);
        if (Recent.Count > maxRecent)
        {
            Recent.RemoveRange(maxRecent, Recent.Count - maxRecent);
        }
    }
}

public sealed class ExceptionEntry
{
    public Guid Id { get; init; }
    public DateTime TimestampUtc { get; init; }
    public ExceptionSeverity Severity { get; init; }
    public string Message { get; init; } = string.Empty;
    public string? ExceptionType { get; init; }
    public string? Source { get; init; }
    public string? BitId { get; init; }
    public string? CorrelationId { get; init; }
    public string? StackTrace { get; init; }
    public IReadOnlyDictionary<string, string?>? Context { get; init; }

    public static ExceptionEntry FromNotice(ExceptionNotice notice)
    {
        return new ExceptionEntry
        {
            Id = notice.Id,
            TimestampUtc = notice.TimestampUtc,
            Severity = notice.Severity,
            Message = notice.Message,
            ExceptionType = notice.ExceptionType,
            Source = notice.Source,
            BitId = notice.BitId,
            CorrelationId = notice.CorrelationId,
            StackTrace = notice.StackTrace,
            Context = notice.Context
        };
    }

    public static ExceptionEntry? FromExternal(object notice)
    {
        var type = notice.GetType();

        var id = GetValue<Guid>(notice, type, "Id", Guid.NewGuid());
        var timestamp = GetDateTime(notice, type, "TimestampUtc");
        var severityValue = GetValue<object?>(notice, type, "Severity", null);
        var severity = ExceptionSeverity.Error;
        if (severityValue != null)
        {
            if (Enum.TryParse(severityValue.ToString(), out ExceptionSeverity parsed))
            {
                severity = parsed;
            }
        }

        var message = GetValue<string?>(notice, type, "Message", null) ?? string.Empty;

        return new ExceptionEntry
        {
            Id = id,
            TimestampUtc = timestamp,
            Severity = severity,
            Message = message,
            ExceptionType = GetValue<string?>(notice, type, "ExceptionType", null),
            Source = GetValue<string?>(notice, type, "Source", null),
            BitId = GetValue<string?>(notice, type, "BitId", null),
            CorrelationId = GetValue<string?>(notice, type, "CorrelationId", null),
            StackTrace = GetValue<string?>(notice, type, "StackTrace", null),
            Context = GetContext(notice, type)
        };
    }

    private static T GetValue<T>(object notice, Type type, string name, T fallback)
    {
        var prop = type.GetProperty(name, BindingFlags.Public | BindingFlags.Instance);
        if (prop == null)
        {
            return fallback;
        }

        var value = prop.GetValue(notice);
        if (value is T typed)
        {
            return typed;
        }

        return fallback;
    }

    private static DateTime GetDateTime(object notice, Type type, string name)
    {
        var prop = type.GetProperty(name, BindingFlags.Public | BindingFlags.Instance);
        if (prop == null)
        {
            return DateTime.UtcNow;
        }

        var value = prop.GetValue(notice);
        if (value is DateTime dt)
        {
            return dt;
        }

        if (value is DateTimeOffset dto)
        {
            return dto.UtcDateTime;
        }

        return DateTime.UtcNow;
    }

    private static IReadOnlyDictionary<string, string?>? GetContext(object notice, Type type)
    {
        var prop = type.GetProperty("Context", BindingFlags.Public | BindingFlags.Instance);
        if (prop == null)
        {
            return null;
        }

        var value = prop.GetValue(notice);
        if (value is IReadOnlyDictionary<string, string?> typed)
        {
            return typed;
        }

        if (value is System.Collections.IDictionary dict)
        {
            var result = new Dictionary<string, string?>();
            foreach (System.Collections.DictionaryEntry entry in dict)
            {
                if (entry.Key == null)
                {
                    continue;
                }
                result[entry.Key.ToString() ?? string.Empty] = entry.Value?.ToString();
            }
            return result;
        }

        return null;
    }
}
