using StreamCraft.Core.Logging;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

namespace Hosting;

public static class HealthEndpoints
{
    public static void MapStreamCraftHealthEndpoints(this WebApplication app)
    {
        app.MapGet("/health", () => BuildLiveResponse());

        app.MapGet("/health/live", () => Results.Ok(BuildLiveResponse()));

        app.MapGet("/health/ready", () =>
        {
            var readiness = CheckReadiness();
            return readiness.IsReady
                ? Results.Ok(readiness.Payload)
                : Results.Json(readiness.Payload, statusCode: StatusCodes.Status503ServiceUnavailable);
        });
    }

    private static object BuildLiveResponse()
    {
        var runId = LoggerFactory.CurrentRunId ?? "unknown";
        return new
        {
            status = "ok",
            runId
        };
    }

    private static (bool IsReady, object Payload) CheckReadiness()
    {
        var runId = LoggerFactory.CurrentRunId ?? "unknown";
        var root = AppContext.BaseDirectory;
        var checks = new List<object>();
        var isReady = true;

        isReady &= EnsureFolder(Path.Combine(root, "data", "layouts"), "data/layouts", checks);
        isReady &= EnsureFolder(Path.Combine(root, "data", "assets"), "data/assets", checks);
        isReady &= EnsureFolder(Path.Combine(root, "logs"), "logs", checks);

        var payload = new
        {
            status = isReady ? "ok" : "degraded",
            runId,
            checks
        };

        return (isReady, payload);
    }

    private static bool EnsureFolder(string absolutePath, string name, List<object> checks)
    {
        try
        {
            if (!Directory.Exists(absolutePath))
            {
                Directory.CreateDirectory(absolutePath);
            }

            checks.Add(new { name, status = "ok", path = absolutePath });
            return true;
        }
        catch (Exception ex)
        {
            checks.Add(new { name, status = "error", path = absolutePath, error = ex.Message });
            return false;
        }
    }
}

