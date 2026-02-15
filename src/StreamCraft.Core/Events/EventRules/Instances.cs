using System;
using System.Collections.Generic;

namespace StreamCraft.Core.Events.EventRules;

public sealed record RuleCondition(
    EventFieldId FieldId,
    RuleOperator Operator,
    string? Value);

public sealed record RuleActionBinding(
    string EffectId,
    EffectTemplateId EffectTemplateId,
    IReadOnlyDictionary<string, object?> Options);

public sealed record TriggerRuleInstance(
    TriggerRuleId RuleId,
    TriggerTemplateId TriggerTemplateId,
    EventTypeId EventTypeId,
    IReadOnlyList<RuleCondition> Conditions,
    IReadOnlyList<RuleActionBinding> Actions,
    bool Enabled,
    TimeSpan? Cooldown,
    int Version,
    DateTime CreatedUtc,
    DateTime UpdatedUtc);

