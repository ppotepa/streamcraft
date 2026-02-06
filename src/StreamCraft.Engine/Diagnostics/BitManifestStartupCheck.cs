using System.Diagnostics;
using StreamCraft.Core.Diagnostics.StartupChecks;
using StreamCraft.Engine.Services;

namespace StreamCraft.Engine.Diagnostics;

internal sealed class BitManifestStartupCheck : IStartupCheck
{
    private readonly IReadOnlyList<BitDescriptor> _bits;

    public BitManifestStartupCheck(IReadOnlyList<BitDescriptor> bits)
    {
        _bits = bits ?? Array.Empty<BitDescriptor>();
    }

    public string Name => "BitManifest";
    public bool IsCritical => false;
    public StartupCheckStage Stage => StartupCheckStage.PreMigrations;

    public Task<StartupCheckResult> RunAsync(StartupCheckContext context, CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        var issues = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);

        foreach (var bit in _bits)
        {
            var manifest = bit.Manifest;
            if (manifest == null)
            {
                continue;
            }

            var messages = new List<string>();

            var expectsBitTypes = (manifest.BitTypes != null && manifest.BitTypes.Count > 0) ||
                                  !string.IsNullOrWhiteSpace(manifest.BitType);
            if (expectsBitTypes && bit.BitTypes.Count == 0)
            {
                messages.Add("manifest bitTypes specified but none resolved");
            }

            var expectsEntrypoints = (manifest.Entrypoints != null && manifest.Entrypoints.Count > 0) ||
                                     !string.IsNullOrWhiteSpace(manifest.Entrypoint);
            if (expectsEntrypoints && bit.Entrypoints.Count == 0)
            {
                messages.Add("manifest entrypoints specified but none resolved");
            }

            if (manifest.Ui?.Enabled == true)
            {
                if (string.IsNullOrWhiteSpace(manifest.Ui.Dist))
                {
                    messages.Add("ui.enabled true but ui.dist missing");
                }
                else
                {
                    var uiPath = Path.Combine(bit.BitDirectory, manifest.Ui.Dist);
                    if (!Directory.Exists(uiPath))
                    {
                        messages.Add($"ui dist missing: {uiPath}");
                    }
                }
            }

            if (messages.Count > 0)
            {
                issues[bit.BitId] = string.Join(" | ", messages);
            }
        }

        stopwatch.Stop();

        if (issues.Count == 0)
        {
            return Task.FromResult(StartupCheckResult.Ok(Name, "Bit manifests validated.", duration: stopwatch.Elapsed));
        }

        return Task.FromResult(StartupCheckResult.Warning(
            Name,
            $"Bit manifest warnings: {issues.Count}",
            issues,
            stopwatch.Elapsed));
    }
}
