using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using StreamCraft.Core.Events.EventRules;
using StreamCraft.Core.Messaging;

namespace StreamCraft.Core.Events.Factories;

public sealed class TemplateTriggerFactory : IEventTriggerFactory
{
    private readonly ITriggerExpressionBuilder _expressionBuilder;
    private readonly ILogger<TemplateTriggerFactory> _logger;

    public TemplateTriggerFactory(
        ITriggerExpressionBuilder expressionBuilder,
        ILogger<TemplateTriggerFactory> logger)
    {
        _expressionBuilder = expressionBuilder;
        _logger = logger;
    }

    public string? TypeName => "core.template";

    public ITrigger? Create(EventTriggerDefinition definition, IServiceProvider services)
    {
        if (definition == null)
        {
            return null;
        }

        var config = ParseConfiguration(definition.FilterJson) ?? new TemplateTriggerConfiguration
        {
            Match = "all",
            Fields = null,
            Conditions = new List<TemplateCondition>()
        };

        var sourceConditions = config.Conditions ?? new List<TemplateCondition>();
        var normalizedConditions = new List<RuleCondition>(sourceConditions.Count);
        var fieldPaths = new Dictionary<EventFieldId, string>();

        foreach (var condition in sourceConditions)
        {
            if (string.IsNullOrWhiteSpace(condition.Field))
            {
                continue;
            }

            if (!TryParseOperator(condition.Operator, out var op))
            {
                _logger.LogWarning("Template trigger {TriggerId} skipped unknown operator '{Operator}'.", definition.Id, condition.Operator);
                continue;
            }

            var fieldId = new EventFieldId(condition.Field.Trim());
            normalizedConditions.Add(new RuleCondition(fieldId, op, condition.Value));

            var path = ResolvePath(config.Fields, condition.Field);
            fieldPaths[fieldId] = path;
        }

        var provider = new JsonElementFieldSelectorProvider(fieldPaths);
        var matchMode = ParseMatchMode(config.Match);
        var predicate = _expressionBuilder.Compile(normalizedConditions, matchMode, provider);

        return new TemplateTrigger(definition, predicate, _logger);
    }

    private static string ResolvePath(IReadOnlyDictionary<string, string>? fields, string field)
    {
        if (fields != null && fields.TryGetValue(field, out var path) && !string.IsNullOrWhiteSpace(path))
        {
            return path.Trim();
        }

        return field.Trim();
    }

    private static RuleMatchMode ParseMatchMode(string? value)
    {
        if (string.Equals(value, "any", StringComparison.OrdinalIgnoreCase))
        {
            return RuleMatchMode.Any;
        }

        return RuleMatchMode.All;
    }

    private static bool TryParseOperator(string? value, out RuleOperator op)
    {
        if (Enum.TryParse<RuleOperator>(value, true, out op))
        {
            return true;
        }

        var normalized = value?.Trim().ToLowerInvariant();
        switch (normalized)
        {
            case "eq":
                op = RuleOperator.Equals;
                return true;
            case "ne":
                op = RuleOperator.NotEquals;
                return true;
            case "contains":
                op = RuleOperator.Contains;
                return true;
            case "startswith":
                op = RuleOperator.StartsWith;
                return true;
            case "endswith":
                op = RuleOperator.EndsWith;
                return true;
            case "gt":
                op = RuleOperator.GreaterThan;
                return true;
            case "gte":
                op = RuleOperator.GreaterOrEqual;
                return true;
            case "lt":
                op = RuleOperator.LessThan;
                return true;
            case "lte":
                op = RuleOperator.LessOrEqual;
                return true;
            case "istrue":
                op = RuleOperator.IsTrue;
                return true;
            case "isfalse":
                op = RuleOperator.IsFalse;
                return true;
            case "isempty":
                op = RuleOperator.IsEmpty;
                return true;
            case "isnotempty":
                op = RuleOperator.IsNotEmpty;
                return true;
            default:
                op = default;
                return false;
        }
    }

    private static TemplateTriggerConfiguration? ParseConfiguration(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<TemplateTriggerConfiguration>(json, JsonOptions);
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

    private sealed class TemplateTrigger : ITrigger
    {
        private readonly EventTriggerDefinition _definition;
        private readonly Func<JsonElement, bool> _predicate;
        private readonly ILogger _logger;

        public TemplateTrigger(EventTriggerDefinition definition, Func<JsonElement, bool> predicate, ILogger logger)
        {
            _definition = definition;
            _predicate = predicate;
            _logger = logger;
        }

        public string Id => _definition.Id;
        public MessageType MessageType => _definition.MessageType;
        public IReadOnlyList<string> EffectIds => _definition.EffectIds;

        public TriggerEvaluationResult Evaluate(EventEnvelope envelope)
        {
            if (!JsonPayloadHelpers.TryConvertToJsonElement(envelope.Payload, out var payload))
            {
                return new TriggerEvaluationResult(false, "Payload not JSON serializable.");
            }

            try
            {
                var shouldFire = _predicate(payload);
                return shouldFire
                    ? new TriggerEvaluationResult(true)
                    : new TriggerEvaluationResult(false, "Template predicate returned false.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Template trigger {TriggerId} failed during evaluation.", Id);
                return new TriggerEvaluationResult(false, "Template predicate failed.");
            }
        }
    }

    private sealed record TemplateTriggerConfiguration
    {
        public string? Match { get; init; } = "all";
        public Dictionary<string, string>? Fields { get; init; }
        public List<TemplateCondition>? Conditions { get; init; }
    }

    private sealed record TemplateCondition
    {
        public string? Field { get; init; }
        public string? Operator { get; init; }
        public string? Value { get; init; }
    }
}
