using StreamCraft.Core.Bits;
using StreamCraft.Core.Diagnostics;
using StreamCraft.Core.Logging;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using System.Reflection;

namespace StreamCraft.Engine.Controllers;

[ApiController]
[Route("diagnostics")]
public sealed class DiagnosticsController : ControllerBase
{
    private readonly IBitsRegistry _bitsRegistry;
    private readonly EngineRuntimeMetadata _metadata;
    private readonly IExceptionStream _exceptionStream;
    private readonly ILogEventStream? _logStream;
    private readonly Serilog.ILogger _logger;
    private readonly IWebHostEnvironment _environment;

    public DiagnosticsController(
        IBitsRegistry bitsRegistry,
        EngineRuntimeMetadata metadata,
        IExceptionStream exceptionStream,
        IWebHostEnvironment environment,
        Serilog.ILogger logger,
        ILogEventStream? logStream = null)
    {
        _bitsRegistry = bitsRegistry;
        _metadata = metadata;
        _exceptionStream = exceptionStream;
        _environment = environment;
        _logger = logger;
        _logStream = logStream;
    }

    [HttpGet("build")]
    public IActionResult GetBuild()
    {
        var runId = LoggerFactory.CurrentRunId ?? "unknown";
        var assembly = Assembly.GetEntryAssembly() ?? typeof(DiagnosticsController).Assembly;
        var informationalVersion = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion;
        var version = informationalVersion ?? assembly.GetName().Version?.ToString() ?? "unknown";

        return Ok(new
        {
            service = "StreamCraft",
            version,
            environment = _environment.EnvironmentName,
            runId,
            startedAtUtc = _metadata.StartTimeUtc
        });
    }

    [HttpGet("overlays")]
    public IActionResult GetOverlays()
    {
        var runId = LoggerFactory.CurrentRunId ?? "unknown";
        var overlays = _bitsRegistry.GetAllBits()
            .Select(bit => new
            {
                name = bit.Name,
                route = bit.Route,
                description = bit.Description,
                hasUi = bit.HasUserInterface
            })
            .ToList();

        var recentErrors = _exceptionStream.GetRecent()
            .Where(e => e.Severity >= ExceptionSeverity.Error)
            .OrderByDescending(e => e.TimestampUtc)
            .Take(20)
            .Select(e => new
            {
                e.Message,
                e.Severity,
                e.Source,
                e.BitId,
                e.CorrelationId,
                e.TraceId,
                e.TimestampUtc
            })
            .ToList();

        var result = new
        {
            runId,
            startedUtc = _metadata.StartTimeUtc,
            activeOverlays = overlays,
            connectedClients = 0,
            lastErrors = recentErrors
        };

        _logger.Information("Diagnostics overlays requested. {OverlayCount} overlays reported.", overlays.Count);

        return Ok(result);
    }

    [HttpGet("workflows")]
    public IActionResult GetWorkflows()
    {
        var recent = _exceptionStream.GetRecent();
        var workflowFailures = recent
            .Where(e => !string.IsNullOrWhiteSpace(e.Source) && e.Source!.Contains("workflow", StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(e => e.TimestampUtc)
            .Take(20)
            .Select(e => new
            {
                e.Message,
                e.Severity,
                e.Source,
                e.BitId,
                e.CorrelationId,
                e.TimestampUtc
            })
            .ToList();

        var lastRuns = _logStream == null
            ? new List<object>()
            : _logStream.GetRecent()
                .Where(e => ((e.Properties != null && e.Properties.TryGetValue("WorkflowId", out var _)) ||
                             (e.SourceContext != null && e.SourceContext.Contains("Workflow", StringComparison.OrdinalIgnoreCase))))
                .OrderByDescending(e => e.TimestampUtc)
                .Take(20)
                .Select(e =>
                {
                    string? workflowValue = null;
                    var hasWorkflowId = e.Properties != null && e.Properties.TryGetValue("WorkflowId", out workflowValue);
                    return (object)new
                    {
                        e.TimestampUtc,
                        e.Level,
                        e.Message,
                        e.SourceContext,
                        workflowId = hasWorkflowId ? workflowValue : null
                    };
                })
                .ToList();

        return Ok(new
        {
            status = workflowFailures.Count == 0 && lastRuns.Count == 0 ? "idle" : "active",
            lastRuns,
            lastFailures = workflowFailures
        });
    }
}
