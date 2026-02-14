using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using StreamCraft.Core.Bits;

namespace StreamCraft.Bits.StreamApiMock;

[BitRoute("/stream-api-mock")]
public sealed class StreamApiMockBit : StreamBit<StreamApiMockBitState>
{
    public override string Name => "Stream API Mock";
    public override string Description => "Dev-only Twitch-style signal generator for exercising triggers and overlays.";

    public override async Task HandleAsync(HttpContext httpContext)
    {
        if (!HttpMethods.IsGet(httpContext.Request.Method))
        {
            httpContext.Response.StatusCode = StatusCodes.Status405MethodNotAllowed;
            return;
        }

        var history = httpContext.RequestServices.GetRequiredService<StreamApiMockHistory>();
        var stats = httpContext.RequestServices.GetRequiredService<StreamApiMockStatistics>();
        var registry = httpContext.RequestServices.GetRequiredService<IStreamApiMockScenarioRegistry>();
        var options = httpContext.RequestServices.GetRequiredService<IOptions<StreamApiMockOptions>>().Value;

        var snapshot = stats.Snapshot();
        var last = snapshot.LastRecord;

        State.TotalEvents = snapshot.TotalEvents;
        State.LastEventUtc = last?.TimestampUtc;
        State.LastScenarioId = last?.ScenarioId;
        State.LastMessageType = last?.MessageType;

        var scenarios = registry.List()
            .Select(s => new StreamApiMockScenarioSummary(s.Id, s.Name, s.Category, s.Description, s.MessageType.ToString()))
            .ToArray();

        var response = new StreamApiMockStatusResponse(
            Name,
            options.Enabled && StreamApiMockDefaults.IsDevelopmentEnvironment(),
            options.SourceName,
            snapshot.TotalEvents,
            last,
            scenarios,
            history.Snapshot());

        httpContext.Response.ContentType = "application/json";
        await httpContext.Response.WriteAsJsonAsync(response, cancellationToken: httpContext.RequestAborted);
    }
}

public sealed record StreamApiMockStatusResponse(
    string Name,
    bool Enabled,
    string Source,
    long TotalEvents,
    StreamApiMockEventRecord? LastEvent,
    IReadOnlyList<StreamApiMockScenarioSummary> Scenarios,
    IReadOnlyList<StreamApiMockEventRecord> History);
