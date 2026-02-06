using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using StreamCraft.Core.Messaging;

namespace StreamCraft.Core.Events.Factories;

public sealed class PayloadTriggerFactory : IEventTriggerFactory
{
    private readonly ILogger<PayloadTriggerFactory> _logger;

    public PayloadTriggerFactory(ILogger<PayloadTriggerFactory> logger)
    {
        _logger = logger;
    }

    public string? TypeName => "core.payload";

    public ITrigger? Create(EventTriggerDefinition definition, IServiceProvider services)
    {
        if (definition == null)
        {
            return null;
        }

        var config = ParseConfiguration(definition.FilterJson);
        if (config == null || string.IsNullOrWhiteSpace(config.Property))
        {
            _logger.LogWarning("Payload trigger {TriggerId} missing property filter.", definition.Id);
            return null;
        }

        return new PayloadTrigger(definition, config, _logger);
    }

    private static PayloadTriggerConfiguration? ParseConfiguration(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<PayloadTriggerConfiguration>(json, JsonOptions);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private sealed class PayloadTrigger : ITrigger
    {
        private readonly EventTriggerDefinition _definition;
        private readonly PayloadTriggerConfiguration _config;
        private readonly Regex? _regex;
        private readonly ILogger _logger;

        public PayloadTrigger(EventTriggerDefinition definition, PayloadTriggerConfiguration config, ILogger logger)
        {
            _definition = definition;
            _config = config;
            _logger = logger;

            if (!string.IsNullOrWhiteSpace(config.Regex))
            {
                var options = config.IgnoreCase ? RegexOptions.IgnoreCase | RegexOptions.Compiled : RegexOptions.Compiled;
                try
                {
                    _regex = new Regex(config.Regex!, options, TimeSpan.FromMilliseconds(250));
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Invalid regex for payload trigger {TriggerId}.", definition.Id);
                }
            }
        }

        public string Id => _definition.Id;
        public MessageType MessageType => _definition.MessageType;
        public IReadOnlyList<string> EffectIds => _definition.EffectIds;

        public TriggerEvaluationResult Evaluate(EventEnvelope envelope)
        {
            if (!TryConvertPayload(envelope.Payload, out var payload))
            {
                return new TriggerEvaluationResult(false, "Payload not JSON serializable.");
            }

            if (!TryResolve(payload, _config.Property!, out var value))
            {
                return new TriggerEvaluationResult(false, $"Property '{_config.Property}' not found.");
            }

            return Matches(value)
                ? new TriggerEvaluationResult(true)
                : new TriggerEvaluationResult(false, $"Payload property '{_config.Property}' did not satisfy predicate.");
        }

        private bool Matches(JsonElement element)
        {
            var comparison = _config.IgnoreCase ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;
            var asString = GetStringValue(element);

            if (!string.IsNullOrWhiteSpace(_config.EqualsValue))
            {
                return string.Equals(asString, _config.EqualsValue, comparison);
            }

            if (!string.IsNullOrWhiteSpace(_config.Contains))
            {
                return asString?.IndexOf(_config.Contains, comparison) >= 0;
            }

            if (_regex != null && asString != null)
            {
                return _regex.IsMatch(asString);
            }

            if (_config.BoolEquals.HasValue)
            {
                if (element.ValueKind == JsonValueKind.True || element.ValueKind == JsonValueKind.False)
                {
                    return element.GetBoolean() == _config.BoolEquals.Value;
                }

                if (bool.TryParse(asString, out var parsedBool))
                {
                    return parsedBool == _config.BoolEquals.Value;
                }

                return false;
            }

            if (_config.GreaterThan.HasValue || _config.LessThan.HasValue)
            {
                if (!TryGetNumber(element, out var number))
                {
                    return false;
                }

                if (_config.GreaterThan.HasValue && !(number > _config.GreaterThan.Value))
                {
                    return false;
                }

                if (_config.LessThan.HasValue && !(number < _config.LessThan.Value))
                {
                    return false;
                }

                return true;
            }

            // If no predicate specified, default to true (simply presence check).
            return true;
        }

        private static string? GetStringValue(JsonElement element)
        {
            return element.ValueKind switch
            {
                JsonValueKind.String => element.GetString(),
                JsonValueKind.Number => element.TryGetDouble(out var number)
                    ? number.ToString(CultureInfo.InvariantCulture)
                    : element.ToString(),
                JsonValueKind.True => bool.TrueString,
                JsonValueKind.False => bool.FalseString,
                JsonValueKind.Null => null,
                _ => element.ToString()
            };
        }

        private static bool TryGetNumber(JsonElement element, out double value)
        {
            switch (element.ValueKind)
            {
                case JsonValueKind.Number:
                    return element.TryGetDouble(out value);
                case JsonValueKind.String:
                    return double.TryParse(element.GetString(), NumberStyles.Float, CultureInfo.InvariantCulture, out value);
                default:
                    value = 0;
                    return false;
            }
        }

        private static bool TryConvertPayload(object? payload, out JsonElement element)
        {
            if (payload is null)
            {
                using var doc = JsonDocument.Parse("null");
                element = doc.RootElement.Clone();
                return true;
            }

            if (payload is JsonElement json)
            {
                element = json.Clone();
                return true;
            }

            if (payload is string str)
            {
                try
                {
                    using var doc = JsonDocument.Parse(str);
                    element = doc.RootElement.Clone();
                    return true;
                }
                catch
                {
                    try
                    {
                        using var fallback = JsonDocument.Parse(JsonSerializer.Serialize(new { value = str }));
                        element = fallback.RootElement.Clone();
                        return true;
                    }
                    catch
                    {
                        element = default;
                        return false;
                    }
                }
            }

            try
            {
                var serialized = JsonSerializer.Serialize(payload, payload.GetType());
                using var doc = JsonDocument.Parse(serialized);
                element = doc.RootElement.Clone();
                return true;
            }
            catch
            {
                element = default;
                return false;
            }
        }

        private static bool TryResolve(JsonElement element, string path, out JsonElement value)
        {
            var current = element;
            var segments = path.Split('.', StringSplitOptions.RemoveEmptyEntries);
            foreach (var rawSegment in segments)
            {
                if (!TryResolveSegment(current, rawSegment, out var next) || next is null)
                {
                    value = default;
                    return false;
                }

                current = next.Value;
            }

            value = current;
            return true;
        }

        private static bool TryResolveSegment(JsonElement element, string segment, out JsonElement? value)
        {
            value = null;
            if (segment.Length == 0)
            {
                return false;
            }

            if (segment[0] == '[')
            {
                if (!TryResolveArray(element, segment, out var result))
                {
                    return false;
                }

                value = result;
                return true;
            }

            var propertyName = segment;
            var indexStart = segment.IndexOf('[');
            if (indexStart >= 0)
            {
                propertyName = segment[..indexStart];
            }

            if (!element.TryGetProperty(propertyName, out var property))
            {
                return false;
            }

            if (indexStart >= 0)
            {
                var arraySegment = segment[indexStart..];
                return TryResolveArray(property, arraySegment, out value);
            }

            value = property;
            return true;
        }

        private static bool TryResolveArray(JsonElement element, string segment, out JsonElement? value)
        {
            value = null;
            if (element.ValueKind != JsonValueKind.Array)
            {
                return false;
            }

            if (segment.Length < 3 || segment[0] != '[' || !segment.EndsWith("]", StringComparison.Ordinal))
            {
                return false;
            }

            var indexText = segment[1..^1];
            if (!int.TryParse(indexText, NumberStyles.Integer, CultureInfo.InvariantCulture, out var index))
            {
                return false;
            }

            if (index < 0 || index >= element.GetArrayLength())
            {
                return false;
            }

            value = element[index];
            return true;
        }
    }

    private sealed record PayloadTriggerConfiguration
    {
        public string? Property { get; init; }
        [JsonPropertyName("equals")]
        public string? EqualsValue { get; init; }
        public string? Contains { get; init; }
        public double? GreaterThan { get; init; }
        public double? LessThan { get; init; }
        public bool? BoolEquals { get; init; }
        public string? Regex { get; init; }
        public bool IgnoreCase { get; init; } = true;
    }
}
