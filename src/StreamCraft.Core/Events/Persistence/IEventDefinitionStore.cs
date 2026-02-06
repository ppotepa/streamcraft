using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace StreamCraft.Core.Events.Persistence;

public interface IEventDefinitionStore
{
    Task<IReadOnlyList<EventEffectDefinition>> LoadEffectsAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<EventTriggerDefinition>> LoadTriggersAsync(CancellationToken cancellationToken);
}
