using System;

namespace StreamCraft.Core.Events.Factories;

public interface IEventEffectFactory
{
    string TypeName { get; }
    IEffect? Create(EventEffectDefinition definition, IServiceProvider services);
}
