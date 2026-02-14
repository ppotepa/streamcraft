using System;

namespace StreamCraft.Core.Events.Factories;

public interface IEventEffectFactory
{
    string TypeName { get; }
    IEffect? Create(EventEffectDefinition definition, IServiceProvider services);

    EventEffectTypeDescriptor Describe() =>
        new(
            TypeName,
            TypeName,
            "General",
            $"Effect type '{TypeName}'.",
            Options: Array.Empty<EventEffectOptionDescriptor>(),
            Presets: Array.Empty<EventEffectPresetDescriptor>());
}
