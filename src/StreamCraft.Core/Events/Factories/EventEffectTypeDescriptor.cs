using System.Collections.Generic;

namespace StreamCraft.Core.Events.Factories;

public sealed record EventEffectTypeDescriptor(
    string TypeName,
    string DisplayName,
    string Category,
    string? Description,
    IReadOnlyList<EventEffectOptionDescriptor>? Options = null,
    IReadOnlyList<EventEffectPresetDescriptor>? Presets = null);

public sealed record EventEffectOptionDescriptor(
    string Key,
    string Label,
    string ValueType,
    string? Path = null,
    bool Required = false,
    string? Description = null,
    object? DefaultValue = null,
    IReadOnlyList<EventEffectOptionChoiceDescriptor>? Choices = null);

public sealed record EventEffectOptionChoiceDescriptor(
    string Value,
    string Label);

public sealed record EventEffectPresetDescriptor(
    string Id,
    string Name,
    string Category,
    string? Description = null,
    IReadOnlyDictionary<string, object?>? DefaultOptions = null,
    IReadOnlyList<string>? OptionKeys = null);
