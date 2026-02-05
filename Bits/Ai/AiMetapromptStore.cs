using StreamCraft.Core.Data.DuckDb;
using DuckDB.NET.Data;

namespace StreamCraft.Bits.Ai;

public interface IAiMetapromptStore
{
    Task<string?> GetAsync(string id, CancellationToken cancellationToken);
}

public static class AiMetapromptIds
{
    public const string ThemeSystem = "theme.system.v1";
    public const string ThemeUser = "theme.user.v1";
}

public sealed class AiMetapromptStore : IAiMetapromptStore
{
    private readonly IDuckDbConnectionFactory _connectionFactory;

    public AiMetapromptStore(IDuckDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
    }

    public Task<string?> GetAsync(string id, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return Task.FromResult<string?>(null);
        }

        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT content FROM bit_ai_metaprompt WHERE id = ?";
        command.Parameters.Add(new DuckDBParameter { Value = id.Trim() });
        using var reader = command.ExecuteReader();
        if (!reader.Read() || reader.IsDBNull(0))
        {
            return Task.FromResult<string?>(null);
        }

        return Task.FromResult(reader.GetString(0));
    }
}



