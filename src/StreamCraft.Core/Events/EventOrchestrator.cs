using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StreamCraft.Core.Messaging;

namespace StreamCraft.Core.Events;

public sealed class EventOrchestrator : IEventOrchestrator, IHostedService, IEventDiagnosticsSource
{
    private readonly IMessageBusEx _messageBus;
    private readonly ITriggerRegistry _triggerRegistry;
    private readonly IEffectRegistry _effectRegistry;
    private readonly ILogger<EventOrchestrator> _logger;
    private readonly EventSystemOptions _options;
    private readonly EventDiagnostics _diagnostics;
    private readonly SemaphoreSlim _effectSemaphore;
    private readonly ConcurrentDictionary<MessageType, Guid> _subscriptions = new();
    private readonly ConcurrentDictionary<Guid, Task> _runningEffects = new();
    private readonly ConcurrentDictionary<string, TriggerRateWindow> _triggerRateWindows = new();
    private readonly object _triggerMapLock = new();
    private IReadOnlyDictionary<MessageType, IReadOnlyList<ITrigger>> _triggerMap = new Dictionary<MessageType, IReadOnlyList<ITrigger>>();
    private CancellationTokenSource? _cts;
    private int _queuedEffects;

    public EventOrchestrator(
        IMessageBusEx messageBus,
        ITriggerRegistry triggerRegistry,
        IEffectRegistry effectRegistry,
        IOptions<EventSystemOptions> options,
        EventDiagnostics diagnostics,
        ILogger<EventOrchestrator> logger)
    {
        _messageBus = messageBus;
        _triggerRegistry = triggerRegistry;
        _effectRegistry = effectRegistry;
        _logger = logger;
        _options = options.Value;
        _diagnostics = diagnostics;
        _effectSemaphore = new SemaphoreSlim(Math.Max(1, _options.MaxConcurrentEffects));
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        if (!_options.Enabled)
        {
            _logger.LogInformation("Event system is disabled; orchestrator not started.");
            return Task.CompletedTask;
        }

        _cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        _triggerRegistry.Changed += OnTriggerRegistryChanged;
        _effectRegistry.Changed += OnEffectRegistryChanged;

        lock (_triggerMapLock)
        {
            BuildTriggerMap();
            SubscribeToTriggers();
        }

        _logger.LogInformation(
            "Event orchestrator started with {TriggerCount} triggers and {EffectCount} effects. MaxConcurrentEffects={MaxConcurrentEffects}, QueueLimit={QueueLimit}.",
            _triggerMap.Sum(x => x.Value.Count),
            _effectRegistry.GetAll().Count,
            _options.MaxConcurrentEffects,
            _options.MaxQueuedEffects);

        return Task.CompletedTask;
    }

    public EventDiagnosticsSnapshot GetSnapshot()
    {
        return _diagnostics.Snapshot(_runningEffects.Count);
    }

    public async Task StopAsync(CancellationToken cancellationToken)
    {
        _triggerRegistry.Changed -= OnTriggerRegistryChanged;
        _effectRegistry.Changed -= OnEffectRegistryChanged;

        foreach (var subscription in _subscriptions.Values)
        {
            _messageBus.Unsubscribe(subscription);
        }

        _subscriptions.Clear();

        if (_cts == null)
        {
            return;
        }

        _cts.Cancel();

        var running = _runningEffects.Values.ToArray();
        if (running.Length > 0)
        {
            try
            {
                await Task.WhenAll(running).WaitAsync(cancellationToken).ConfigureAwait(false);
            }
            catch (OperationCanceledException)
            {
                // Host is shutting down; swallow to allow graceful exit.
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to wait for all in-flight effects to complete cleanly.");
            }
        }

        _cts.Dispose();
        _cts = null;
    }

    private void OnTriggerRegistryChanged(object? sender, TriggerRegistryChangedEventArgs args)
    {
        if (!_options.Enabled)
        {
            return;
        }

        lock (_triggerMapLock)
        {
            BuildTriggerMap();

            if (args.ChangeType == TriggerRegistryChangeType.Added)
            {
                EnsureSubscription(args.Trigger.MessageType);
            }
            else
            {
                TryRemoveSubscription(args.Trigger.MessageType);
            }
        }
    }

    private void OnEffectRegistryChanged(object? sender, EffectRegistryChangedEventArgs args)
    {
        if (args.ChangeType == EffectRegistryChangeType.Added)
        {
            _logger.LogDebug("Effect {EffectId} registered.", args.Effect.Id);
        }
        else
        {
            _logger.LogDebug("Effect {EffectId} removed.", args.Effect.Id);
        }
    }

    private void BuildTriggerMap()
    {
        _triggerMap = _triggerRegistry
            .GetAll()
            .GroupBy(t => t.MessageType)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<ITrigger>)g.ToList());
    }

    private void SubscribeToTriggers()
    {
        foreach (var messageType in _triggerMap.Keys)
        {
            EnsureSubscription(messageType);
        }
    }

    private void EnsureSubscription(MessageType messageType)
    {
        if (_subscriptions.ContainsKey(messageType))
        {
            return;
        }

        var subscription = _messageBus.Subscribe<object>(messageType, HandleMessage);
        _subscriptions[messageType] = subscription;
    }

    private void TryRemoveSubscription(MessageType messageType)
    {
        if (_triggerMap.TryGetValue(messageType, out var triggers) && triggers.Count > 0)
        {
            return;
        }

        if (_subscriptions.TryRemove(messageType, out var subscriptionId))
        {
            _messageBus.Unsubscribe(subscriptionId);
        }
    }

    private void HandleMessage(Message<object> message)
    {
        if (_cts?.IsCancellationRequested == true)
        {
            return;
        }

        if (!_triggerMap.TryGetValue(message.Type, out var triggers) || triggers.Count == 0)
        {
            return;
        }

        var envelope = EventEnvelope.FromMessage(message.Type, message.Payload!, message.Metadata);
        _diagnostics.RecordMessage(message.Type);

        foreach (var trigger in triggers)
        {
            TriggerEvaluationResult evaluationResult;

            try
            {
                evaluationResult = trigger.Evaluate(envelope);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Trigger {TriggerId} threw during evaluation for {MessageType}.", trigger.Id, message.Type);
                continue;
            }

            _diagnostics.RecordTriggerEvaluation(evaluationResult.ShouldFire);

            if (!evaluationResult.ShouldFire)
            {
                continue;
            }

            if (IsRateLimited(trigger))
            {
                _logger.LogWarning("Trigger {TriggerId} skipped due to rate limiting.", trigger.Id);
                continue;
            }

            ExecuteEffects(trigger, envelope);
        }
    }

    private bool IsRateLimited(ITrigger trigger)
    {
        if (_options.MaxTriggerExecutionsPerMinute <= 0)
        {
            return false;
        }

        var window = _triggerRateWindows.GetOrAdd(trigger.Id, _ => new TriggerRateWindow());
        return !window.TryRecord(DateTime.UtcNow, _options.MaxTriggerExecutionsPerMinute);
    }

    private void ExecuteEffects(ITrigger trigger, EventEnvelope envelope)
    {
        foreach (var effectId in trigger.EffectIds)
        {
            if (!_effectRegistry.TryGet(effectId, out var effect))
            {
                _logger.LogWarning("Effect {EffectId} not registered for trigger {TriggerId}.", effectId, trigger.Id);
                continue;
            }

            if (effect is null)
            {
                _logger.LogWarning("Effect {EffectId} resolved as null for trigger {TriggerId}.", effectId, trigger.Id);
                continue;
            }

            if (!TryEnqueueEffect())
            {
                _diagnostics.RecordEffectDropped();
                _logger.LogWarning("Dropping effect {EffectId} because queue limit of {QueueLimit} has been reached.", effect.Id, _options.MaxQueuedEffects);
                continue;
            }

            _diagnostics.RecordEffectQueued();
            var taskId = Guid.NewGuid();
            var task = ExecuteEffectAsync(effect, envelope, taskId);
            _runningEffects[taskId] = task;
        }
    }

    private bool TryEnqueueEffect()
    {
        var newCount = Interlocked.Increment(ref _queuedEffects);
        var limit = _options.MaxQueuedEffects;

        if (limit > 0 && newCount > limit)
        {
            Interlocked.Decrement(ref _queuedEffects);
            return false;
        }

        return true;
    }

    private void OnEffectDequeued() => Interlocked.Decrement(ref _queuedEffects);

    private async Task ExecuteEffectAsync(IEffect effect, EventEnvelope envelope, Guid taskId)
    {
        var acquired = false;

        try
        {
            var token = _cts?.Token ?? CancellationToken.None;
            await _effectSemaphore.WaitAsync(token).ConfigureAwait(false);
            acquired = true;

            var baseMaxAttempts = Math.Max(1, _options.EffectRetryCount + 1);
            var attempt = 0;

            while (true)
            {
                attempt++;

                try
                {
                    using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(token);
                    timeoutCts.CancelAfter(TimeSpan.FromSeconds(Math.Max(1, _options.EffectTimeoutSeconds)));

                    var result = await effect.ExecuteAsync(envelope, timeoutCts.Token).ConfigureAwait(false);

                    if (result.Success)
                    {
                        _diagnostics.RecordEffectOutcome(true);
                        if (attempt > 1)
                        {
                            _logger.LogInformation("Effect {EffectId} succeeded after {Attempts} attempts.", effect.Id, attempt);
                        }

                        return;
                    }

                    _diagnostics.RecordEffectOutcome(false);
                    _logger.LogWarning(
                        "Effect {EffectId} reported failure on attempt {Attempt}: {Reason}",
                        effect.Id,
                        attempt,
                        result.Message ?? "unknown");

                    if (!HasMoreAttempts(attempt, baseMaxAttempts, result.RetrySuggested))
                    {
                        return;
                    }

                    await DelayForRetryAsync(token).ConfigureAwait(false);
                }
                catch (OperationCanceledException)
                {
                    _diagnostics.RecordEffectOutcome(false);
                    _logger.LogDebug("Effect {EffectId} canceled during execution.", effect.Id);
                    throw;
                }
                catch (Exception ex)
                {
                    _diagnostics.RecordEffectOutcome(false);
                    _logger.LogError(ex, "Effect {EffectId} failed on attempt {Attempt}.", effect.Id, attempt);

                    if (!HasMoreAttempts(attempt, baseMaxAttempts))
                    {
                        return;
                    }

                    await DelayForRetryAsync(token).ConfigureAwait(false);
                }
            }
        }
        finally
        {
            if (acquired)
            {
                _effectSemaphore.Release();
            }

            _runningEffects.TryRemove(taskId, out _);
            OnEffectDequeued();
        }
    }

    private bool HasMoreAttempts(int attempt, int baseMaxAttempts, bool retrySuggested = false)
    {
        if (attempt < baseMaxAttempts)
        {
            return true;
        }

        if (retrySuggested && attempt < baseMaxAttempts + 1)
        {
            return true;
        }

        return false;
    }

    private async Task DelayForRetryAsync(CancellationToken token)
    {
        _diagnostics.RecordRetry();

        var delay = Math.Max(0, _options.EffectRetryBackoffMilliseconds);
        if (delay <= 0)
        {
            return;
        }

        await Task.Delay(delay, token).ConfigureAwait(false);
    }

    private sealed class TriggerRateWindow
    {
        private readonly Queue<DateTime> _executions = new();
        private readonly object _sync = new();

        public bool TryRecord(DateTime timestampUtc, int maxPerMinute)
        {
            lock (_sync)
            {
                while (_executions.Count > 0 && timestampUtc - _executions.Peek() > TimeSpan.FromMinutes(1))
                {
                    _executions.Dequeue();
                }

                if (_executions.Count >= maxPerMinute)
                {
                    return false;
                }

                _executions.Enqueue(timestampUtc);
                return true;
            }
        }
    }
}
