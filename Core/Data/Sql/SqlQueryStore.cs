using Microsoft.Extensions.Configuration;
using System.Collections.Concurrent;
using System.Reflection;

namespace Core.Data.Sql;

public sealed class SqlQueryStore : ISqlQueryStore
{
    private readonly Assembly _assembly;
    private readonly string? _overridePath;
    private readonly ConcurrentDictionary<string, string> _cache = new(StringComparer.OrdinalIgnoreCase);

    public SqlQueryStore(IConfiguration configuration)
    {
        _assembly = typeof(SqlQueryStore).Assembly;
        _overridePath = configuration["StreamCraft:Sql:QueryPath"];
    }

    public string Get(string key)
    {
        var normalized = NormalizeKey(key);
        return _cache.GetOrAdd(normalized, LoadQuery);
    }

    private string LoadQuery(string normalizedKey)
    {
        var filePath = ResolveFilePath(normalizedKey);
        if (filePath != null && File.Exists(filePath))
        {
            return File.ReadAllText(filePath);
        }

        var resourceName = $"Sql.Queries.{normalizedKey.Replace('/', '.')}.sql";
        var fullName = $"{_assembly.GetName().Name}.{resourceName}";
        var stream = _assembly.GetManifestResourceStream(fullName) ??
                     _assembly.GetManifestResourceStream(resourceName);
        if (stream == null)
        {
            var fallback = _assembly.GetManifestResourceNames()
                .FirstOrDefault(n => n.EndsWith(resourceName, StringComparison.OrdinalIgnoreCase));
            if (fallback != null)
            {
                stream = _assembly.GetManifestResourceStream(fallback);
            }
        }
        if (stream == null)
        {
            throw new InvalidOperationException($"SQL resource not found: {fullName}");
        }

        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }

    private string? ResolveFilePath(string normalizedKey)
    {
        string? basePath = _overridePath;
        if (string.IsNullOrWhiteSpace(basePath))
        {
            var contentRoot = AppContext.BaseDirectory;
            basePath = Path.Combine(contentRoot, "sql", "queries");
        }

        var relative = normalizedKey.Replace('/', Path.DirectorySeparatorChar) + ".sql";
        return Path.Combine(basePath, relative);
    }

    private static string NormalizeKey(string key)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            throw new ArgumentException("SQL key cannot be empty.", nameof(key));
        }

        var normalized = key.Trim().Replace('\\', '/').Trim('/');
        return normalized.ToLowerInvariant();
    }
}
