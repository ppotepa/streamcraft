using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using StreamCraft.Core.Messaging;

namespace StreamCraft.Core.Events.EventRules;

public sealed class TriggerRuleCompiler : ITriggerRuleCompiler
{
    private readonly IEventSchemaProvider _schemaProvider;

    public TriggerRuleCompiler(IEventSchemaProvider schemaProvider)
    {
        _schemaProvider = schemaProvider;
    }

    public EventTriggerDefinition CompileTrigger(TriggerRuleInstance rule)
    {
        ArgumentNullException.ThrowIfNull(rule);

        var eventType = _schemaProvider
            .GetEventTypes()
            .FirstOrDefault(entry => entry.EventTypeId == rule.EventTypeId);

        if (eventType == null)
        {
            throw new InvalidOperationException($"Unknown event type: {rule.EventTypeId.Value}");
        }

        var fieldPathMap = eventType.Fields
            .ToDictionary(field => field.FieldId.Value, field => field.PayloadPath, StringComparer.OrdinalIgnoreCase);

        var filterConfig = new
        {
            match = "all",
            fields = fieldPathMap,
            conditions = rule.Conditions.Select(condition => new
            {
                field = condition.FieldId.Value,
                @operator = condition.Operator.ToString(),
                value = condition.Value
            }).ToArray()
        };

        var effectIds = rule.Actions
            .Select(action => action.EffectId)
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var now = DateTime.UtcNow;
        return new EventTriggerDefinition(
            rule.RuleId.Value,
            "core.template",
            MessageType.Create(eventType.Category, eventType.Name),
            effectIds,
            JsonSerializer.Serialize(filterConfig),
            $"Rule template: {rule.TriggerTemplateId.Value}",
            rule.Enabled,
            now,
            now);
    }
}

