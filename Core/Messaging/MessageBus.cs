using Core.Diagnostics;
using Messaging.Shared;
using Serilog;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Threading.Channels;

namespace Core.Messaging;

public class MessageBus : IMessageBus, IMessageBusDiagnostics, IDisposable
{
    private readonly ConcurrentDictionary<MessageType, ConcurrentDictionary<Guid, Action<object>>> _subscriptions = new();
    private readonly ConcurrentDictionary<MessageType, ConcurrentDictionary<Guid, Action<object, MessageMetadata>>> _metadataSubscriptions = new();
    private readonly ConcurrentDictionary<Guid, MessageType> _subscriptionIndex = new();
    private readonly Channel<BusMessage> _queue;
    private readonly Task _processor;
    private readonly CancellationTokenSource _cts = new();
    private readonly ILogger? _logger;
    private bool _disposed;
    private long _pendingMessages;
    private DateTime _lastPublishedUtc = DateTime.MinValue;

    public MessageBus(ILogger? logger = null)
    {
        _logger = logger;
        _queue = Channel.CreateUnbounded<BusMessage>(new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = false
        });
        _processor = Task.Run(ProcessAsync);
    }

    public void Publish<TPayload>(MessageType messageType, TPayload payload, MessageMetadata? metadata = null)
    {
        var envelope = new BusMessage(messageType, payload!, NormalizeMetadata(metadata));
        Interlocked.Increment(ref _pendingMessages);
        _lastPublishedUtc = DateTime.UtcNow;
        if (!_queue.Writer.TryWrite(envelope))
        {
            Interlocked.Decrement(ref _pendingMessages);
            _logger?.Warning("Message bus dropped message {MessageType} due to a closed queue.", messageType);
        }
    }

    public async Task PublishAsync<TPayload>(MessageType messageType, TPayload payload, MessageMetadata? metadata = null, CancellationToken cancellationToken = default)
    {
        var envelope = new BusMessage(messageType, payload!, NormalizeMetadata(metadata));
        try
        {
            Interlocked.Increment(ref _pendingMessages);
            _lastPublishedUtc = DateTime.UtcNow;
            await _queue.Writer.WriteAsync(envelope, cancellationToken);
        }
        catch (OperationCanceledException)
        {
            Interlocked.Decrement(ref _pendingMessages);
            throw;
        }
        catch (ChannelClosedException)
        {
            Interlocked.Decrement(ref _pendingMessages);
            _logger?.Warning("Message bus dropped message {MessageType} due to a closed queue.", messageType);
        }
    }

    public Guid Subscribe<TPayload>(MessageType messageType, Action<TPayload> handler)
    {
        var subscriptionId = Guid.NewGuid();
        var handlers = _subscriptions.GetOrAdd(messageType, _ => new ConcurrentDictionary<Guid, Action<object>>());
        handlers[subscriptionId] = payload =>
        {
            if (payload is TPayload typed)
            {
                handler(typed);
                return;
            }

            _logger?.Warning("Message payload type mismatch for {MessageType}. Expected {Expected}, got {Actual}.",
                messageType,
                typeof(TPayload).FullName,
                payload?.GetType().FullName ?? "null");
        };
        _subscriptionIndex[subscriptionId] = messageType;
        return subscriptionId;
    }

    protected Guid SubscribeWithMetadata<TPayload>(MessageType messageType, Action<TPayload, MessageMetadata> handler)
    {
        var subscriptionId = Guid.NewGuid();
        var handlers = _metadataSubscriptions.GetOrAdd(messageType, _ => new ConcurrentDictionary<Guid, Action<object, MessageMetadata>>());
        handlers[subscriptionId] = (payload, metadata) =>
        {
            if (payload is TPayload typed)
            {
                handler(typed, metadata);
                return;
            }

            _logger?.Warning("Message payload type mismatch for {MessageType}. Expected {Expected}, got {Actual}.",
                messageType,
                typeof(TPayload).FullName,
                payload?.GetType().FullName ?? "null");
        };
        _subscriptionIndex[subscriptionId] = messageType;
        return subscriptionId;
    }

    public void Unsubscribe(Guid subscriptionId)
    {
        if (_subscriptionIndex.TryRemove(subscriptionId, out var messageType))
        {
            if (_subscriptions.TryGetValue(messageType, out var handlers))
            {
                handlers.TryRemove(subscriptionId, out _);
            }

            if (_metadataSubscriptions.TryGetValue(messageType, out var metaHandlers))
            {
                metaHandlers.TryRemove(subscriptionId, out _);
            }
        }
    }

    public void Clear()
    {
        _subscriptions.Clear();
        _metadataSubscriptions.Clear();
        _subscriptionIndex.Clear();
    }

    private async Task ProcessAsync()
    {
        try
        {
            while (await _queue.Reader.WaitToReadAsync(_cts.Token))
            {
                while (_queue.Reader.TryRead(out var message))
                {
                    if (!_subscriptions.TryGetValue(message.Type, out var handlers))
                    {
                        handlers = null;
                    }

                    if (handlers != null)
                    {
                        foreach (var handler in handlers.Values)
                        {
                            try
                            {
                                handler(message.Payload);
                            }
                            catch (Exception ex)
                            {
                                ExceptionFactory.Report(ex, ExceptionSeverity.Error, source: "MessageBus",
                                    correlationId: message.Metadata.CorrelationId,
                                    context: new Dictionary<string, string?>
                                    {
                                        ["MessageType"] = message.Type.ToString(),
                                        ["HandlerKind"] = "Payload"
                                    });
                                _logger?.Error(ex,
                                    "Message handler failed for {MessageType} (Source: {Source}, CorrelationId: {CorrelationId}).",
                                    message.Type,
                                    message.Metadata.Source ?? "(unknown)",
                                    message.Metadata.CorrelationId ?? "(none)");
                            }
                        }
                    }

                    if (_metadataSubscriptions.TryGetValue(message.Type, out var metaHandlers))
                    {
                        foreach (var handler in metaHandlers.Values)
                        {
                            try
                            {
                                handler(message.Payload, message.Metadata);
                            }
                            catch (Exception ex)
                            {
                                ExceptionFactory.Report(ex, ExceptionSeverity.Error, source: "MessageBus",
                                    correlationId: message.Metadata.CorrelationId,
                                    context: new Dictionary<string, string?>
                                    {
                                        ["MessageType"] = message.Type.ToString(),
                                        ["HandlerKind"] = "Metadata"
                                    });
                                _logger?.Error(ex,
                                    "Message handler failed for {MessageType} (Source: {Source}, CorrelationId: {CorrelationId}).",
                                    message.Type,
                                    message.Metadata.Source ?? "(unknown)",
                                    message.Metadata.CorrelationId ?? "(none)");
                            }
                        }
                    }

                    Interlocked.Decrement(ref _pendingMessages);
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Expected during shutdown
        }
    }

    private sealed record BusMessage(MessageType Type, object Payload, MessageMetadata Metadata);

    public long PendingMessages => Interlocked.Read(ref _pendingMessages);

    public int SubscriptionCount
        => _subscriptions.Sum(entry => entry.Value.Count) + _metadataSubscriptions.Sum(entry => entry.Value.Count);

    public DateTime LastPublishedUtc => _lastPublishedUtc;

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        _disposed = true;
        _queue.Writer.TryComplete();
        _cts.Cancel();

        try
        {
            _processor.Wait(TimeSpan.FromSeconds(2));
        }
        catch
        {
            // Ignore shutdown errors
        }
        finally
        {
            _cts.Dispose();
        }
    }

    private static MessageMetadata NormalizeMetadata(MessageMetadata? metadata)
    {
        if (metadata == null)
        {
            return new MessageMetadata
            {
                CorrelationId = GetCorrelationId()
            };
        }

        if (!string.IsNullOrWhiteSpace(metadata.CorrelationId))
        {
            return metadata;
        }

        return new MessageMetadata
        {
            Timestamp = metadata.Timestamp,
            MessageId = metadata.MessageId,
            Source = metadata.Source,
            CorrelationId = GetCorrelationId()
        };
    }

    private static string GetCorrelationId()
    {
        return Activity.Current?.Id ?? Guid.NewGuid().ToString("N");
    }
}
