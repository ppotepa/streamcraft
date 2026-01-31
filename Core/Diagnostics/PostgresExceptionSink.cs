using Core.Data.Postgres;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;

namespace Core.Diagnostics;

public sealed class PostgresExceptionSink : IExceptionSink
{
    private readonly string _connectionString;
    private readonly ILogger<PostgresExceptionSink> _logger;
    private readonly object _sync = new();

    public PostgresExceptionSink(IOptions<PostgresDatabaseOptions> options, ILogger<PostgresExceptionSink> logger)
    {
        _connectionString = options?.Value.ConnectionString ?? string.Empty;
        _logger = logger;
    }

    public Task WriteAsync(ExceptionNotice notice, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_connectionString))
        {
            return Task.CompletedTask;
        }

        try
        {
            lock (_sync)
            {
                using var connection = new NpgsqlConnection(_connectionString);
                connection.Open();

                using var command = connection.CreateCommand();
                command.CommandText = @"
                    INSERT INTO core_exception_events
                    (id, utc_time, handled, severity, exception_type, message, stacktrace, source, bit_id, correlation_id, trace_id, path, method)
                    VALUES
                    ($id, $utc, $handled, $severity, $type, $message, $stack, $source, $bit, $correlation, $trace, $path, $method);
                    ";
                command.Parameters.AddWithValue("$id", notice.Id);
                command.Parameters.AddWithValue("$utc", notice.TimestampUtc);
                command.Parameters.AddWithValue("$handled", notice.Handled);
                command.Parameters.AddWithValue("$severity", notice.Severity.ToString());
                command.Parameters.AddWithValue("$type", notice.ExceptionType ?? string.Empty);
                command.Parameters.AddWithValue("$message", notice.Message ?? string.Empty);
                command.Parameters.AddWithValue("$stack", (object?)notice.StackTrace ?? DBNull.Value);
                command.Parameters.AddWithValue("$source", (object?)notice.Source ?? DBNull.Value);
                command.Parameters.AddWithValue("$bit", (object?)notice.BitId ?? DBNull.Value);
                command.Parameters.AddWithValue("$correlation", (object?)notice.CorrelationId ?? DBNull.Value);
                command.Parameters.AddWithValue("$trace", (object?)notice.TraceId ?? DBNull.Value);
                command.Parameters.AddWithValue("$path", (object?)notice.Path ?? DBNull.Value);
                command.Parameters.AddWithValue("$method", (object?)notice.Method ?? DBNull.Value);
                command.ExecuteNonQuery();
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed to persist exception event to Postgres.");
        }

        return Task.CompletedTask;
    }
}
