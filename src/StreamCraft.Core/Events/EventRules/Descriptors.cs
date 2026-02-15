using System.Collections.Generic;

namespace StreamCraft.Core.Events.EventRules;

public enum RuleValueType
{
    String = 0,
    Number = 1,
    Boolean = 2,
    DateTime = 3
}

public enum RuleOperator
{
    Equals = 0,
    NotEquals = 1,
    Contains = 2,
    StartsWith = 3,
    EndsWith = 4,
    GreaterThan = 5,
    GreaterOrEqual = 6,
    LessThan = 7,
    LessOrEqual = 8,
    IsTrue = 9,
    IsFalse = 10,
    IsEmpty = 11,
    IsNotEmpty = 12
}

public enum RuleMatchMode
{
    All = 0,
    Any = 1
}

public sealed record EventSourceDescriptor(
    EventSourceTypeId SourceTypeId,
    string DisplayName,
    string Description,
    IReadOnlyList<EventTypeId> EventTypes);

public sealed record EventTypeDescriptor(
    EventTypeId EventTypeId,
    EventSourceTypeId SourceTypeId,
    string Category,
    string Name,
    string DisplayName,
    string Description,
    IReadOnlyList<EventFieldDescriptor> Fields);

public sealed record EventFieldDescriptor(
    EventFieldId FieldId,
    string DisplayName,
    RuleValueType ValueType,
    string PayloadPath,
    bool IsFilterable,
    IReadOnlyList<RuleOperator> AllowedOperators,
    string? Description = null);

public sealed record TriggerConditionTemplate(
    EventFieldId FieldId,
    RuleOperator DefaultOperator,
    bool Required,
    string? Placeholder = null,
    string? Description = null);

public sealed record TriggerTemplateDescriptor(
    TriggerTemplateId TemplateId,
    string DisplayName,
    string Description,
    EventTypeId EventTypeId,
    string TriggerFactoryTypeName,
    IReadOnlyList<TriggerConditionTemplate> Conditions);

public sealed record EffectOptionDescriptor(
    string Key,
    string Label,
    RuleValueType ValueType,
    bool Required,
    string? Description = null,
    object? DefaultValue = null);

public sealed record EffectTemplateDescriptor(
    EffectTemplateId TemplateId,
    string DisplayName,
    string Description,
    string EffectFactoryTypeName,
    IReadOnlyList<EffectOptionDescriptor> Options);
