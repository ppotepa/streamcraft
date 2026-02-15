using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using StreamCraft.Core.Events;
using StreamCraft.Core.Events.EventRules;
using StreamCraft.Core.Events.Factories;
using StreamCraft.Core.Events.Persistence;
using StreamCraft.Core.Messaging;

namespace StreamCraft.Engine.Controllers;

[ApiController]
[Route("events")]
public sealed class EventsController : ControllerBase
{
    private readonly IEventProducerRegistry _producerRegistry;
    private readonly ITriggerRegistry _triggerRegistry;
    private readonly IEffectRegistry _effectRegistry;
    private readonly IEventDefinitionStore _store;
    private readonly IReadOnlyDictionary<string, IEventEffectFactory> _effectFactories;
    private readonly IReadOnlyDictionary<string, IEventTriggerFactory> _triggerFactories;
    private readonly IEventSchemaProvider? _eventSchemaProvider;
    private readonly ITriggerTemplateCatalog? _triggerTemplateCatalog;
    private readonly IEffectTemplateCatalog? _effectTemplateCatalog;
    private readonly IServiceProvider _services;
    private readonly IMessageBus _messageBus;
    private readonly IEventDiagnosticsSource? _diagnostics;
    private readonly ILogger<EventsController> _logger;

    public EventsController(
        IEventProducerRegistry producerRegistry,
        ITriggerRegistry triggerRegistry,
        IEffectRegistry effectRegistry,
        IEventDefinitionStore store,
        IEnumerable<IEventEffectFactory> effectFactories,
        IEnumerable<IEventTriggerFactory> triggerFactories,
        IEventSchemaProvider? eventSchemaProvider,
        ITriggerTemplateCatalog? triggerTemplateCatalog,
        IEffectTemplateCatalog? effectTemplateCatalog,
        IServiceProvider services,
        IMessageBus messageBus,
        ILogger<EventsController> logger,
        IEventDiagnosticsSource? diagnostics = null)
    {
        _producerRegistry = producerRegistry;
        _triggerRegistry = triggerRegistry;
        _effectRegistry = effectRegistry;
        _store = store;
        _effectFactories = effectFactories.ToDictionary(x => x.TypeName, StringComparer.OrdinalIgnoreCase);
        _triggerFactories = triggerFactories
            .Where(x => !string.IsNullOrWhiteSpace(x.TypeName))
            .ToDictionary(x => x.TypeName!, StringComparer.OrdinalIgnoreCase);
        _eventSchemaProvider = eventSchemaProvider;
        _triggerTemplateCatalog = triggerTemplateCatalog;
        _effectTemplateCatalog = effectTemplateCatalog;
        _services = services;
        _messageBus = messageBus;
        _logger = logger;
        _diagnostics = diagnostics;
    }

    [HttpGet("sources")]
    public IActionResult GetSources()
    {
        if (_eventSchemaProvider == null)
        {
            return Ok(Array.Empty<EventSourceDescriptorDto>());
        }

        var eventTypes = _eventSchemaProvider.GetEventTypes();
        var eventTypeMap = eventTypes.ToDictionary(x => x.EventTypeId, x => x);

        var sources = _eventSchemaProvider
            .GetSources()
            .Select(source => new EventSourceDescriptorDto(
                source.SourceTypeId.Value,
                source.DisplayName,
                source.Description,
                source.EventTypes
                    .Where(eventTypeMap.ContainsKey)
                    .Select(eventTypeId => eventTypeMap[eventTypeId])
                    .Select(MapEventType)
                    .ToArray()))
            .ToArray();

        return Ok(sources);
    }

    [HttpGet("trigger-templates")]
    public IActionResult GetTriggerTemplates()
    {
        if (_triggerTemplateCatalog == null)
        {
            return Ok(Array.Empty<TriggerTemplateDescriptorDto>());
        }

        var templates = _triggerTemplateCatalog
            .GetTemplates()
            .Select(template => new TriggerTemplateDescriptorDto(
                template.TemplateId.Value,
                template.DisplayName,
                template.Description,
                template.EventTypeId.Value,
                template.TriggerFactoryTypeName,
                template.Conditions.Select(condition => new TriggerConditionTemplateDto(
                    condition.FieldId.Value,
                    condition.DefaultOperator.ToString(),
                    condition.Required,
                    condition.Placeholder,
                    condition.Description)).ToArray()))
            .ToArray();

        return Ok(templates);
    }

    [HttpGet("effect-templates")]
    public IActionResult GetEffectTemplates()
    {
        if (_effectTemplateCatalog == null)
        {
            return Ok(Array.Empty<EffectTemplateDescriptorDto>());
        }

        var templates = _effectTemplateCatalog
            .GetTemplates()
            .Select(template => new EffectTemplateDescriptorDto(
                template.TemplateId.Value,
                template.DisplayName,
                template.Description,
                template.EffectFactoryTypeName,
                template.Options.Select(option => new EffectTemplateOptionDto(
                    option.Key,
                    option.Label,
                    option.ValueType.ToString(),
                    option.Required,
                    option.Description,
                    option.DefaultValue)).ToArray()))
            .ToArray();

        return Ok(templates);
    }

    [HttpGet("producers")]
    public IActionResult GetProducers()
    {
        var items = _producerRegistry.GetAll()
            .Select(p => new ProducerDto(
                p.ProducerId,
                new MessageTypeDto(p.MessageType.Category, p.MessageType.Name)))
            .ToList();

        return Ok(items);
    }

    [HttpGet("effects")]
    public async Task<IActionResult> GetEffects(CancellationToken ct)
    {
        var definitions = await _store.LoadEffectsAsync(ct).ConfigureAwait(false);
        var runtime = _effectRegistry.GetAll().ToDictionary(e => e.Id, StringComparer.OrdinalIgnoreCase);

        var items = new List<EffectDto>();

        foreach (var def in definitions)
        {
            runtime.TryGetValue(def.Id, out var runtimeEffect);
            items.Add(new EffectDto(
                def.Id,
                def.TypeName,
                def.Description,
                def.ConfigurationJson,
                def.Enabled,
                RuntimeRegistered: runtimeEffect != null,
                RuntimeType: runtimeEffect?.GetType().FullName));
        }

        foreach (var runtimeOnly in runtime.Values.Where(e => definitions.All(d => !d.Id.Equals(e.Id, StringComparison.OrdinalIgnoreCase))))
        {
            items.Add(new EffectDto(
                runtimeOnly.Id,
                null,
                "(runtime)",
                null,
                true,
                RuntimeRegistered: true,
                RuntimeType: runtimeOnly.GetType().FullName));
        }

        return Ok(items);
    }

    [HttpGet("effect-types")]
    public IActionResult GetEffectTypes()
    {
        var items = _effectFactories.Values
            .Select(factory => factory.Describe())
            .OrderBy(descriptor => descriptor.Category, StringComparer.OrdinalIgnoreCase)
            .ThenBy(descriptor => descriptor.DisplayName, StringComparer.OrdinalIgnoreCase)
            .Select(descriptor => new EffectTypeDto(
                descriptor.TypeName,
                descriptor.DisplayName,
                descriptor.Category,
                descriptor.Description,
                (descriptor.Options ?? Array.Empty<EventEffectOptionDescriptor>())
                    .Select(option => new EffectOptionDto(
                        option.Key,
                        option.Label,
                        option.ValueType,
                        option.Path,
                        option.Required,
                        option.Description,
                        option.DefaultValue,
                        (option.Choices ?? Array.Empty<EventEffectOptionChoiceDescriptor>())
                            .Select(choice => new EffectOptionChoiceDto(choice.Value, choice.Label))
                            .ToArray()))
                    .ToArray(),
                (descriptor.Presets ?? Array.Empty<EventEffectPresetDescriptor>())
                    .Select(preset => new EffectPresetDto(
                        preset.Id,
                        preset.Name,
                        preset.Category,
                        preset.Description,
                        preset.DefaultOptions,
                        preset.OptionKeys))
                    .ToArray()))
            .ToList();

        return Ok(items);
    }

    [HttpGet("triggers")]
    public async Task<IActionResult> GetTriggers(CancellationToken ct)
    {
        var definitions = await _store.LoadTriggersAsync(ct).ConfigureAwait(false);
        var runtime = _triggerRegistry.GetAll().ToDictionary(t => t.Id, StringComparer.OrdinalIgnoreCase);

        var items = new List<TriggerDto>();

        foreach (var def in definitions)
        {
            runtime.TryGetValue(def.Id, out var runtimeTrigger);
            items.Add(new TriggerDto(
                def.Id,
                def.TypeName,
                new MessageTypeDto(def.MessageType.Category, def.MessageType.Name),
                def.EffectIds,
                def.FilterJson,
                def.Description,
                def.Enabled,
                RuntimeRegistered: runtimeTrigger != null,
                RuntimeType: runtimeTrigger?.GetType().FullName));
        }

        foreach (var runtimeOnly in runtime.Values.Where(t => definitions.All(d => !d.Id.Equals(t.Id, StringComparison.OrdinalIgnoreCase))))
        {
            items.Add(new TriggerDto(
                runtimeOnly.Id,
                null,
                new MessageTypeDto(runtimeOnly.MessageType.Category, runtimeOnly.MessageType.Name),
                runtimeOnly.EffectIds,
                null,
                "(runtime)",
                true,
                RuntimeRegistered: true,
                RuntimeType: runtimeOnly.GetType().FullName));
        }

        return Ok(items);
    }

    [HttpGet("diagnostics")]
    public IActionResult GetDiagnostics()
    {
        if (_diagnostics == null)
        {
            return Ok(new { enabled = false });
        }

        var snapshot = _diagnostics.GetSnapshot();
        return Ok(new
        {
            enabled = true,
            snapshot
        });
    }

    [HttpPost("effects")]
    public async Task<IActionResult> UpsertEffect([FromBody] UpsertEffectRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Id) || string.IsNullOrWhiteSpace(request.TypeName))
        {
            return BadRequest("Effect id and typeName are required.");
        }

        if (!_effectFactories.TryGetValue(request.TypeName, out var factory))
        {
            return BadRequest($"No effect factory registered for type '{request.TypeName}'.");
        }

        var definition = new EventEffectDefinition(
            request.Id.Trim(),
            request.TypeName.Trim(),
            request.Description,
            request.ConfigurationJson,
            request.Enabled,
            DateTime.UtcNow,
            DateTime.UtcNow);

        var effect = factory.Create(definition, _services);
        if (effect == null)
        {
            return BadRequest("Factory returned null. Check configurationJson.");
        }

        _effectRegistry.Register(effect);
        await _store.SaveEffectAsync(definition, ct).ConfigureAwait(false);
        _logger.LogInformation("Effect {EffectId} upserted (type {TypeName}).", request.Id, request.TypeName);

        return Ok(new { effectId = effect.Id, registered = true });
    }

    [HttpDelete("effects/{id}")]
    public async Task<IActionResult> DeleteEffect(string id, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest("Effect id is required.");
        }

        await _store.DeleteEffectAsync(id, ct).ConfigureAwait(false);
        _effectRegistry.TryRemove(id);
        _logger.LogInformation("Effect {EffectId} deleted.", id);
        return NoContent();
    }

    [HttpPost("triggers")]
    public async Task<IActionResult> UpsertTrigger([FromBody] UpsertTriggerRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Id))
        {
            return BadRequest("Trigger id is required.");
        }

        if (request.MessageType == null || string.IsNullOrWhiteSpace(request.MessageType.Category) || string.IsNullOrWhiteSpace(request.MessageType.Name))
        {
            return BadRequest("MessageType category and name are required.");
        }

        var effectIds = (request.EffectIds ?? Array.Empty<string>())
            .Where(e => !string.IsNullOrWhiteSpace(e))
            .Select(e => e.Trim())
            .ToArray();

        if (effectIds.Length == 0)
        {
            return BadRequest("At least one effectId is required.");
        }

        var missingEffects = effectIds.Where(id => !_effectRegistry.TryGet(id, out _)).ToArray();
        if (missingEffects.Length > 0)
        {
            return BadRequest($"Effects not registered: {string.Join(", ", missingEffects)}");
        }

        var typeName = string.IsNullOrWhiteSpace(request.TypeName) ? "core.metadata" : request.TypeName.Trim();
        if (!_triggerFactories.TryGetValue(typeName, out var factory))
        {
            return BadRequest($"No trigger factory registered for type '{typeName}'.");
        }

        var messageType = MessageType.Create(request.MessageType.Category.Trim(), request.MessageType.Name.Trim());
        var definition = new EventTriggerDefinition(
            request.Id.Trim(),
            typeName,
            messageType,
            effectIds,
            request.FilterJson,
            request.Description,
            request.Enabled,
            DateTime.UtcNow,
            DateTime.UtcNow);

        var trigger = factory.Create(definition, _services);
        if (trigger == null)
        {
            return BadRequest("Factory returned null. Check filterJson or configuration.");
        }

        _triggerRegistry.Register(trigger);
        await _store.SaveTriggerAsync(definition, ct).ConfigureAwait(false);
        _logger.LogInformation("Trigger {TriggerId} upserted (type {TypeName}).", request.Id, typeName);

        return Ok(new { triggerId = trigger.Id, registered = true });
    }

    [HttpDelete("triggers/{id}")]
    public async Task<IActionResult> DeleteTrigger(string id, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest("Trigger id is required.");
        }

        await _store.DeleteTriggerAsync(id, ct).ConfigureAwait(false);
        _triggerRegistry.TryRemove(id);
        _logger.LogInformation("Trigger {TriggerId} deleted.", id);
        return NoContent();
    }

    [HttpPost("emit")]
    public IActionResult Emit([FromBody] EmitEventRequest request)
    {
        if (request?.MessageType == null || string.IsNullOrWhiteSpace(request.MessageType.Category) || string.IsNullOrWhiteSpace(request.MessageType.Name))
        {
            return BadRequest("MessageType category and name are required.");
        }

        var messageType = MessageType.Create(request.MessageType.Category.Trim(), request.MessageType.Name.Trim());
        var metadata = request.Metadata == null
            ? MessageMetadata.Create(request.Source)
            : new MessageMetadata
            {
                Source = string.IsNullOrWhiteSpace(request.Metadata.Source) ? request.Source : request.Metadata.Source,
                CorrelationId = request.Metadata.CorrelationId,
                Timestamp = DateTime.UtcNow,
                MessageId = Guid.NewGuid()
            };

        var payload = request.Payload ?? new { }; // allow empty object
        _messageBus.Publish(messageType, payload, metadata);
        _logger.LogInformation("Emitted test event {MessageType} from {Source}.", messageType, metadata.Source ?? "unknown");

        return Accepted(new { messageType = messageType.Id, metadata.Source });
    }

    private static EventTypeDescriptorDto MapEventType(EventTypeDescriptor eventType)
    {
        return new EventTypeDescriptorDto(
            eventType.EventTypeId.Value,
            eventType.SourceTypeId.Value,
            eventType.Category,
            eventType.Name,
            eventType.DisplayName,
            eventType.Description,
            eventType.Fields.Select(field => new EventFieldDescriptorDto(
                field.FieldId.Value,
                field.DisplayName,
                field.ValueType.ToString(),
                field.PayloadPath,
                field.IsFilterable,
                field.AllowedOperators.Select(op => op.ToString()).ToArray(),
                field.Description)).ToArray());
    }

    public sealed record EventSourceDescriptorDto(
        string SourceTypeId,
        string DisplayName,
        string Description,
        IReadOnlyList<EventTypeDescriptorDto> EventTypes);

    public sealed record EventTypeDescriptorDto(
        string EventTypeId,
        string SourceTypeId,
        string Category,
        string Name,
        string DisplayName,
        string Description,
        IReadOnlyList<EventFieldDescriptorDto> Fields);

    public sealed record EventFieldDescriptorDto(
        string FieldId,
        string DisplayName,
        string ValueType,
        string PayloadPath,
        bool IsFilterable,
        IReadOnlyList<string> AllowedOperators,
        string? Description);

    public sealed record TriggerTemplateDescriptorDto(
        string TemplateId,
        string DisplayName,
        string Description,
        string EventTypeId,
        string TriggerFactoryTypeName,
        IReadOnlyList<TriggerConditionTemplateDto> Conditions);

    public sealed record TriggerConditionTemplateDto(
        string FieldId,
        string DefaultOperator,
        bool Required,
        string? Placeholder,
        string? Description);

    public sealed record EffectTemplateDescriptorDto(
        string TemplateId,
        string DisplayName,
        string Description,
        string EffectFactoryTypeName,
        IReadOnlyList<EffectTemplateOptionDto> Options);

    public sealed record EffectTemplateOptionDto(
        string Key,
        string Label,
        string ValueType,
        bool Required,
        string? Description,
        object? DefaultValue);

    public sealed record ProducerDto(string ProducerId, MessageTypeDto MessageType);

    public sealed record EffectDto(
        string Id,
        string? TypeName,
        string? Description,
        string? ConfigurationJson,
        bool Enabled,
        bool RuntimeRegistered,
        string? RuntimeType);

    public sealed record EffectTypeDto(
        string TypeName,
        string DisplayName,
        string Category,
        string? Description,
        IReadOnlyList<EffectOptionDto> Options,
        IReadOnlyList<EffectPresetDto> Presets);

    public sealed record EffectOptionDto(
        string Key,
        string Label,
        string ValueType,
        string? Path,
        bool Required,
        string? Description,
        object? DefaultValue,
        IReadOnlyList<EffectOptionChoiceDto> Choices);

    public sealed record EffectOptionChoiceDto(
        string Value,
        string Label);

    public sealed record EffectPresetDto(
        string Id,
        string Name,
        string Category,
        string? Description,
        IReadOnlyDictionary<string, object?>? DefaultOptions,
        IReadOnlyList<string>? OptionKeys);

    public sealed record TriggerDto(
        string Id,
        string? TypeName,
        MessageTypeDto MessageType,
        IReadOnlyList<string> EffectIds,
        string? FilterJson,
        string? Description,
        bool Enabled,
        bool RuntimeRegistered,
        string? RuntimeType);

    public sealed record MessageTypeDto(string Category, string Name);

    public sealed record UpsertEffectRequest(
        string Id,
        string TypeName,
        string? Description,
        string? ConfigurationJson,
        bool Enabled = true);

    public sealed record UpsertTriggerRequest(
        string Id,
        MessageTypeDto MessageType,
        IReadOnlyList<string>? EffectIds,
        string? TypeName,
        string? FilterJson,
        string? Description,
        bool Enabled = true);

    public sealed record EmitEventRequest(
        MessageTypeDto MessageType,
        object? Payload,
        EmitMetadata? Metadata,
        string? Source);

    public sealed record EmitMetadata(string? Source, string? CorrelationId);
}
