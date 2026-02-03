using Core.Data.Postgres;
using Core.Diagnostics;
using Microsoft.Extensions.Options;
using Npgsql;
using NpgsqlTypes;
using Serilog;

namespace StreamCraft.Bits.Designer;

public sealed class DesignerAutosaveStore
{
    private static readonly TimeSpan RetryDelay = TimeSpan.FromSeconds(30);
    private readonly string _connectionString;
    private readonly ILogger _logger;
    private readonly object _availabilitySync = new();
    private DateTime _retryAfterUtc = DateTime.MinValue;

    public DesignerAutosaveStore(IOptions<PostgresDatabaseOptions> options, ILogger logger)
    {
        if (options == null) throw ExceptionFactory.ArgumentNull(nameof(options));
        if (logger == null) throw ExceptionFactory.ArgumentNull(nameof(logger));
        _connectionString = options.Value.ConnectionString ?? string.Empty;
        _logger = logger;
    }

    public async Task<string?> ReadAsync(string sessionId, CancellationToken cancellationToken)
    {
        if (!IsAvailable())
        {
            return null;
        }

        try
        {
            await using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = connection.CreateCommand();
            command.CommandText = """
                SELECT layout_json
                FROM bit_designer_autosave
                WHERE session_id = @id;
                """;
            command.Parameters.AddWithValue("@id", Normalize(sessionId));

            var result = await command.ExecuteScalarAsync(cancellationToken);
            return result == null || result == DBNull.Value ? null : Convert.ToString(result);
        }
        catch (Exception ex) when (ex is NpgsqlException or InvalidOperationException)
        {
            SuppressRetry(ex);
            return null;
        }
    }

    public async Task WriteAsync(string sessionId, string json, CancellationToken cancellationToken)
    {
        if (json == null) throw ExceptionFactory.ArgumentNull(nameof(json));

        if (!IsAvailable())
        {
            return;
        }

        try
        {
            await using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO bit_designer_autosave (session_id, layout_json, project_name, updated_utc)
                VALUES (
                    @id,
                    @json,
                    COALESCE((@json::jsonb)->>'projectName', (@json::jsonb)->>'overlayName'),
                    @utc
                )
                ON CONFLICT (session_id)
                DO UPDATE SET
                    layout_json = EXCLUDED.layout_json,
                    project_name = EXCLUDED.project_name,
                    updated_utc = EXCLUDED.updated_utc;
                """;
            command.Parameters.AddWithValue("@id", Normalize(sessionId));
            command.Parameters.Add("@json", NpgsqlDbType.Jsonb).Value = json;
            command.Parameters.AddWithValue("@utc", DateTime.UtcNow);
            await command.ExecuteNonQueryAsync(cancellationToken);
        }
        catch (Exception ex) when (ex is NpgsqlException or InvalidOperationException)
        {
            SuppressRetry(ex);
        }
    }

    private bool IsAvailable()
    {
        if (string.IsNullOrWhiteSpace(_connectionString))
        {
            return false;
        }

        lock (_availabilitySync)
        {
            return DateTime.UtcNow >= _retryAfterUtc;
        }
    }

    private void SuppressRetry(Exception ex)
    {
        lock (_availabilitySync)
        {
            _retryAfterUtc = DateTime.UtcNow.Add(RetryDelay);
        }

        _logger.Warning(
            "Postgres is unreachable. Suppressing designer autosave reads for {DelaySeconds} seconds.",
            (int)RetryDelay.TotalSeconds);
        _logger.Debug(ex, "Postgres connection failed while accessing designer autosave.");
    }

    private static string Normalize(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "default";
        }

        return value.Trim().ToLowerInvariant();
    }
}
