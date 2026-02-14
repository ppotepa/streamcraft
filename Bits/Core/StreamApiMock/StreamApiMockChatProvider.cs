using System.Text.Json;
using StreamCraft.Core.Runtime.Chat;
using StreamCraft.Core.Runtime.Preview;

namespace StreamCraft.Bits.StreamApiMock;

public sealed class StreamApiMockChatProvider : IDataSourceProvider, IChatSourceHistoryProvider
{
    private static readonly string[] MessageFields = ["message", "notes", "reason", "details"];

    private readonly StreamApiMockHistory _history;

    public StreamApiMockChatProvider(StreamApiMockHistory history)
    {
        _history = history;
    }

    public string SourceId => StreamApiMockChatSource.SourceId;

    public Task<object?> GetPreviewAsync(CancellationToken cancellationToken)
    {
        var messages = MapHistory(_history.Snapshot());
        var latest = messages.Count > 0 ? messages[^1] : null;
        return Task.FromResult<object?>(new
        {
            count = messages.Count,
            latest,
            messages
        });
    }

    public Task<IReadOnlyList<ChatMessageRecord>> GetHistoryAsync(CancellationToken cancellationToken)
    {
        return Task.FromResult<IReadOnlyList<ChatMessageRecord>>(MapHistory(_history.Snapshot()));
    }

    private static List<ChatMessageRecord> MapHistory(IReadOnlyList<StreamApiMockEventRecord> records)
    {
        var messages = new List<ChatMessageRecord>(records.Count);

        foreach (var record in records)
        {
            var payload = JsonSerializer.SerializeToElement(record.Payload);
            var data = TryGetProperty(payload, "data", out var dataNode) ? dataNode : payload;
            var message = ExtractMessage(data);
            if (string.IsNullOrWhiteSpace(message))
            {
                continue;
            }

            var participant = ResolveParticipant(data, payload);
            var badges = ExtractBadges(data);
            var timestamp = new DateTimeOffset(DateTime.SpecifyKind(record.TimestampUtc, DateTimeKind.Utc));

            messages.Add(new ChatMessageRecord(
                record.EventId.ToString(),
                participant.Name,
                message,
                participant.Role,
                badges,
                record.ScenarioId,
                record.ScenarioName,
                timestamp));
        }

        return messages;
    }

    private static string ExtractMessage(JsonElement data)
    {
        foreach (var field in MessageFields)
        {
            if (TryGetStringProperty(data, field, out var value) && !string.IsNullOrWhiteSpace(value))
            {
                return value;
            }
        }

        return string.Empty;
    }

    private static (string Name, string? Role) ResolveParticipant(JsonElement data, JsonElement payload)
    {
        foreach (var key in new[] { "viewer", "target", "moderator", "user" })
        {
            if (!TryGetProperty(data, key, out var participant) || participant.ValueKind != JsonValueKind.Object)
            {
                continue;
            }

            if (TryGetStringProperty(participant, "name", out var name) || TryGetStringProperty(participant, "displayName", out name))
            {
                TryGetStringProperty(participant, "role", out var role);
                return (name!, role);
            }
        }

        if (TryGetProperty(payload, "channel", out var channel) &&
            channel.ValueKind == JsonValueKind.Object &&
            TryGetStringProperty(channel, "name", out var channelName))
        {
            return (channelName!, "channel");
        }

        if (TryGetStringProperty(payload, "eventType", out var eventType) && !string.IsNullOrWhiteSpace(eventType))
        {
            return (eventType, "system");
        }

        return ("Chat", "system");
    }

    private static IReadOnlyList<string> ExtractBadges(JsonElement data)
    {
        if (!TryGetProperty(data, "badges", out var badgesNode) || badgesNode.ValueKind != JsonValueKind.Array)
        {
            return Array.Empty<string>();
        }

        var badges = new List<string>();
        foreach (var badge in badgesNode.EnumerateArray())
        {
            if (badge.ValueKind == JsonValueKind.String)
            {
                var value = badge.GetString();
                if (!string.IsNullOrWhiteSpace(value))
                {
                    badges.Add(value);
                }
                continue;
            }

            if (badge.ValueKind == JsonValueKind.Object && TryGetStringProperty(badge, "name", out var name) && !string.IsNullOrWhiteSpace(name))
            {
                badges.Add(name);
            }
        }

        return badges;
    }

    private static bool TryGetStringProperty(JsonElement element, string propertyName, out string? value)
    {
        value = null;
        if (!TryGetProperty(element, propertyName, out var property) || property.ValueKind != JsonValueKind.String)
        {
            return false;
        }

        value = property.GetString();
        return !string.IsNullOrWhiteSpace(value);
    }

    private static bool TryGetProperty(JsonElement element, string propertyName, out JsonElement value)
    {
        if (element.ValueKind != JsonValueKind.Object)
        {
            value = default;
            return false;
        }

        foreach (var property in element.EnumerateObject())
        {
            if (string.Equals(property.Name, propertyName, StringComparison.OrdinalIgnoreCase))
            {
                value = property.Value;
                return true;
            }
        }

        value = default;
        return false;
    }
}

