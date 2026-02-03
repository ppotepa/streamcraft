using Core.Data.DuckDb;
using Core.Data.Sql;
using Core.Diagnostics;
using DuckDB.NET.Data;
using Microsoft.Extensions.Logging;

namespace Core.Diagnostics;

public sealed class DuckDbExceptionSink : IExceptionSink
{
    private readonly IDuckDbConnectionFactory _connectionFactory;
    private readonly ISqlQueryStore _queries;
    private readonly ILogger<DuckDbExceptionSink> _logger;

    public DuckDbExceptionSink(IDuckDbConnectionFactory connectionFactory, ISqlQueryStore queries, ILogger<DuckDbExceptionSink> logger)
    {
        _connectionFactory = connectionFactory ?? throw ExceptionFactory.ArgumentNull(nameof(connectionFactory));
        _queries = queries ?? throw ExceptionFactory.ArgumentNull(nameof(queries));
        _logger = logger ?? throw ExceptionFactory.ArgumentNull(nameof(logger));
    }

    public Task WriteAsync(ExceptionNotice notice, CancellationToken cancellationToken = default)
    {
        try
        {
            using var connection = _connectionFactory.OpenConnection();
            using var command = connection.CreateCommand();
            command.CommandText = _queries.Get("diagnostics/exception_insert");
            command.Parameters.Add(new DuckDBParameter { Value = notice.Id });
            command.Parameters.Add(new DuckDBParameter { Value = notice.TimestampUtc });
            command.Parameters.Add(new DuckDBParameter { Value = notice.Handled });
            command.Parameters.Add(new DuckDBParameter { Value = notice.Severity.ToString() });
            command.Parameters.Add(new DuckDBParameter { Value = (object?)notice.ExceptionType ?? DBNull.Value });
            command.Parameters.Add(new DuckDBParameter { Value = notice.Message });
            command.Parameters.Add(new DuckDBParameter { Value = (object?)notice.StackTrace ?? DBNull.Value });
            command.Parameters.Add(new DuckDBParameter { Value = (object?)notice.Source ?? DBNull.Value });
            command.Parameters.Add(new DuckDBParameter { Value = (object?)notice.BitId ?? DBNull.Value });
            command.Parameters.Add(new DuckDBParameter { Value = (object?)notice.CorrelationId ?? DBNull.Value });
            command.Parameters.Add(new DuckDBParameter { Value = (object?)notice.TraceId ?? DBNull.Value });
            command.Parameters.Add(new DuckDBParameter { Value = (object?)notice.Path ?? DBNull.Value });
            command.Parameters.Add(new DuckDBParameter { Value = (object?)notice.Method ?? DBNull.Value });
            command.ExecuteNonQuery();
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed to persist exception event to DuckDB.");
        }

        return Task.CompletedTask;
    }
}
