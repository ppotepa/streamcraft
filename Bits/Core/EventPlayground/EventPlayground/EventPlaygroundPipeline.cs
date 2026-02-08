using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using StreamCraft.Core.Events;
using StreamCraft.Core.Messaging;

namespace StreamCraft.Bits.EventPlayground;

internal static class EventPlaygroundMessageTypes
{
    private const string Category = "EventPlayground";
    public static readonly MessageType Donation = MessageType.Create(Category, "Donation");
    public static readonly MessageType ChatMessage = MessageType.Create(Category, "ChatMessage");
}

public sealed record DonationEvent(decimal Amount, string Currency, string FromUser, string Message, DateTimeOffset Timestamp);

public sealed record ChatMessageEvent(string User, string Text, string Channel, DateTimeOffset Timestamp);

public sealed class FakeDonationProducer : IEventProducer<DonationEvent>
{
    private readonly Random _random = new();
    private readonly string[] _names = ["Ava", "Ben", "Casey", "Drew", "Eli", "Fin", "Gray", "Hayden"];
    private readonly string[] _messages = ["Keep it up!", "Hype!", "Love the stream", "GL HF", "Take my money", "Another one", "For science", "GG"];

    public string ProducerId => "eventplayground:producer:donations";

    public async IAsyncEnumerable<DonationEvent> StreamAsync([EnumeratorCancellation] CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            var delay = TimeSpan.FromSeconds(_random.Next(4, 11));
            await Task.Delay(delay, cancellationToken).ConfigureAwait(false);

            var amount = Math.Round((decimal)_random.NextDouble() * 25m + 1m, 2);
            var donor = _names[_random.Next(_names.Length)];
            var currency = _random.Next(0, 3) switch
            {
                0 => "USD",
                1 => "EUR",
                _ => "PLN"
            };
            var message = _messages[_random.Next(_messages.Length)];

            yield return new DonationEvent(amount, currency, donor, message, DateTimeOffset.UtcNow);
        }
    }
}

public sealed class FakeChatProducer : IEventProducer<ChatMessageEvent>
{
    private readonly Random _random = new();
    private readonly string[] _users = ["kappa", "lorem", "ipsum", "neo", "matrix", "caster", "observer"];
    private readonly string[] _phrases = ["pog", "gg", "so clean", "what a play", "clutch", "!song", "!overlay", "coffee time"];

    public string ProducerId => "eventplayground:producer:chat";

    public async IAsyncEnumerable<ChatMessageEvent> StreamAsync([EnumeratorCancellation] CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            var delay = TimeSpan.FromSeconds(_random.Next(2, 6));
            await Task.Delay(delay, cancellationToken).ConfigureAwait(false);

            var user = _users[_random.Next(_users.Length)];
            var text = _phrases[_random.Next(_phrases.Length)];
            yield return new ChatMessageEvent(user, text, "#demo", DateTimeOffset.UtcNow);
        }
    }
}

public sealed class DonationThresholdTrigger : ITrigger<DonationEvent>
{
    private readonly decimal _minimum;

    public DonationThresholdTrigger(decimal minimum)
    {
        _minimum = minimum;
    }

    public string TriggerId => "eventplayground:trigger:donation:min";

    public bool Matches(DonationEvent evt) => evt.Amount >= _minimum;
}

public sealed class ChatKeywordTrigger : ITrigger<ChatMessageEvent>
{
    private readonly string[] _keywords;

    public ChatKeywordTrigger(params string[] keywords)
    {
        _keywords = keywords ?? Array.Empty<string>();
    }

    public string TriggerId => "eventplayground:trigger:chat:keyword";

    public bool Matches(ChatMessageEvent evt)
    {
        if (_keywords.Length == 0)
        {
            return false;
        }

        foreach (var keyword in _keywords)
        {
            if (!string.IsNullOrWhiteSpace(keyword) && evt.Text.Contains(keyword, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }
}

public sealed class ConfettiEffect : IEffect<DonationEvent>
{
    public string EffectId => "eventplayground:effect:confetti";

    public ValueTask<EffectExecutionResult> ExecuteAsync(DonationEvent evt, IEffectContext context, CancellationToken cancellationToken)
    {
        var bus = context.Services.GetService<IMessageBus>();
        if (bus == null)
        {
            return ValueTask.FromResult(EffectExecutionResult.Failed("Message bus unavailable."));
        }

        var data = new Dictionary<string, object?>
        {
            ["from"] = evt.FromUser,
            ["amount"] = evt.Amount,
            ["currency"] = evt.Currency,
            ["message"] = evt.Message
        };

        var payload = new OverlayActionPayload("overlay", "confetti", data, $"Confetti for {evt.FromUser}");
        bus.Publish(OverlayMessageTypes.Action, payload, context.Metadata);
        context.Logger?.LogInformation("Confetti fired for {User} ({Amount} {Currency}).", evt.FromUser, evt.Amount, evt.Currency);
        return ValueTask.FromResult(EffectExecutionResult.Completed());
    }
}

public sealed class LogEffect<TEvent> : IEffect<TEvent> where TEvent : notnull
{
    private readonly ILogger _logger;

    public LogEffect(string effectId, ILogger logger)
    {
        EffectId = effectId;
        _logger = logger;
    }

    public string EffectId { get; }

    public ValueTask<EffectExecutionResult> ExecuteAsync(TEvent evt, IEffectContext context, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Effect {EffectId} saw event {@Event} (Source={Source}).", EffectId, evt, context.Metadata.Source ?? "unknown");
        return ValueTask.FromResult(EffectExecutionResult.Completed());
    }
}

public sealed class OverlayChatEffect : IEffect<ChatMessageEvent>
{
    public string EffectId => "eventplayground:effect:chat:overlay";

    public ValueTask<EffectExecutionResult> ExecuteAsync(ChatMessageEvent evt, IEffectContext context, CancellationToken cancellationToken)
    {
        var bus = context.Services.GetService<IMessageBus>();
        if (bus == null)
        {
            return ValueTask.FromResult(EffectExecutionResult.Failed("Message bus unavailable."));
        }

        var data = new Dictionary<string, object?>
        {
            ["user"] = evt.User,
            ["text"] = evt.Text,
            ["channel"] = evt.Channel
        };

        var payload = new OverlayActionPayload("overlay", "chat-bubble", data, $"Chat from {evt.User}");
        bus.Publish(OverlayMessageTypes.Action, payload, context.Metadata);
        return ValueTask.FromResult(EffectExecutionResult.Completed());
    }
}
