using System.Text;

namespace Core.Bits;

public sealed class FileBitConfigStore : IBitConfigStore
{
    private readonly string _rootPath;
    private readonly object _sync = new();

    public FileBitConfigStore(string? rootPath = null)
    {
        _rootPath = rootPath ?? Path.Combine(AppContext.BaseDirectory, "configs");
        Directory.CreateDirectory(_rootPath);
    }

    public bool Exists(string bitId)
    {
        var path = GetConfigPath(bitId);
        return File.Exists(path);
    }

    public string? Read(string bitId)
    {
        var path = GetConfigPath(bitId);
        if (!File.Exists(path))
        {
            return null;
        }

        return File.ReadAllText(path);
    }

    public void Write(string bitId, string json)
    {
        var path = GetConfigPath(bitId);
        Directory.CreateDirectory(_rootPath);

        var tempPath = Path.Combine(_rootPath, $"{Path.GetFileName(path)}.{Guid.NewGuid():N}.tmp");

        lock (_sync)
        {
            File.WriteAllText(tempPath, json, Encoding.UTF8);
            File.Move(tempPath, path, true);
        }
    }

    private string GetConfigPath(string bitId)
    {
        var safeId = SanitizeFileName(bitId);
        return Path.Combine(_rootPath, $"{safeId}.json");
    }

    private static string SanitizeFileName(string name)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var builder = new StringBuilder(name.Length);

        foreach (var ch in name)
        {
            builder.Append(invalid.Contains(ch) ? '-' : ch);
        }

        return builder.ToString().Trim().ToLowerInvariant();
    }
}
