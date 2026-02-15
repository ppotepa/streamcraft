namespace StreamCraft.Core.Events.EventRules;

public readonly record struct EventSourceTypeId(string Value)
{
    public override string ToString() => Value;
}

public readonly record struct EventTypeId(string Value)
{
    public override string ToString() => Value;
}

public readonly record struct EventFieldId(string Value)
{
    public override string ToString() => Value;
}

public readonly record struct TriggerTemplateId(string Value)
{
    public override string ToString() => Value;
}

public readonly record struct EffectTemplateId(string Value)
{
    public override string ToString() => Value;
}

public readonly record struct TriggerRuleId(string Value)
{
    public override string ToString() => Value;
}

