using Serilog;

namespace StreamCraft.Core.Logging;

public static class LoggerFactory
{
    private static readonly string LogsFolder = "logs";

    public static ILogger CreateLogger()
    {
        // Ensure logs directory exists
        if (!Directory.Exists(LogsFolder))
        {
            Directory.CreateDirectory(LogsFolder);
        }

        var logFilePath = GetLogFilePath();

        var logger = new LoggerConfiguration()
            .MinimumLevel.Debug()
            .WriteTo.Console(
                outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
            .WriteTo.File(
                path: logFilePath,
                outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff} {Level:u3}] {Message:lj}{NewLine}{Exception}",
                rollingInterval: RollingInterval.Infinite)
            .CreateLogger();

        Log.Logger = logger;

        logger.Information("Logger initialized. Logging to: {LogFile}", logFilePath);

        return logger;
    }

    private static string GetLogFilePath()
    {
        var today = DateTime.Now.Date;
        var datePrefix = today.ToString("yyyyMMdd");

        var existingFiles = Directory.GetFiles(LogsFolder, $"{datePrefix}*.txt");

        int runNo = 1;

        if (existingFiles.Length > 0)
        {
            // Find the highest run number for today
            var runNumbers = existingFiles
                .Select(f => Path.GetFileNameWithoutExtension(f))
                .Where(f => f.StartsWith(datePrefix))
                .Select(f =>
                {
                    var parts = f.Substring(datePrefix.Length);
                    if (int.TryParse(parts, out int num))
                        return num;
                    return 0;
                })
                .Where(n => n > 0)
                .ToList();

            if (runNumbers.Any())
            {
                runNo = runNumbers.Max() + 1;
            }
        }

        var fileName = $"{datePrefix}{runNo}.txt";
        return Path.Combine(LogsFolder, fileName);
    }
}
