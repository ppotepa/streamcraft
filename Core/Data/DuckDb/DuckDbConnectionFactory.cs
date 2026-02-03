using DuckDB.NET.Data;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Core.Data.DuckDb;

public interface IDuckDbConnectionFactory
{
    DuckDBConnection OpenConnection();
    string DatabasePath { get; }
}

public sealed class DuckDbConnectionFactory : IDuckDbConnectionFactory
{
    private readonly ILogger<DuckDbConnectionFactory> _logger;
    private readonly string _databasePath;

    public DuckDbConnectionFactory(IOptions<DuckDbOptions> options, ILogger<DuckDbConnectionFactory> logger)
    {
        _logger = logger;
        var configuredPath = options.Value.Path;
        if (string.IsNullOrWhiteSpace(configuredPath))
        {
            var baseDir = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            configuredPath = Path.Combine(baseDir, "StreamCraft", "streamcraft.duckdb");
        }

        var directory = Path.GetDirectoryName(configuredPath);
        if (!string.IsNullOrWhiteSpace(directory) && !Directory.Exists(directory))
        {
            Directory.CreateDirectory(directory);
        }

        _databasePath = configuredPath;
        _logger.LogInformation("DuckDB database path: {Path}", _databasePath);
    }

    public string DatabasePath => _databasePath;

    public DuckDBConnection OpenConnection()
    {
        var connection = new DuckDBConnection($"DataSource={_databasePath}");
        connection.Open();
        return connection;
    }
}
