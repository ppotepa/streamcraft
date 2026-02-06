using System;

namespace StreamCraft.Core.Events.Factories;

public interface IEventTriggerFactory
{
    string? TypeName { get; }
    ITrigger? Create(EventTriggerDefinition definition, IServiceProvider services);
}
