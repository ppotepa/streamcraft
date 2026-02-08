using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace StreamCraft.Core.Events.Persistence;

public interface IEventDefinitionStore
{
    Task<IReadOnlyList<EventEffectDefinition>> LoadEffectsAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<EventTriggerDefinition>> LoadTriggersAsync(CancellationToken cancellationToken);

    Task SaveEffectAsync(EventEffectDefinition definition, CancellationToken cancellationToken);
    Task SaveTriggerAsync(EventTriggerDefinition definition, CancellationToken cancellationToken);
    Task DeleteEffectAsync(string effectId, CancellationToken cancellationToken);
    Task DeleteTriggerAsync(string triggerId, CancellationToken cancellationToken);
}
