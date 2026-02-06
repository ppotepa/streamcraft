using System;

namespace StreamCraft.Core.Events;

public sealed record EventEffectDefinition(
    string Id,
    string TypeName,
    string? Description,
    string? ConfigurationJson,
    bool Enabled,
    DateTime CreatedUtc,
    DateTime UpdatedUtc);
