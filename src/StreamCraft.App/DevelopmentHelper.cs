using System.Diagnostics;

namespace StreamCraft.App;

internal interface IDevelopmentHelper
{
    string? EnsureDevelopmentEnvironment();
}

internal sealed class DevelopmentHelper : IDevelopmentHelper
{
    public string? EnsureDevelopmentEnvironment()
    {
        var current = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
        if (!string.IsNullOrWhiteSpace(current))
        {
            return null;
        }

        var watchModeEnabled = string.Equals(
            Environment.GetEnvironmentVariable("STREAMCRAFT_WATCH_MODE"),
            "1",
            StringComparison.OrdinalIgnoreCase);

        if (watchModeEnabled)
        {
            Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Development");
            return "watch mode enabled";
        }

        if (Debugger.IsAttached)
        {
            Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Development");
            return "debugger attached";
        }

        return null;
    }
}
