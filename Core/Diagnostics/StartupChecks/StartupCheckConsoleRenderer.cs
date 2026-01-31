using System.Text;

namespace Core.Diagnostics.StartupChecks;

public sealed class StartupCheckConsoleRenderer : IDisposable
{
    private readonly StartupCheckRunner _runner;
    private readonly List<(string Name, StartupCheckStatus? Status)> _rows = new();
    private bool _active;
    private int _lastRenderLines;

    public StartupCheckConsoleRenderer(StartupCheckRunner runner)
    {
        _runner = runner;
        _runner.CheckStarted += OnCheckStarted;
        _runner.CheckCompleted += OnCheckCompleted;
        _runner.ProgressUpdated += OnProgressUpdated;
        _active = true;
        Console.CursorVisible = false;
    }

    private void OnCheckStarted(string name)
    {
        _rows.Add((name, null));
        Render(new StartupCheckProgress
        {
            Total = _rows.Count,
            Completed = _rows.Count(r => r.Status.HasValue)
        });
    }

    private void OnCheckCompleted(StartupCheckResult result)
    {
        for (var i = 0; i < _rows.Count; i++)
        {
            if (string.Equals(_rows[i].Name, result.Name, StringComparison.OrdinalIgnoreCase))
            {
                _rows[i] = (result.Name, result.Status);
                break;
            }
        }
    }

    private void OnProgressUpdated(StartupCheckProgress progress)
    {
        Render(progress);
    }

    private void Render(StartupCheckProgress progress)
    {
        if (!_active)
        {
            return;
        }

        var sb = new StringBuilder();
        var total = Math.Max(progress.Total, _rows.Count);
        var completed = Math.Max(progress.Completed, _rows.Count(r => r.Status.HasValue));

        var barWidth = 28;
        var filled = total == 0 ? 0 : (int)Math.Round((completed / (double)total) * barWidth);
        filled = Math.Clamp(filled, 0, barWidth);
        var bar = new string('█', filled) + new string('░', barWidth - filled);

        sb.AppendLine("StreamCraft Startup Checks");
        sb.AppendLine($"[{bar}] {completed}/{Math.Max(total, 1)}");
        sb.AppendLine();

        foreach (var (name, status) in _rows)
        {
            sb.AppendLine($"{FormatStatus(status)} {name}");
        }

        sb.AppendLine();
        sb.AppendLine("Press Ctrl+C to abort startup...");

        var output = sb.ToString();
        ClearPreviousRender();
        Console.Write(output);
        _lastRenderLines = output.Split('\n').Length;
    }

    private void ClearPreviousRender()
    {
        if (_lastRenderLines <= 0)
        {
            Console.Clear();
            return;
        }

        var currentTop = Console.CursorTop;
        var top = Math.Max(0, currentTop - _lastRenderLines);
        Console.SetCursorPosition(0, top);
        for (var i = 0; i < _lastRenderLines; i++)
        {
            Console.WriteLine(new string(' ', Console.WindowWidth));
        }
        Console.SetCursorPosition(0, top);
    }

    private static string FormatStatus(StartupCheckStatus? status)
    {
        return status switch
        {
            StartupCheckStatus.Ok => "[ OK ]",
            StartupCheckStatus.Warning => "[WARN]",
            StartupCheckStatus.Fail => "[FAIL]",
            _ => "[....]"
        };
    }

    public void Dispose()
    {
        if (!_active)
        {
            return;
        }

        _active = false;
        _runner.CheckStarted -= OnCheckStarted;
        _runner.CheckCompleted -= OnCheckCompleted;
        _runner.ProgressUpdated -= OnProgressUpdated;
        Console.CursorVisible = true;
    }
}
