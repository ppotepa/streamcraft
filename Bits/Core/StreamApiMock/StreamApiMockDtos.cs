using System;
using System.Text.Json;

namespace StreamCraft.Bits.StreamApiMock;

public sealed class StreamApiMockFireRequest
{
    public string? ScenarioId { get; set; }
    public int Count { get; set; } = 1;
    public StreamApiMockCustomMessage? Custom { get; set; }
    public JsonElement? Payload { get; set; }
    public JsonElement? Overrides { get; set; }
}

public sealed class StreamApiMockCustomMessage
{
    public string? Category { get; set; }
    public string? Name { get; set; }
}

public sealed record StreamApiMockFireResult(
    Guid EventId,
    string MessageType,
    string ScenarioId,
    string ScenarioName,
    object Payload,
    DateTime TimestampUtc);

public sealed record StreamApiMockScenarioSummary(
    string Id,
    string Name,
    string Category,
    string Description,
    string MessageType);

public sealed record StreamApiMockEventRecord(
    Guid EventId,
    string MessageType,
    string ScenarioId,
    string ScenarioName,
    object Payload,
    DateTime TimestampUtc);
