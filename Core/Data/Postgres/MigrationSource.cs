using Core.Diagnostics;
using System.Reflection;

namespace Core.Data.Postgres;

public sealed record MigrationScript(string Id, string Sql);

public sealed record MigrationSource(string ScopeId, IReadOnlyList<MigrationScript> Scripts, string? AllowedTablePrefix)
{
    public static MigrationSource FromEmbeddedResources(string scopeId, Assembly assembly, string resourcePrefix, string? allowedTablePrefix = null)
    {
        if (assembly == null) throw ExceptionFactory.ArgumentNull(nameof(assembly));
        if (string.IsNullOrWhiteSpace(resourcePrefix)) throw ExceptionFactory.ArgumentNull(nameof(resourcePrefix));

        var resources = assembly.GetManifestResourceNames()
            .Where(name => name.StartsWith(resourcePrefix, StringComparison.OrdinalIgnoreCase)
                           && name.EndsWith(".sql", StringComparison.OrdinalIgnoreCase))
            .OrderBy(name => name, StringComparer.OrdinalIgnoreCase)
            .ToList();

        var scripts = new List<MigrationScript>(resources.Count);
        foreach (var resource in resources)
        {
            using var stream = assembly.GetManifestResourceStream(resource);
            if (stream == null)
            {
                continue;
            }

            using var reader = new StreamReader(stream);
            var sql = reader.ReadToEnd();
            var id = ExtractMigrationId(resource);
            if (!string.IsNullOrWhiteSpace(sql) && !string.IsNullOrWhiteSpace(id))
            {
                scripts.Add(new MigrationScript(id, sql));
            }
        }

        return new MigrationSource(scopeId, scripts, allowedTablePrefix);
    }

    public static MigrationSource FromDirectory(string scopeId, string directoryPath, string? allowedTablePrefix = null)
    {
        if (string.IsNullOrWhiteSpace(directoryPath))
        {
            return new MigrationSource(scopeId, Array.Empty<MigrationScript>(), allowedTablePrefix);
        }

        if (!Directory.Exists(directoryPath))
        {
            return new MigrationSource(scopeId, Array.Empty<MigrationScript>(), allowedTablePrefix);
        }

        var files = Directory.GetFiles(directoryPath, "*.sql", SearchOption.TopDirectoryOnly)
            .OrderBy(path => path, StringComparer.OrdinalIgnoreCase)
            .ToList();

        var scripts = new List<MigrationScript>(files.Count);
        foreach (var file in files)
        {
            var sql = File.ReadAllText(file);
            var id = Path.GetFileNameWithoutExtension(file);
            if (!string.IsNullOrWhiteSpace(sql) && !string.IsNullOrWhiteSpace(id))
            {
                scripts.Add(new MigrationScript(id, sql));
            }
        }

        return new MigrationSource(scopeId, scripts, allowedTablePrefix);
    }

    private static string ExtractMigrationId(string resourceName)
    {
        var parts = resourceName.Split('.');
        return parts.Length < 2 ? resourceName : parts[^2];
    }
}
