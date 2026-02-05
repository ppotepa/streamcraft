using Serilog;
using System.Text.Json;

namespace StreamCraft.Core.Designer.Layouts;

public sealed class FileOverlayLayoutStore : IOverlayLayoutStore
{
    private readonly string _rootPath;
    private readonly string _layoutsPath;
    private readonly ILogger _logger;
    private readonly JsonSerializerOptions _serializerOptions;

    public FileOverlayLayoutStore(string rootPath, ILogger logger)
    {
        _rootPath = rootPath ?? throw new ArgumentNullException(nameof(rootPath));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _layoutsPath = Path.Combine(_rootPath, "data", "layouts");
        _serializerOptions = new JsonSerializerOptions
        {
            WriteIndented = true
        };
    }

    public async Task<OverlayLayoutDefinition?> GetAsync(string layoutId, CancellationToken ct)
    {
        ValidateLayoutId(layoutId);
        EnsureLayoutDirectory();

        var path = GetLayoutPath(layoutId);
        if (!File.Exists(path))
        {
            return null;
        }

        await using var stream = File.OpenRead(path);
        var layout = await JsonSerializer.DeserializeAsync<OverlayLayoutDefinition>(stream, _serializerOptions, ct)
            .ConfigureAwait(false);

        if (layout == null)
        {
            return null;
        }

        ValidateSchemaVersion(layout, path);
        EnsureLayoutIdMatches(layout, layoutId, path);

        return layout;
    }

    public async Task SaveAsync(OverlayLayoutDefinition layout, CancellationToken ct)
    {
        if (layout == null) throw new ArgumentNullException(nameof(layout));

        ValidateLayoutId(layout.LayoutId);
        ValidateSchemaVersion(layout, GetLayoutPath(layout.LayoutId));

        layout.UpdatedAtUtc = DateTime.UtcNow;
        EnsureLayoutDirectory();

        var targetPath = GetLayoutPath(layout.LayoutId);
        var tempPath = targetPath + ".tmp";

        await using (var stream = new FileStream(tempPath, FileMode.Create, FileAccess.Write, FileShare.None, 4096, FileOptions.WriteThrough))
        {
            await JsonSerializer.SerializeAsync(stream, layout, _serializerOptions, ct).ConfigureAwait(false);
            await stream.FlushAsync(ct).ConfigureAwait(false);
        }

        if (File.Exists(targetPath))
        {
            if (OperatingSystem.IsWindows())
            {
                File.Replace(tempPath, targetPath, null, ignoreMetadataErrors: true);
            }
            else
            {
                File.Move(tempPath, targetPath, overwrite: true);
            }
        }
        else
        {
            File.Move(tempPath, targetPath);
        }
    }

    public async Task<IReadOnlyList<OverlayLayoutSummary>> ListAsync(CancellationToken ct)
    {
        EnsureLayoutDirectory();

        var results = new List<OverlayLayoutSummary>();
        foreach (var file in Directory.EnumerateFiles(_layoutsPath, "*.json", SearchOption.TopDirectoryOnly))
        {
            ct.ThrowIfCancellationRequested();

            await using var stream = File.OpenRead(file);
            var layout = await JsonSerializer.DeserializeAsync<OverlayLayoutDefinition>(stream, _serializerOptions, ct)
                .ConfigureAwait(false);

            if (layout == null)
            {
                continue;
            }

            if (layout.SchemaVersion > OverlayLayoutDefinition.SupportedSchemaVersion)
            {
                continue;
            }

            results.Add(new OverlayLayoutSummary(layout.LayoutId, layout.Name, layout.UpdatedAtUtc));
        }

        return results;
    }

    public Task<bool> DeleteAsync(string layoutId, CancellationToken ct)
    {
        ValidateLayoutId(layoutId);
        EnsureLayoutDirectory();

        var path = GetLayoutPath(layoutId);
        if (!File.Exists(path))
        {
            return Task.FromResult(false);
        }

        File.Delete(path);
        return Task.FromResult(true);
    }

    private void ValidateSchemaVersion(OverlayLayoutDefinition layout, string path)
    {
        if (layout.SchemaVersion > OverlayLayoutDefinition.SupportedSchemaVersion)
        {
            throw new UnsupportedSchemaVersionException(layout.LayoutId, layout.SchemaVersion, OverlayLayoutDefinition.SupportedSchemaVersion);
        }

        if (layout.SchemaVersion < OverlayLayoutDefinition.SupportedSchemaVersion)
        {
            _logger.Warning("Layout {LayoutId} at {Path} uses older schema version {SchemaVersion}.", layout.LayoutId, path, layout.SchemaVersion);
        }
    }

    private void EnsureLayoutDirectory()
    {
        if (!Directory.Exists(_layoutsPath))
        {
            Directory.CreateDirectory(_layoutsPath);
        }
    }

    private string GetLayoutPath(string layoutId)
    {
        return Path.Combine(_layoutsPath, $"{layoutId}.json");
    }

    private static void ValidateLayoutId(string layoutId)
    {
        if (string.IsNullOrWhiteSpace(layoutId))
        {
            throw new ArgumentException("LayoutId is required.", nameof(layoutId));
        }

        if (layoutId.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0)
        {
            throw new ArgumentException("LayoutId contains invalid characters.", nameof(layoutId));
        }
    }

    private static void EnsureLayoutIdMatches(OverlayLayoutDefinition layout, string layoutId, string path)
    {
        if (!string.Equals(layout.LayoutId, layoutId, StringComparison.Ordinal))
        {
            throw new InvalidDataException($"Layout id mismatch in {path}. Expected '{layoutId}', found '{layout.LayoutId}'.");
        }
    }
}



