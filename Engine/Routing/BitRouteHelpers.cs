using Core.Bits;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.FileProviders;

namespace Engine.Routing;

internal static class BitRouteHelpers
{
    public static string GetStateKey(IBit bit)
    {
        var route = (bit.Route ?? string.Empty).Trim('/');
        if (!string.IsNullOrWhiteSpace(route))
        {
            return route.ToLowerInvariant();
        }

        return bit.Name.Trim().ToLowerInvariant();
    }

    public static string? TryResolveUiRoot(IBit bit)
    {
        var assemblyLocation = Path.GetDirectoryName(bit.GetType().Assembly.Location);
        if (string.IsNullOrWhiteSpace(assemblyLocation))
        {
            return null;
        }

        var distPath = Path.Combine(assemblyLocation, "ui", "dist");
        if (Directory.Exists(distPath))
        {
            return distPath;
        }

        var uiPath = Path.Combine(assemblyLocation, "ui");
        return Directory.Exists(uiPath) ? uiPath : null;
    }

    public static string? TryResolveDebugRoot(IBit bit)
    {
        var uiRoot = TryResolveUiRoot(bit);
        if (!string.IsNullOrWhiteSpace(uiRoot))
        {
            var uiDebug = Path.Combine(uiRoot, "debug");
            if (Directory.Exists(uiDebug))
            {
                return uiDebug;
            }
        }

        var assemblyLocation = Path.GetDirectoryName(bit.GetType().Assembly.Location);
        if (string.IsNullOrWhiteSpace(assemblyLocation))
        {
            return null;
        }

        var debugDist = Path.Combine(assemblyLocation, "debug", "dist");
        if (Directory.Exists(debugDist))
        {
            return debugDist;
        }

        var debugRoot = Path.Combine(assemblyLocation, "debug");
        return Directory.Exists(debugRoot) ? debugRoot : null;
    }

    public static void ConfigureUiStaticFiles(IApplicationBuilder app, string uiRoot)
    {
        var fileProvider = new PhysicalFileProvider(uiRoot);

        app.UseDefaultFiles(new DefaultFilesOptions
        {
            FileProvider = fileProvider
        });

        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = fileProvider
        });

        app.Run(async context =>
        {
            if (!Path.HasExtension(context.Request.Path.Value ?? string.Empty))
            {
                var indexPath = Path.Combine(uiRoot, "index.html");
                if (File.Exists(indexPath))
                {
                    context.Response.ContentType = "text/html";
                    await context.Response.SendFileAsync(indexPath);
                    return;
                }
            }

            context.Response.StatusCode = StatusCodes.Status404NotFound;
            await context.Response.WriteAsync("UI file not found.");
        });
    }
}
