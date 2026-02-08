using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using DuckDB.NET.Data;
using Microsoft.Extensions.Logging;
using StreamCraft.Core.Data.DuckDb;
using StreamCraft.Core.Data.Sql;
using StreamCraft.Core.Messaging;

namespace StreamCraft.Core.Events.Persistence;

public sealed class DuckDbEventDefinitionStore : IEventDefinitionStore
{
    private readonly IDuckDbConnectionFactory _connectionFactory;
    private readonly ISqlQueryStore _queries;
    private readonly ILogger<DuckDbEventDefinitionStore> _logger;

    public DuckDbEventDefinitionStore(
        IDuckDbConnectionFactory connectionFactory,
        ISqlQueryStore queries,
        ILogger<DuckDbEventDefinitionStore> logger)
    {
        _connectionFactory = connectionFactory;
        _queries = queries;
        _logger = logger;
    }

    public Task<IReadOnlyList<EventEffectDefinition>> LoadEffectsAsync(CancellationToken cancellationToken)
    {
        var results = new List<EventEffectDefinition>();

        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = _queries.Get("core/event_system/select_effects");

        using var reader = command.ExecuteReader();
        while (reader.Read())
        {
            cancellationToken.ThrowIfCancellationRequested();

            var id = reader.GetString(0);
            var typeName = reader.GetString(1);
            var description = reader.IsDBNull(2) ? null : reader.GetString(2);
            var configuration = reader.IsDBNull(3) ? null : reader.GetString(3);
            var enabled = reader.GetBoolean(4);
            var created = reader.GetDateTime(5);
            var updated = reader.GetDateTime(6);

            results.Add(new EventEffectDefinition(
                id,
                typeName,
                description,
                configuration,
                enabled,
                created,
                updated));
        }

        _logger.LogInformation("Loaded {EffectCount} event effects from DuckDB.", results.Count);
        return Task.FromResult<IReadOnlyList<EventEffectDefinition>>(results);
    }

    public Task SaveEffectAsync(EventEffectDefinition definition, CancellationToken cancellationToken)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = _queries.Get("core/event_system/upsert_effect");
        command.Parameters.Add(new DuckDBParameter { Value = definition.Id });
        command.Parameters.Add(new DuckDBParameter { Value = definition.TypeName });
        command.Parameters.Add(new DuckDBParameter { Value = definition.Description });
        command.Parameters.Add(new DuckDBParameter { Value = definition.ConfigurationJson });
        command.Parameters.Add(new DuckDBParameter { Value = definition.Enabled });

        command.ExecuteNonQuery();
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<EventTriggerDefinition>> LoadTriggersAsync(CancellationToken cancellationToken)
    {
        var results = new List<EventTriggerDefinition>();

        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = _queries.Get("core/event_system/select_triggers");

        using var reader = command.ExecuteReader();
        while (reader.Read())
        {
            cancellationToken.ThrowIfCancellationRequested();

            var id = reader.GetString(0);
            var typeName = reader.IsDBNull(1) ? null : reader.GetString(1);
            var category = reader.GetString(2);
            var name = reader.GetString(3);
            var effectIdsRaw = reader.GetString(4);
            var filterJson = reader.IsDBNull(5) ? null : reader.GetString(5);
            var description = reader.IsDBNull(6) ? null : reader.GetString(6);
            var enabled = reader.GetBoolean(7);
            var created = reader.GetDateTime(8);
            var updated = reader.GetDateTime(9);

            var messageType = MessageType.Create(category, name);
            var effectIds = ParseEffectIds(effectIdsRaw);

            results.Add(new EventTriggerDefinition(
                id,
                typeName,
                messageType,
                effectIds,
                filterJson,
                description,
                enabled,
                created,
                updated));
        }

        _logger.LogInformation("Loaded {TriggerCount} event triggers from DuckDB.", results.Count);
        return Task.FromResult<IReadOnlyList<EventTriggerDefinition>>(results);
    }

    public Task SaveTriggerAsync(EventTriggerDefinition definition, CancellationToken cancellationToken)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = _queries.Get("core/event_system/upsert_trigger");
        command.Parameters.Add(new DuckDBParameter { Value = definition.Id });
        command.Parameters.Add(new DuckDBParameter { Value = definition.TypeName });
        command.Parameters.Add(new DuckDBParameter { Value = definition.MessageType.Category });
        command.Parameters.Add(new DuckDBParameter { Value = definition.MessageType.Name });
        command.Parameters.Add(new DuckDBParameter { Value = string.Join(',', definition.EffectIds) });
        command.Parameters.Add(new DuckDBParameter { Value = definition.FilterJson });
        command.Parameters.Add(new DuckDBParameter { Value = definition.Description });
        command.Parameters.Add(new DuckDBParameter { Value = definition.Enabled });

        command.ExecuteNonQuery();
        return Task.CompletedTask;
    }

    public Task DeleteEffectAsync(string effectId, CancellationToken cancellationToken)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = _queries.Get("core/event_system/delete_effect");
        command.Parameters.Add(new DuckDBParameter { Value = effectId });
        command.ExecuteNonQuery();
        return Task.CompletedTask;
    }

    public Task DeleteTriggerAsync(string triggerId, CancellationToken cancellationToken)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = _queries.Get("core/event_system/delete_trigger");
        command.Parameters.Add(new DuckDBParameter { Value = triggerId });
        command.ExecuteNonQuery();
        return Task.CompletedTask;
    }

    private static IReadOnlyList<string> ParseEffectIds(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return Array.Empty<string>();
        }

        try
        {
            using var document = JsonDocument.Parse(raw);
            if (document.RootElement.ValueKind == JsonValueKind.Array)
            {
                return document.RootElement
                    .EnumerateArray()
                    .Where(e => e.ValueKind == JsonValueKind.String)
                    .Select(e => e.GetString()!)
                    .Where(static id => !string.IsNullOrWhiteSpace(id))
                    .Select(static id => id.Trim())
                    .ToArray();
            }
        }
        catch (JsonException)
        {
            // Fall back to comma parsing below.
        }

        return raw
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(id => id.Trim())
            .Where(id => id.Length > 0)
            .ToArray();
    }
}
