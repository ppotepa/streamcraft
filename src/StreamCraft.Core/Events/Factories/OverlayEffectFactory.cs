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

    public EventEffectTypeDescriptor Describe() =>
        new(
            TypeName,
            "Overlay Action",
            "Visual",
            "Sends an overlay command through the message bus.",
            Options: new[]
            {
                new EventEffectOptionDescriptor(
                    Key: "route",
                    Label: "Route",
                    ValueType: "string",
                    Path: "route",
                    Required: true,
                    Description: "Overlay route target.",
                    DefaultValue: "overlay"),
                new EventEffectOptionDescriptor(
                    Key: "command",
                    Label: "Command",
                    ValueType: "string",
                    Path: "command",
                    Required: true,
                    Description: "Overlay command to invoke.",
                    DefaultValue: "confetti"),
                new EventEffectOptionDescriptor(
                    Key: "description",
                    Label: "Description",
                    ValueType: "string",
                    Path: "description",
                    Required: false,
                    Description: "Optional display description."),
                new EventEffectOptionDescriptor(
                    Key: "includeMetadata",
                    Label: "Include Metadata",
                    ValueType: "boolean",
                    Path: "includeMetadata",
                    Required: false,
                    Description: "Adds source/correlation metadata to data payload.",
                    DefaultValue: true),
                new EventEffectOptionDescriptor(
                    Key: "includePayload",
                    Label: "Include Payload",
                    ValueType: "boolean",
                    Path: "includePayload",
                    Required: false,
                    Description: "Embeds event payload under eventPayload.",
                    DefaultValue: true),
                new EventEffectOptionDescriptor(
                    Key: "messageTypeCategory",
                    Label: "Output Message Category",
                    ValueType: "string",
                    Path: "messageTypeCategory",
                    Required: false,
                    Description: "Optional custom message category."),
                new EventEffectOptionDescriptor(
                    Key: "messageTypeName",
                    Label: "Output Message Name",
                    ValueType: "string",
                    Path: "messageTypeName",
                    Required: false,
                    Description: "Optional custom message type name."),
                new EventEffectOptionDescriptor(
                    Key: "intensity",
                    Label: "Intensity",
                    ValueType: "select",
                    Path: "data.intensity",
                    Required: false,
                    Description: "Particle density.",
                    DefaultValue: "medium",
                    Choices: new[]
                    {
                        new EventEffectOptionChoiceDescriptor("low", "Low"),
                        new EventEffectOptionChoiceDescriptor("medium", "Medium"),
                        new EventEffectOptionChoiceDescriptor("high", "High")
                    }),
                new EventEffectOptionDescriptor(
                    Key: "durationMs",
                    Label: "Duration (ms)",
                    ValueType: "number",
                    Path: "data.durationMs",
                    Required: false,
                    Description: "Effect duration in milliseconds.",
                    DefaultValue: 2200),
                new EventEffectOptionDescriptor(
                    Key: "text",
                    Label: "Caption Text",
                    ValueType: "string",
                    Path: "data.text",
                    Required: false,
                    Description: "Caption content.",
                    DefaultValue: "Huge donation incoming!"),
                new EventEffectOptionDescriptor(
                    Key: "position",
                    Label: "Position",
                    ValueType: "select",
                    Path: "data.position",
                    Required: false,
                    Description: "Caption position.",
                    DefaultValue: "bottom",
                    Choices: new[]
                    {
                        new EventEffectOptionChoiceDescriptor("top", "Top"),
                        new EventEffectOptionChoiceDescriptor("center", "Center"),
                        new EventEffectOptionChoiceDescriptor("bottom", "Bottom")
                    }),
                new EventEffectOptionDescriptor(
                    Key: "toneHz",
                    Label: "Tone (Hz)",
                    ValueType: "number",
                    Path: "data.toneHz",
                    Required: false,
                    Description: "Generated preview tone frequency.",
                    DefaultValue: 880),
                new EventEffectOptionDescriptor(
                    Key: "volume",
                    Label: "Volume (0-1)",
                    ValueType: "number",
                    Path: "data.volume",
                    Required: false,
                    Description: "Generated preview tone gain.",
                    DefaultValue: 0.25),
                new EventEffectOptionDescriptor(
                    Key: "color",
                    Label: "Color",
                    ValueType: "color",
                    Path: "data.color",
                    Required: false,
                    Description: "Flash or badge color.",
                    DefaultValue: "#ffffff"),
                new EventEffectOptionDescriptor(
                    Key: "label",
                    Label: "Label",
                    ValueType: "string",
                    Path: "data.label",
                    Required: false,
                    Description: "Badge label.",
                    DefaultValue: "NEW!"),
                new EventEffectOptionDescriptor(
                    Key: "data",
                    Label: "Data (JSON)",
                    ValueType: "json",
                    Path: "data",
                    Required: false,
                    Description: "Raw command-specific data dictionary."),
                new EventEffectOptionDescriptor(
                    Key: "metadataOverrides",
                    Label: "Metadata Overrides (JSON)",
                    ValueType: "json",
                    Path: "metadataOverrides",
                    Required: false,
                    Description: "Values merged into command data.")
            },
            Presets: new[]
            {
                new EventEffectPresetDescriptor(
                    Id: "confetti",
                    Name: "Confetti Burst",
                    Category: "Visual",
                    Description: "Celebration particles for donations and hype moments.",
                    DefaultOptions: new Dictionary<string, object?>
                    {
                        ["route"] = "overlay",
                        ["command"] = "confetti",
                        ["includeMetadata"] = true,
                        ["includePayload"] = true,
                        ["data"] = new Dictionary<string, object?>
                        {
                            ["intensity"] = "medium",
                            ["durationMs"] = 2200
                        }
                    },
                    OptionKeys: new[] { "intensity", "durationMs" }),
                new EventEffectPresetDescriptor(
                    Id: "caption",
                    Name: "Show Caption",
                    Category: "Text",
                    Description: "Shows a short caption on top of the overlay.",
                    DefaultOptions: new Dictionary<string, object?>
                    {
                        ["route"] = "overlay",
                        ["command"] = "caption",
                        ["includeMetadata"] = true,
                        ["includePayload"] = true,
                        ["data"] = new Dictionary<string, object?>
                        {
                            ["text"] = "Huge donation incoming!",
                            ["position"] = "bottom",
                            ["durationMs"] = 2000
                        }
                    },
                    OptionKeys: new[] { "text", "position", "durationMs" }),
                new EventEffectPresetDescriptor(
                    Id: "sound",
                    Name: "Play Sound",
                    Category: "Audio",
                    Description: "Plays a quick sound cue.",
                    DefaultOptions: new Dictionary<string, object?>
                    {
                        ["route"] = "overlay",
                        ["command"] = "sound",
                        ["includeMetadata"] = true,
                        ["includePayload"] = true,
                        ["data"] = new Dictionary<string, object?>
                        {
                            ["toneHz"] = 880,
                            ["volume"] = 0.25,
                            ["durationMs"] = 650
                        }
                    },
                    OptionKeys: new[] { "toneHz", "volume", "durationMs" }),
                new EventEffectPresetDescriptor(
                    Id: "flash",
                    Name: "Screen Flash",
                    Category: "Visual",
                    Description: "Short color flash for attention.",
                    DefaultOptions: new Dictionary<string, object?>
                    {
                        ["route"] = "overlay",
                        ["command"] = "flash",
                        ["includeMetadata"] = true,
                        ["includePayload"] = true,
                        ["data"] = new Dictionary<string, object?>
                        {
                            ["color"] = "#ffffff",
                            ["durationMs"] = 650
                        }
                    },
                    OptionKeys: new[] { "color", "durationMs" }),
                new EventEffectPresetDescriptor(
                    Id: "badge",
                    Name: "Badge Pop",
                    Category: "Attention",
                    Description: "Displays a compact label badge.",
                    DefaultOptions: new Dictionary<string, object?>
                    {
                        ["route"] = "overlay",
                        ["command"] = "badge",
                        ["includeMetadata"] = true,
                        ["includePayload"] = true,
                        ["data"] = new Dictionary<string, object?>
                        {
                            ["label"] = "NEW!",
                            ["color"] = "#ffd95a",
                            ["durationMs"] = 1200
                        }
                    },
                    OptionKeys: new[] { "label", "color", "durationMs" })
            });

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
