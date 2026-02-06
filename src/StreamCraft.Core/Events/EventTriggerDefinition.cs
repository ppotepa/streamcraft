using System;
using System.Collections.Generic;
using StreamCraft.Core.Messaging;

namespace StreamCraft.Core.Events;

public sealed record EventTriggerDefinition(
    string Id,
    string? TypeName,
    MessageType MessageType,
    IReadOnlyList<string> EffectIds,
    string? FilterJson,
    string? Description,
    bool Enabled,
    DateTime CreatedUtc,
    DateTime UpdatedUtc);
