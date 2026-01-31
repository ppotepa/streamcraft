using Core.Data.Postgres;
using Core.Diagnostics;
using Microsoft.Extensions.Options;
using Npgsql;
using NpgsqlTypes;
using Serilog;

namespace Core.Bits;

public sealed class PostgresBitConfigStore : IBitConfigStore
{
    private readonly string _connectionString;
    private readonly object _sync = new();
    private readonly ILogger _logger;
    private readonly object _availabilitySync = new();
    private DateTime _retryAfterUtc = DateTime.MinValue;
    private static readonly TimeSpan RetryDelay = TimeSpan.FromSeconds(30);
    private readonly FileBitConfigStore _fallbackStore = new();

    public PostgresBitConfigStore(IOptions<PostgresDatabaseOptions> options, ILogger logger)
    {
        if (options == null) throw ExceptionFactory.ArgumentNull(nameof(options));
        if (logger == null) throw ExceptionFactory.ArgumentNull(nameof(logger));
        _connectionString = options.Value.ConnectionString ?? string.Empty;
        _logger = logger;
    }

    public bool Exists(string bitId)
    {
        var normalized = NormalizeBitId(bitId);

        if (string.IsNullOrWhiteSpace(_connectionString))
        {
            _logger.Warning("Postgres connection string is empty; treating bit {BitId} as not configured.", normalized);
            return _fallbackStore.Exists(normalized);
        }

        if (IsRetrySuppressed())
        {
            return _fallbackStore.Exists(normalized);
        }

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            connection.Open();

            using var command = connection.CreateCommand();
            command.CommandText = "SELECT is_configured FROM core_bit_configs WHERE bit_id = $id LIMIT 1;";
            command.Parameters.AddWithValue("$id", normalized);
            var result = command.ExecuteScalar();

            if (result == null || result == DBNull.Value)
            {
                return false;
            }

            return Convert.ToBoolean(result);
        }
        catch (Exception ex) when (ex is NpgsqlException or InvalidOperationException)
        {
            SuppressRetry(ex);
            return _fallbackStore.Exists(normalized);
        }
    }

    public string? Read(string bitId)
    {
        var normalized = NormalizeBitId(bitId);

        if (string.IsNullOrWhiteSpace(_connectionString))
        {
            _logger.Warning("Postgres connection string is empty; returning no config for bit {BitId}.", normalized);
            return _fallbackStore.Read(normalized);
        }

        if (IsRetrySuppressed())
        {
            return _fallbackStore.Read(normalized);
        }

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            connection.Open();

            using var command = connection.CreateCommand();
            command.CommandText = "SELECT json FROM core_bit_configs WHERE bit_id = $id LIMIT 1;";
            command.Parameters.AddWithValue("$id", normalized);
            var result = command.ExecuteScalar();

            return result == null || result == DBNull.Value ? null : Convert.ToString(result);
        }
        catch (Exception ex) when (ex is NpgsqlException or InvalidOperationException)
        {
            SuppressRetry(ex);
            return _fallbackStore.Read(normalized);
        }
    }

    public void Write(string bitId, string json)
    {
        if (json == null) throw ExceptionFactory.ArgumentNull(nameof(json));

        var normalized = NormalizeBitId(bitId);
        var utcNow = DateTime.UtcNow;

        if (string.IsNullOrWhiteSpace(_connectionString))
        {
            _logger.Warning("Postgres connection string is not configured; writing config for bit {BitId} to local fallback store.", normalized);
            _fallbackStore.Write(normalized, json);
            return;
        }

        if (IsRetrySuppressed())
        {
            _logger.Warning("Postgres is unreachable; writing config for bit {BitId} to local fallback store.", normalized);
            _fallbackStore.Write(normalized, json);
            return;
        }

        lock (_sync)
        {
            using var connection = new NpgsqlConnection(_connectionString);
            connection.Open();

            using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO core_bit_configs (bit_id, json, is_configured, created_utc, updated_utc)
                VALUES ($id, $json, TRUE, $utc, $utc)
                ON CONFLICT(bit_id) DO UPDATE SET
                    json = excluded.json,
                    is_configured = excluded.is_configured,
                    updated_utc = excluded.updated_utc;
                """;
            command.Parameters.AddWithValue("$id", normalized);
            command.Parameters.Add("$json", NpgsqlDbType.Jsonb).Value = json;
            command.Parameters.AddWithValue("$utc", utcNow);
            command.ExecuteNonQuery();
        }
    }

    private bool IsRetrySuppressed()
    {
        lock (_availabilitySync)
        {
            return DateTime.UtcNow < _retryAfterUtc;
        }
    }

    private void SuppressRetry(Exception ex)
    {
        lock (_availabilitySync)
        {
            _retryAfterUtc = DateTime.UtcNow.Add(RetryDelay);
        }

        _logger.Warning("Postgres is unreachable. Suppressing config reads for {DelaySeconds} seconds.", (int)RetryDelay.TotalSeconds);
        _logger.Debug(ex, "Postgres connection failed while accessing bit configuration.");
    }

    private static string NormalizeBitId(string bitId)
    {
        if (string.IsNullOrWhiteSpace(bitId))
        {
            return string.Empty;
        }

        return bitId.Trim().ToLowerInvariant();
    }
}
