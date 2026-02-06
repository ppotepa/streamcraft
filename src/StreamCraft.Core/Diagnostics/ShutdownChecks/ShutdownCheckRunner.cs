using Microsoft.Extensions.Logging;

namespace StreamCraft.Core.Diagnostics.ShutdownChecks;

public sealed class ShutdownCheckRunner
{
    private readonly IEnumerable<IShutdownCheck> _checks;
    private readonly ILogger<ShutdownCheckRunner> _logger;
    private readonly ShutdownCheckContext _context;
    private ShutdownCheckReport? _lastReport;
    private int _completed;

    public event Action<ShutdownCheckProgress>? ProgressUpdated;
    public event Action<string>? CheckStarted;
    public event Action<ShutdownCheckResult>? CheckCompleted;

    public ShutdownCheckRunner(
        IEnumerable<IShutdownCheck> checks,
        ShutdownCheckContext context,
        ILogger<ShutdownCheckRunner> logger)
    {
        _checks = checks ?? Array.Empty<IShutdownCheck>();
        _context = context;
        _logger = logger;
    }

    public ShutdownCheckReport? GetLastReport() => _lastReport;

    public Task<ShutdownCheckReport> RunAsync(CancellationToken cancellationToken = default)
        => RunAsync(null, cancellationToken);

    public async Task<ShutdownCheckReport> RunAsync(ShutdownCheckStage? stage, CancellationToken cancellationToken = default)
    {
        var checks = stage.HasValue
            ? _checks.Where(check => check.Stage == stage.Value).ToList()
            : _checks.ToList();

        var results = new List<ShutdownCheckResult>();
        var startedUtc = DateTime.UtcNow;
        var overall = ShutdownCheckStatus.Ok;
        var total = checks.Count;
        _completed = 0;
        ProgressUpdated?.Invoke(new ShutdownCheckProgress
        {
            Total = total,
            Completed = _completed
        });

        foreach (var check in checks)
        {
            CheckStarted?.Invoke(check.Name);
            var sw = System.Diagnostics.Stopwatch.StartNew();
            ShutdownCheckResult result;
            try
            {
                result = await check.RunAsync(_context, cancellationToken).ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Shutdown check {CheckName} failed.", check.Name);
                result = ShutdownCheckResult.Fail(check.Name, ex.Message);
            }
            finally
            {
                sw.Stop();
            }

            if (result.Duration == TimeSpan.Zero)
            {
                result = new ShutdownCheckResult
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
            ProgressUpdated?.Invoke(new ShutdownCheckProgress
            {
                Total = total,
                Completed = _completed,
                CurrentName = result.Name,
                CurrentStatus = result.Status
            });

            if (result.Status == ShutdownCheckStatus.Fail)
            {
                overall = ShutdownCheckStatus.Fail;
            }
            else if (result.Status == ShutdownCheckStatus.Warning && overall == ShutdownCheckStatus.Ok)
            {
                overall = ShutdownCheckStatus.Warning;
            }
        }

        var report = new ShutdownCheckReport
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
