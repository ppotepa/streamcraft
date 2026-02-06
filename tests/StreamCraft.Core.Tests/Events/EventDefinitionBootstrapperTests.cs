using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using StreamCraft.Core.Events;
using StreamCraft.Core.Events.Factories;
using StreamCraft.Core.Events.Persistence;
using StreamCraft.Core.Messaging;
using Xunit;

namespace StreamCraft.Core.Tests.Events;

public class EventDefinitionBootstrapperTests
{
    [Fact]
    public async Task Registers_enabled_effects_and_triggers()
    {
        var effectDefinition = new EventEffectDefinition(
            Id: "effect-1",
            TypeName: TestEffectFactory.Type,
            Description: null,
            ConfigurationJson: null,
            Enabled: true,
            CreatedUtc: DateTime.UtcNow,
            UpdatedUtc: DateTime.UtcNow);

        var triggerDefinition = new EventTriggerDefinition(
            Id: "trigger-1",
            TypeName: TestTriggerFactory.Type,
            MessageType: MessageType.Create("Test", "Ping"),
            EffectIds: new[] { effectDefinition.Id },
            FilterJson: null,
            Description: null,
            Enabled: true,
            CreatedUtc: DateTime.UtcNow,
            UpdatedUtc: DateTime.UtcNow);

        var store = new FakeDefinitionStore(new[] { effectDefinition }, new[] { triggerDefinition });
        var effectRegistry = new FakeEffectRegistry();
        var triggerRegistry = new FakeTriggerRegistry();
        var services = new ServiceCollection().BuildServiceProvider();
        var options = Options.Create(new EventSystemOptions { Enabled = true });

        var bootstrapper = new EventDefinitionBootstrapper(
            store,
            effectRegistry,
            triggerRegistry,
            new[] { new TestEffectFactory() },
            new[] { new TestTriggerFactory() },
            services,
            options,
            NullLogger<EventDefinitionBootstrapper>.Instance);

        await bootstrapper.StartAsync(CancellationToken.None);

        Assert.Contains(effectDefinition.Id, effectRegistry.RegisteredIds);
        Assert.Contains(triggerDefinition.Id, triggerRegistry.RegisteredIds);
    }

    [Fact]
    public async Task Skips_trigger_when_effect_missing()
    {
        var triggerDefinition = new EventTriggerDefinition(
            Id: "trigger-missing",
            TypeName: TestTriggerFactory.Type,
            MessageType: MessageType.Create("Test", "Missing"),
            EffectIds: new[] { "unknown" },
            FilterJson: null,
            Description: null,
            Enabled: true,
            CreatedUtc: DateTime.UtcNow,
            UpdatedUtc: DateTime.UtcNow);

        var store = new FakeDefinitionStore(Array.Empty<EventEffectDefinition>(), new[] { triggerDefinition });
        var effectRegistry = new FakeEffectRegistry();
        var triggerRegistry = new FakeTriggerRegistry();
        var options = Options.Create(new EventSystemOptions { Enabled = true });

        var bootstrapper = new EventDefinitionBootstrapper(
            store,
            effectRegistry,
            triggerRegistry,
            new[] { new TestEffectFactory() },
            new[] { new TestTriggerFactory() },
            new ServiceCollection().BuildServiceProvider(),
            options,
            NullLogger<EventDefinitionBootstrapper>.Instance);

        await bootstrapper.StartAsync(CancellationToken.None);

        Assert.Empty(triggerRegistry.RegisteredIds);
    }

    [Fact]
    public async Task Does_nothing_when_feature_disabled()
    {
        var store = new FakeDefinitionStore(Array.Empty<EventEffectDefinition>(), Array.Empty<EventTriggerDefinition>());
        var effectRegistry = new FakeEffectRegistry();
        var triggerRegistry = new FakeTriggerRegistry();
        var options = Options.Create(new EventSystemOptions { Enabled = false });

        var bootstrapper = new EventDefinitionBootstrapper(
            store,
            effectRegistry,
            triggerRegistry,
            Array.Empty<IEventEffectFactory>(),
            Array.Empty<IEventTriggerFactory>(),
            new ServiceCollection().BuildServiceProvider(),
            options,
            NullLogger<EventDefinitionBootstrapper>.Instance);

        await bootstrapper.StartAsync(CancellationToken.None);

        Assert.Empty(effectRegistry.RegisteredIds);
        Assert.Empty(triggerRegistry.RegisteredIds);
    }

    private sealed class FakeDefinitionStore : IEventDefinitionStore
    {
        private readonly IReadOnlyList<EventEffectDefinition> _effects;
        private readonly IReadOnlyList<EventTriggerDefinition> _triggers;

        public FakeDefinitionStore(IReadOnlyList<EventEffectDefinition> effects, IReadOnlyList<EventTriggerDefinition> triggers)
        {
            _effects = effects;
            _triggers = triggers;
        }

        public Task<IReadOnlyList<EventEffectDefinition>> LoadEffectsAsync(CancellationToken cancellationToken)
            => Task.FromResult(_effects);

        public Task<IReadOnlyList<EventTriggerDefinition>> LoadTriggersAsync(CancellationToken cancellationToken)
            => Task.FromResult(_triggers);
    }

    private sealed class FakeEffectRegistry : IEffectRegistry
    {
        private readonly Dictionary<string, IEffect> _effects = new(StringComparer.OrdinalIgnoreCase);

        public event EventHandler<EffectRegistryChangedEventArgs>? Changed;

        public IReadOnlyCollection<string> RegisteredIds => _effects.Keys.ToList();

        public IReadOnlyList<IEffect> GetAll() => _effects.Values.ToList();

        public void Register(IEffect effect)
        {
            _effects[effect.Id] = effect;
            Changed?.Invoke(this, new EffectRegistryChangedEventArgs(effect, EffectRegistryChangeType.Added));
        }

        public bool TryGet(string effectId, out IEffect? effect) => _effects.TryGetValue(effectId, out effect);

        public bool TryRemove(string effectId)
        {
            if (_effects.Remove(effectId, out var removed) && removed != null)
            {
                Changed?.Invoke(this, new EffectRegistryChangedEventArgs(removed, EffectRegistryChangeType.Removed));
                return true;
            }

            return false;
        }
    }

    private sealed class FakeTriggerRegistry : ITriggerRegistry
    {
        private readonly Dictionary<string, ITrigger> _triggers = new(StringComparer.OrdinalIgnoreCase);

        public event EventHandler<TriggerRegistryChangedEventArgs>? Changed;

        public IReadOnlyCollection<string> RegisteredIds => _triggers.Keys.ToList();

        public IReadOnlyList<ITrigger> GetAll() => _triggers.Values.ToList();

        public void Register(ITrigger trigger)
        {
            _triggers[trigger.Id] = trigger;
            Changed?.Invoke(this, new TriggerRegistryChangedEventArgs(trigger, TriggerRegistryChangeType.Added));
        }

        public bool TryRemove(string triggerId)
        {
            if (_triggers.Remove(triggerId, out var removed) && removed != null)
            {
                Changed?.Invoke(this, new TriggerRegistryChangedEventArgs(removed, TriggerRegistryChangeType.Removed));
                return true;
            }

            return false;
        }
    }

    private sealed class TestEffectFactory : IEventEffectFactory
    {
        public const string Type = "test.effect";
        public string TypeName => Type;

        public IEffect Create(EventEffectDefinition definition, IServiceProvider services)
        {
            return new TestEffect(definition.Id);
        }
    }

    private sealed class TestTriggerFactory : IEventTriggerFactory
    {
        public const string Type = "test.trigger";
        public string? TypeName => Type;

        public ITrigger? Create(EventTriggerDefinition definition, IServiceProvider services)
        {
            return new TestTrigger(definition.Id, definition.MessageType, definition.EffectIds);
        }
    }

    private sealed class TestEffect : IEffect
    {
        public TestEffect(string id)
        {
            Id = id;
        }

        public string Id { get; }

        public Task<EffectExecutionResult> ExecuteAsync(EventEnvelope envelope, CancellationToken cancellationToken = default)
            => Task.FromResult(EffectExecutionResult.Completed());
    }

    private sealed class TestTrigger : ITrigger
    {
        public TestTrigger(string id, MessageType messageType, IReadOnlyList<string> effectIds)
        {
            Id = id;
            MessageType = messageType;
            EffectIds = effectIds;
        }

        public string Id { get; }
        public MessageType MessageType { get; }
        public IReadOnlyList<string> EffectIds { get; }

        public TriggerEvaluationResult Evaluate(EventEnvelope envelope)
            => new(true);
    }
}
