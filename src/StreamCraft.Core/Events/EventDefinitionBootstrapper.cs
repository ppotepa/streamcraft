using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StreamCraft.Core.Events.Factories;
using StreamCraft.Core.Events.Persistence;

namespace StreamCraft.Core.Events;

public sealed class EventDefinitionBootstrapper : IHostedService
{
    private readonly IEventDefinitionStore _store;
    private readonly IEffectRegistry _effectRegistry;
    private readonly ITriggerRegistry _triggerRegistry;
    private readonly IReadOnlyDictionary<string, IEventEffectFactory> _effectFactories;
    private readonly IReadOnlyDictionary<string, IEventTriggerFactory> _triggerFactories;
    private readonly IServiceProvider _services;
    private readonly EventSystemOptions _options;
    private readonly ILogger<EventDefinitionBootstrapper> _logger;

    public EventDefinitionBootstrapper(
        IEventDefinitionStore store,
        IEffectRegistry effectRegistry,
        ITriggerRegistry triggerRegistry,
        IEnumerable<IEventEffectFactory> effectFactories,
        IEnumerable<IEventTriggerFactory> triggerFactories,
        IServiceProvider services,
        IOptions<EventSystemOptions> options,
        ILogger<EventDefinitionBootstrapper> logger)
    {
        _store = store;
        _effectRegistry = effectRegistry;
        _triggerRegistry = triggerRegistry;
        _effectFactories = effectFactories
            .GroupBy(x => x.TypeName, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.Last(), StringComparer.OrdinalIgnoreCase);
        _triggerFactories = triggerFactories
            .Where(x => !string.IsNullOrWhiteSpace(x.TypeName))
            .GroupBy(x => x.TypeName!, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.Last(), StringComparer.OrdinalIgnoreCase);
        _services = services;
        _options = options.Value;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        if (!_options.Enabled)
        {
            _logger.LogInformation("Event system disabled; skipping definition bootstrapper.");
            return;
        }

        IReadOnlyList<EventEffectDefinition> effectDefinitions;
        IReadOnlyList<EventTriggerDefinition> triggerDefinitions;

        try
        {
            effectDefinitions = await _store.LoadEffectsAsync(cancellationToken).ConfigureAwait(false);
            triggerDefinitions = await _store.LoadTriggersAsync(cancellationToken).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load event definitions.");
            return;
        }

        var registeredEffects = RegisterEffects(effectDefinitions);
        RegisterTriggers(triggerDefinitions, registeredEffects);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private HashSet<string> RegisterEffects(IReadOnlyList<EventEffectDefinition> definitions)
    {
        var registered = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var definition in definitions.Where(d => d.Enabled))
        {
            var typeName = definition.TypeName;
            if (string.IsNullOrWhiteSpace(typeName))
            {
                _logger.LogWarning("Effect {EffectId} skipped because no type name was provided.", definition.Id);
                continue;
            }

            if (!_effectFactories.TryGetValue(typeName, out var factory))
            {
                _logger.LogWarning("Effect {EffectId} skipped because no factory was registered for type '{TypeName}'.", definition.Id, typeName);
                continue;
            }

            var effect = factory.Create(definition, _services);
            if (effect == null)
            {
                _logger.LogWarning("Factory {Factory} returned null effect for definition {EffectId}.", factory.GetType().Name, definition.Id);
                continue;
            }

            _effectRegistry.Register(effect);
            registered.Add(effect.Id);
            _logger.LogInformation("Registered event effect {EffectId} ({TypeName}).", effect.Id, typeName);
        }

        return registered;
    }

    private void RegisterTriggers(IReadOnlyList<EventTriggerDefinition> definitions, HashSet<string> registeredEffects)
    {
        foreach (var definition in definitions.Where(d => d.Enabled))
        {
            var effectIds = FilterEffectIds(definition.EffectIds, registeredEffects);
            if (effectIds.Count == 0)
            {
                _logger.LogWarning("Trigger {TriggerId} skipped because none of its effects are registered.", definition.Id);
                continue;
            }

            var typeName = string.IsNullOrWhiteSpace(definition.TypeName)
                ? "core.metadata"
                : definition.TypeName!;

            if (!_triggerFactories.TryGetValue(typeName, out var factory))
            {
                _logger.LogWarning("Trigger {TriggerId} skipped because no factory was registered for type '{TypeName}'.", definition.Id, typeName);
                continue;
            }

            var trigger = factory.Create(definition with { EffectIds = effectIds }, _services);
            if (trigger == null)
            {
                _logger.LogWarning("Factory {Factory} returned null trigger for definition {TriggerId}.", factory.GetType().Name, definition.Id);
                continue;
            }

            _triggerRegistry.Register(trigger);
            _logger.LogInformation("Registered event trigger {TriggerId} ({TypeName}) with {EffectCount} effect(s).", trigger.Id, typeName, trigger.EffectIds.Count);
        }
    }

    private IReadOnlyList<string> FilterEffectIds(IReadOnlyList<string> requestedIds, HashSet<string> registeredEffects)
    {
        var valid = new List<string>();
        foreach (var effectId in requestedIds)
        {
            if (string.IsNullOrWhiteSpace(effectId))
            {
                continue;
            }

            var trimmed = effectId.Trim();
            if (registeredEffects.Contains(trimmed))
            {
                valid.Add(trimmed);
                continue;
            }

            if (_effectRegistry.TryGet(trimmed, out _))
            {
                valid.Add(trimmed);
                continue;
            }

            _logger.LogWarning("Trigger referenced unknown effect {EffectId}.", trimmed);
        }

        return valid;
    }
}
