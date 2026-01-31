using Microsoft.Extensions.Logging;

namespace Core.Diagnostics.StartupChecks;

public sealed class StartupCheckRunner
{
    private readonly IEnumerable<IStartupCheck> _checks;
    private readonly ILogger<StartupCheckRunner> _logger;
    private readonly StartupCheckContext _context;
    private StartupCheckReport? _lastReport;
    private int _completed;

    public event Action<StartupCheckProgress>? ProgressUpdated;
    public event Action<string>? CheckStarted;
    public event Action<StartupCheckResult>? CheckCompleted;

    public StartupCheckRunner(
        IEnumerable<IStartupCheck> checks,
        StartupCheckContext context,
        ILogger<StartupCheckRunner> logger)
    {
        _checks = checks ?? Array.Empty<IStartupCheck>();
        _context = context;
        _logger = logger;
    }

    public StartupCheckReport? GetLastReport() => _lastReport;

    public async Task<StartupCheckReport> RunAsync(CancellationToken cancellationToken = default)
    {
        var results = new List<StartupCheckResult>();
        var startedUtc = DateTime.UtcNow;
        var overall = StartupCheckStatus.Ok;
        var total = _checks.Count();
        _completed = 0;
        ProgressUpdated?.Invoke(new StartupCheckProgress
        {
            Total = total,
            Completed = _completed
        });

        foreach (var check in _checks)
        {
            CheckStarted?.Invoke(check.Name);
            var sw = System.Diagnostics.Stopwatch.StartNew();
            StartupCheckResult result;
            try
            {
                result = await check.RunAsync(_context, cancellationToken).ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Startup check {CheckName} failed.", check.Name);
                result = StartupCheckResult.Fail(check.Name, ex.Message);
            }
            finally
            {
                sw.Stop();
            }

            if (result.Duration == TimeSpan.Zero)
            {
                result = new StartupCheckResult
                {
                    Name = result.Name,
                    Status = result.Status,
                    Message = result.Message,
                    Details = result.Details,
                    Duration = sw.Elapsed,
                    TimestampUtc = result.TimestampUtc
                };
            }

            results.Add(result);
            _completed++;
            CheckCompleted?.Invoke(result);
            ProgressUpdated?.Invoke(new StartupCheckProgress
            {
                Total = total,
                Completed = _completed,
                CurrentName = result.Name,
                CurrentStatus = result.Status
            });

            if (result.Status == StartupCheckStatus.Fail)
            {
                overall = StartupCheckStatus.Fail;
            }
            else if (result.Status == StartupCheckStatus.Warning && overall == StartupCheckStatus.Ok)
            {
                overall = StartupCheckStatus.Warning;
            }
        }

        var report = new StartupCheckReport
        {
            StartedUtc = startedUtc,
            CompletedUtc = DateTime.UtcNow,
            OverallStatus = overall,
            Results = results
        };

        _lastReport = report;
        return report;
    }
}
