using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using StreamCraft.Core.Messaging;

namespace StreamCraft.Core.Events;

public interface IEventProducerRegistration
{
    string ProducerId { get; }
    MessageType MessageType { get; }
    Task RunAsync(IMessageBus messageBus, ILogger logger, CancellationToken cancellationToken);
}

public interface IEventProducerRegistry
{
    event EventHandler<EventProducerRegistryChangedEventArgs>? Changed;
    void Register(IEventProducerRegistration registration);
    bool TryRemove(string producerId);
    IReadOnlyList<IEventProducerRegistration> GetAll();
}

public sealed class EventProducerRegistryChangedEventArgs : EventArgs
{
    public EventProducerRegistryChangedEventArgs(IEventProducerRegistration registration, EventProducerRegistryChangeType changeType)
    {
        Registration = registration;
        ChangeType = changeType;
    }

    public IEventProducerRegistration Registration { get; }
    public EventProducerRegistryChangeType ChangeType { get; }
}

public enum EventProducerRegistryChangeType
{
    Added,
    Removed
}

public sealed class InMemoryEventProducerRegistry : IEventProducerRegistry
{
    private readonly ConcurrentDictionary<string, IEventProducerRegistration> _registrations = new(StringComparer.OrdinalIgnoreCase);
    public event EventHandler<EventProducerRegistryChangedEventArgs>? Changed;

    public void Register(IEventProducerRegistration registration)
    {
        ArgumentNullException.ThrowIfNull(registration);
        _registrations[registration.ProducerId] = registration;
        Changed?.Invoke(this, new EventProducerRegistryChangedEventArgs(registration, EventProducerRegistryChangeType.Added));
    }

    public bool TryRemove(string producerId)
    {
        ArgumentNullException.ThrowIfNull(producerId);

        if (_registrations.TryRemove(producerId, out var registration) && registration != null)
        {
            Changed?.Invoke(this, new EventProducerRegistryChangedEventArgs(registration, EventProducerRegistryChangeType.Removed));
            return true;
        }

        return false;
    }

    public IReadOnlyList<IEventProducerRegistration> GetAll()
    {
        return _registrations.Values.ToArray();
    }
}

public sealed class EventProducerRegistration<TEvent> : IEventProducerRegistration where TEvent : notnull
{
    private readonly IEventProducer<TEvent> _producer;
    private readonly MessageType _messageType;
    private readonly Func<TEvent, object> _payloadFactory;
    private readonly Func<TEvent, MessageMetadata?>? _metadataFactory;

    public EventProducerRegistration(
        IEventProducer<TEvent> producer,
        MessageType messageType,
        Func<TEvent, object>? payloadFactory = null,
        Func<TEvent, MessageMetadata?>? metadataFactory = null)
    {
        _producer = producer ?? throw new ArgumentNullException(nameof(producer));
        _messageType = messageType;
        _payloadFactory = payloadFactory ?? (evt => evt);
        _metadataFactory = metadataFactory;
    }

    public string ProducerId => _producer.ProducerId;
    public MessageType MessageType => _messageType;

    public async Task RunAsync(IMessageBus messageBus, ILogger logger, CancellationToken cancellationToken)
    {
        await foreach (var evt in _producer.StreamAsync(cancellationToken).WithCancellation(cancellationToken))
        {
            try
            {
                var metadata = _metadataFactory?.Invoke(evt) ?? MessageMetadata.Create(source: ProducerId);
                messageBus.Publish(_messageType, _payloadFactory(evt), metadata);
                logger.LogDebug("Published {MessageType} from producer {ProducerId}.", _messageType, ProducerId);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Event producer {ProducerId} failed to publish message {MessageType}.", ProducerId, _messageType);
            }
        }
    }
}
