using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using StreamCraft.Core.Messaging;

namespace StreamCraft.Core.Events.Factories;

public sealed class OverlayEffectFactory : IEventEffectFactory
{
    private readonly IMessageBus _messageBus;
    private readonly ILogger<OverlayEffectFactory> _logger;

    public OverlayEffectFactory(IMessageBus messageBus, ILogger<OverlayEffectFactory> logger)
    {
        _messageBus = messageBus;
        _logger = logger;
    }

    public string TypeName => "core.overlay";

    public IEffect? Create(EventEffectDefinition definition, IServiceProvider services)
    {
        if (definition == null)
        {
            return null;
        }

        var config = ParseConfiguration(definition.ConfigurationJson);
        if (config == null)
        {
            _logger.LogWarning("Overlay effect {EffectId} missing configuration; skipping.", definition.Id);
            return null;
        }

        if (string.IsNullOrWhiteSpace(config.Route) || string.IsNullOrWhiteSpace(config.Command))
        {
            _logger.LogWarning("Overlay effect {EffectId} requires both route and command.", definition.Id);
            return null;
        }

        var messageType = ResolveMessageType(config);
        return new OverlayEffect(definition.Id, _messageBus, messageType, config, _logger);
    }

    private static OverlayEffectConfiguration? ParseConfiguration(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<OverlayEffectConfiguration>(json, JsonOptions);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static MessageType ResolveMessageType(OverlayEffectConfiguration config)
    {
        if (!string.IsNullOrWhiteSpace(config.MessageTypeCategory) && !string.IsNullOrWhiteSpace(config.MessageTypeName))
        {
            return MessageType.Create(config.MessageTypeCategory!, config.MessageTypeName!);
        }

        return OverlayMessageTypes.Action;
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private sealed class OverlayEffect : IEffect
    {
        private readonly string _id;
        private readonly IMessageBus _messageBus;
        private readonly MessageType _messageType;
        private readonly OverlayEffectConfiguration _config;
        private readonly ILogger _logger;

        public OverlayEffect(string id, IMessageBus messageBus, MessageType messageType, OverlayEffectConfiguration config, ILogger logger)
        {
            _id = id;
            _messageBus = messageBus;
            _messageType = messageType;
            _config = config;
            _logger = logger;
        }

        public string Id => _id;

        public Task<EffectExecutionResult> ExecuteAsync(EventEnvelope envelope, CancellationToken cancellationToken = default)
        {
            try
            {
                var payload = BuildPayload(envelope);
                _messageBus.Publish(_messageType, payload, envelope.Metadata);
                _logger.LogDebug("Overlay effect {EffectId} published command {Command} to {Route}.", _id, payload.Command, payload.Route);
                return Task.FromResult(EffectExecutionResult.Completed());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Overlay effect {EffectId} failed to publish command.", _id);
                return Task.FromResult(EffectExecutionResult.Failed("Failed to publish overlay command.", ex, retrySuggested: false));
            }
        }

        private OverlayActionPayload BuildPayload(EventEnvelope envelope)
        {
            var data = _config.Data != null
                ? new Dictionary<string, object?>(_config.Data, StringComparer.OrdinalIgnoreCase)
                : new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

            if (_config.IncludePayload)
            {
                data["eventPayload"] = envelope.Payload;
            }

            if (_config.IncludeMetadata)
            {
                data["eventMetadata"] = new
                {
                    envelope.Metadata.MessageId,
                    envelope.Metadata.Source,
                    envelope.Metadata.CorrelationId,
                    envelope.Metadata.Timestamp
                };
            }

            if (_config.MetadataOverrides != null)
            {
                foreach (var kvp in _config.MetadataOverrides)
                {
                    data[kvp.Key] = kvp.Value;
                }
            }

            return new OverlayActionPayload(
                _config.Route!,
                _config.Command!,
                data,
                _config.Description ?? envelope.MessageType.Id);
        }
    }

    private sealed record OverlayEffectConfiguration
    {
        public string? Route { get; init; }
        public string? Command { get; init; }
        public string? Description { get; init; }
        public string? MessageTypeCategory { get; init; }
        public string? MessageTypeName { get; init; }
        public bool IncludeMetadata { get; init; } = true;
        public bool IncludePayload { get; init; } = true;
        public Dictionary<string, object?>? Data { get; init; }
        public Dictionary<string, object?>? MetadataOverrides { get; init; }
    }
}
