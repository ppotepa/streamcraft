namespace StreamCraft.Core.Runtime.Chat;

public sealed record ChatMessageRecord(
    string Id,
    string Username,
    string Message,
    string? Role,
    IReadOnlyList<string> Badges,
    string? ScenarioId,
    string? ScenarioName,
    DateTimeOffset Timestamp);

