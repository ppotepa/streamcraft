using System.Collections.Generic;
using StreamCraft.Core.Events;

namespace StreamCraft.Core.Events.EventRules;

public interface IEventSchemaProvider
{
    IReadOnlyList<EventSourceDescriptor> GetSources();
    IReadOnlyList<EventTypeDescriptor> GetEventTypes();
}

public interface ITriggerTemplateCatalog
{
    IReadOnlyList<TriggerTemplateDescriptor> GetTemplates();
}

public interface IEffectTemplateCatalog
{
    IReadOnlyList<EffectTemplateDescriptor> GetTemplates();
}

public interface ITriggerRuleCompiler
{
    EventTriggerDefinition CompileTrigger(TriggerRuleInstance rule);
}

