using System.Collections.Generic;

namespace StreamCraft.Core.Events;

public sealed record OverlayActionPayload(
    string Route,
    string Command,
    IReadOnlyDictionary<string, object?>? Data,
    string? Description = null);
