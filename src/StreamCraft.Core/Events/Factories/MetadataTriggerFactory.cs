using System;
using System.Collections.Generic;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using StreamCraft.Core.Messaging;

namespace StreamCraft.Core.Events.Factories;

public sealed class MetadataTriggerFactory : IEventTriggerFactory
{
    private readonly ILogger<MetadataTriggerFactory> _logger;

    public MetadataTriggerFactory(ILogger<MetadataTriggerFactory> logger)
    {
        _logger = logger;
    }

    public string? TypeName => "core.metadata";

    public ITrigger? Create(EventTriggerDefinition definition, IServiceProvider services)
    {
        if (definition == null)
        {
            return null;
        }

        var config = ParseConfiguration(definition.FilterJson);
        return new MetadataTrigger(definition, config);
    }

    private MetadataTriggerFilter? ParseConfiguration(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<MetadataTriggerFilter>(json, JsonSerializerOptions);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to parse trigger filter configuration.");
            return null;
        }
    }

    private static readonly JsonSerializerOptions JsonSerializerOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private sealed class MetadataTrigger : ITrigger
    {
        private readonly EventTriggerDefinition _definition;
        private readonly MetadataTriggerFilter? _filter;

        public MetadataTrigger(EventTriggerDefinition definition, MetadataTriggerFilter? filter)
        {
            _definition = definition;
            _filter = filter;
        }

        public string Id => _definition.Id;
        public MessageType MessageType => _definition.MessageType;
        public IReadOnlyList<string> EffectIds => _definition.EffectIds;

        public TriggerEvaluationResult Evaluate(EventEnvelope envelope)
        {
            if (_filter == null)
            {
                return new TriggerEvaluationResult(true);
            }

            if (_filter.SourceEquals is { Length: > 0 } && !string.Equals(envelope.Metadata.Source, _filter.SourceEquals, StringComparison.OrdinalIgnoreCase))
            {
                return new TriggerEvaluationResult(false, "Source metadata mismatch.");
            }

            if (_filter.CorrelationIdEquals is { Length: > 0 } && !string.Equals(envelope.Metadata.CorrelationId, _filter.CorrelationIdEquals, StringComparison.OrdinalIgnoreCase))
            {
                return new TriggerEvaluationResult(false, "CorrelationId metadata mismatch.");
            }

            if (_filter.MetadataEquals is { Count: > 0 })
            {
                foreach (var requirement in _filter.MetadataEquals)
                {
                    var actual = ResolveMetadataValue(envelope.Metadata, requirement.Key);
                    if (!string.Equals(actual, requirement.Value, StringComparison.OrdinalIgnoreCase))
                    {
                        return new TriggerEvaluationResult(false, $"Metadata '{requirement.Key}' mismatch.");
                    }
                }
            }

            return new TriggerEvaluationResult(true);
        }

        private static string? ResolveMetadataValue(MessageMetadata metadata, string key)
        {
            if (string.IsNullOrWhiteSpace(key))
            {
                return null;
            }

            return key.Trim().ToLowerInvariant() switch
            {
                "source" => metadata.Source,
                "correlationid" => metadata.CorrelationId,
                "messageid" => metadata.MessageId.ToString(),
                "timestamp" => metadata.Timestamp.ToString("O"),
                _ => null
            };
        }
    }

    private sealed record MetadataTriggerFilter
    {
        public string? SourceEquals { get; init; }
        public string? CorrelationIdEquals { get; init; }
        public Dictionary<string, string>? MetadataEquals { get; init; }
    }
}
