using Serilog;
using Serilog.Formatting.Compact;

namespace Core.Logging;

public static class LoggerFactory
{
    private static readonly string LogsFolder = "logs";
    public static string? CurrentRunId { get; private set; }

    public static ILogger CreateLogger()
    {
        // Ensure logs directory exists
        if (!Directory.Exists(LogsFolder))
        {
            Directory.CreateDirectory(LogsFolder);
        }

        var runId = GetRunId();
        CurrentRunId = runId;
        var logFilePath = Path.Combine(LogsFolder, $"{runId}.log");
        var formatter = new CompactJsonFormatter();

        var logger = new LoggerConfiguration()
            .MinimumLevel.Debug()
            .Enrich.FromLogContext()
            .Enrich.WithProperty("RunId", runId)
            .WriteTo.Console(
                outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
            .WriteTo.File(
                formatter: formatter,
                path: logFilePath,
                rollingInterval: RollingInterval.Infinite)
            .WriteTo.Sink(new PerBitFileSink(LogsFolder, runId, formatter))
            .CreateLogger();

        Log.Logger = logger;

        logger.Information("Logger initialized. Logging to: {LogFile}", logFilePath);

        return logger;
    }

    private static string GetRunId()
    {
        var today = DateTime.Now.Date;
        var datePrefix = today.ToString("yyyyMMdd");

        var existingFiles = Directory.GetFiles(LogsFolder, $"{datePrefix}.*.log");

        int runNo = 1;

        if (existingFiles.Length > 0)
        {
            // Find the highest run number for today
            var runNumbers = existingFiles
                .Select(f => Path.GetFileNameWithoutExtension(f))
                .Where(f => f.StartsWith(datePrefix, StringComparison.Ordinal))
                .Select(f =>
                {
                    var parts = f.Split('.', StringSplitOptions.RemoveEmptyEntries);
                    if (parts.Length >= 2 && int.TryParse(parts[1], out var num))
                    {
                        return num;
                    }
                    return 0;
                })
                .Where(n => n > 0)
                .ToList();

            if (runNumbers.Any())
            {
                runNo = runNumbers.Max() + 1;
            }
        }

        return $"{datePrefix}.{runNo}";
    }
}
