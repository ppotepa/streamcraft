using System;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using StreamCraft.Core.Bits;
using StreamCraft.Core.Events;
using StreamCraft.Core.Messaging;

namespace StreamCraft.Bits.EventPlayground;

[BitRoute("/event-playground")]
public sealed class EventPlaygroundBit : StreamBit<EventPlaygroundState>
{
    private bool _registered;
    private CancellationTokenSource? _simulationCts;

    public override string Name => "Event Playground";
    public override string Description => "Fake donations + chat events for trigger/effect testing.";

    protected override void OnInitialize()
    {
        var services = Context?.ServiceProvider;
        if (services == null)
        {
            return;
        }

        var producers = services.GetService<IEventProducerRegistry>();
        var triggers = services.GetService<ITriggerRegistry>();
        var effects = services.GetService<IEffectRegistry>();
        var loggerFactory = services.GetService<ILoggerFactory>();

        if (producers == null || triggers == null || effects == null || loggerFactory == null)
        {
            Context?.Logger.Warning("Event system disabled; EventPlayground will not emit demo events.");
            return;
        }

        RegisterProducers(producers);
        RegisterPipeline(services, triggers, effects, loggerFactory);
        _registered = true;

        var env = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "";
        if (env.Equals("development", StringComparison.OrdinalIgnoreCase))
        {
            StartSimulation();
        }
    }

    private void RegisterProducers(IEventProducerRegistry registry)
    {
        registry.Register(new EventProducerRegistration<DonationEvent>(
            new FakeDonationProducer(),
            EventPlaygroundMessageTypes.Donation,
            metadataFactory: _ => MessageMetadata.Create(source: "eventplayground:donations")));

        registry.Register(new EventProducerRegistration<ChatMessageEvent>(
            new FakeChatProducer(),
            EventPlaygroundMessageTypes.ChatMessage,
            metadataFactory: _ => MessageMetadata.Create(source: "eventplayground:chat")));
    }

    private void RegisterPipeline(
        IServiceProvider services,
        ITriggerRegistry triggerRegistry,
        IEffectRegistry effectRegistry,
        ILoggerFactory loggerFactory)
    {
        var logDonationEffect = new LogEffect<DonationEvent>(
            "eventplayground:effect:donation:log",
            loggerFactory.CreateLogger<LogEffect<DonationEvent>>());
        var confettiEffect = new ConfettiEffect();

        effectRegistry.Register(new TypedEffectAdapter<DonationEvent>(confettiEffect, services, loggerFactory.CreateLogger<TypedEffectAdapter<DonationEvent>>()));
        effectRegistry.Register(new TypedEffectAdapter<DonationEvent>(logDonationEffect, services, loggerFactory.CreateLogger<TypedEffectAdapter<DonationEvent>>()));

        var donationEffects = new[] { confettiEffect.EffectId, logDonationEffect.EffectId };
        var donationTrigger = new DonationThresholdTrigger(5m);
        triggerRegistry.Register(new TypedTriggerAdapter<DonationEvent>(donationTrigger, EventPlaygroundMessageTypes.Donation, donationEffects, loggerFactory.CreateLogger<TypedTriggerAdapter<DonationEvent>>()));

        var logChatEffect = new LogEffect<ChatMessageEvent>(
            "eventplayground:effect:chat:log",
            loggerFactory.CreateLogger<LogEffect<ChatMessageEvent>>());
        var overlayChatEffect = new OverlayChatEffect();

        effectRegistry.Register(new TypedEffectAdapter<ChatMessageEvent>(overlayChatEffect, services, loggerFactory.CreateLogger<TypedEffectAdapter<ChatMessageEvent>>()));
        effectRegistry.Register(new TypedEffectAdapter<ChatMessageEvent>(logChatEffect, services, loggerFactory.CreateLogger<TypedEffectAdapter<ChatMessageEvent>>()));

        var chatTrigger = new ChatKeywordTrigger("gg", "pog", "hype");
        var chatEffects = new[] { overlayChatEffect.EffectId, logChatEffect.EffectId };
        triggerRegistry.Register(new TypedTriggerAdapter<ChatMessageEvent>(chatTrigger, EventPlaygroundMessageTypes.ChatMessage, chatEffects, loggerFactory.CreateLogger<TypedTriggerAdapter<ChatMessageEvent>>()));
    }

    public override async Task HandleAsync(HttpContext httpContext)
    {
        if (HttpMethods.IsPost(httpContext.Request.Method))
        {
            await HandleManualEmit(httpContext);
            return;
        }

        var payload = new
        {
            bit = Name,
            route = Route,
            registered = _registered,
            messageTypes = new
            {
                donation = EventPlaygroundMessageTypes.Donation.Id,
                chat = EventPlaygroundMessageTypes.ChatMessage.Id
            },
            triggers = new[]
            {
                new { id = "eventplayground:trigger:donation:min", effects = new[]{ "eventplayground:effect:confetti", "eventplayground:effect:donation:log" } },
                new { id = "eventplayground:trigger:chat:keyword", effects = new[]{ "eventplayground:effect:chat:overlay", "eventplayground:effect:chat:log" } }
            },
            simulation = new
            {
                running = _simulationCts != null && !_simulationCts.IsCancellationRequested,
                intervalSeconds = 5
            }
        };

        httpContext.Response.ContentType = "application/json";
        await httpContext.Response.WriteAsync(JsonSerializer.Serialize(payload));
    }

    private async Task HandleManualEmit(HttpContext httpContext)
    {
        var bus = Context?.ServiceProvider?.GetService<IMessageBus>();
        if (bus == null)
        {
            httpContext.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            await httpContext.Response.WriteAsync("Message bus unavailable.");
            return;
        }

        ManualEmitRequest? request;
        try
        {
            request = await JsonSerializer.DeserializeAsync<ManualEmitRequest>(httpContext.Request.Body, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
        }
        catch (JsonException)
        {
            httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await httpContext.Response.WriteAsync("Invalid JSON payload.");
            return;
        }

        if (request == null || string.IsNullOrWhiteSpace(request.Type))
        {
            httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await httpContext.Response.WriteAsync("Field 'type' is required (donation|chat).");
            return;
        }

        var kind = request.Type.Trim().ToLowerInvariant();
        var count = request.Count <= 0 ? 1 : Math.Min(request.Count, 20);
        var metadata = MessageMetadata.Create(source: "eventplayground:manual");

        try
        {
            switch (kind)
            {
                case "donation":
                case "donate":
                    var donation = TryDeserialize<DonationEvent>(request.Payload) ?? DefaultDonation();
                    for (int i = 0; i < count; i++)
                    {
                        bus.Publish(EventPlaygroundMessageTypes.Donation, donation, metadata);
                    }
                    break;
                case "chat":
                case "message":
                    var chat = TryDeserialize<ChatMessageEvent>(request.Payload) ?? DefaultChat();
                    for (int i = 0; i < count; i++)
                    {
                        bus.Publish(EventPlaygroundMessageTypes.ChatMessage, chat, metadata);
                    }
                    break;
                default:
                    httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
                    await httpContext.Response.WriteAsync("Unknown type. Use donation or chat.");
                    return;
            }
        }
        catch (JsonException)
        {
            httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await httpContext.Response.WriteAsync("Payload could not be deserialized.");
            return;
        }

        httpContext.Response.StatusCode = StatusCodes.Status202Accepted;
        await httpContext.Response.WriteAsync("Emitted.");

        static DonationEvent DefaultDonation() => new DonationEvent(5m, "USD", "Demo", "Manual emit", DateTimeOffset.UtcNow);
        static ChatMessageEvent DefaultChat() => new ChatMessageEvent("demo", "hello world", "#demo", DateTimeOffset.UtcNow);
        static T? TryDeserialize<T>(JsonElement element)
        {
            if (element.ValueKind == JsonValueKind.Undefined || element.ValueKind == JsonValueKind.Null)
            {
                return default;
            }

            return element.Deserialize<T>(new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
        }
    }

    private void StartSimulation()
    {
        // Ensure the registry has our producers; they are long-running streams already,
        // but for explicit interval-based spam we can run a lightweight timer.
        _simulationCts?.Cancel();
        _simulationCts = new CancellationTokenSource();
        var token = _simulationCts.Token;
        _ = Task.Run(async () =>
        {
            var bus = Context?.ServiceProvider?.GetService<IMessageBus>();
            if (bus == null)
            {
                return;
            }

            var logger = Context?.ServiceProvider?.GetService<ILogger<EventPlaygroundBit>>() ?? NullLogger<EventPlaygroundBit>.Instance;
            var random = new Random();

            while (!token.IsCancellationRequested)
            {
                try
                {
                    var delay = TimeSpan.FromSeconds(random.Next(3, 9));
                    await Task.Delay(delay, token).ConfigureAwait(false);

                    if (random.NextDouble() < 0.55)
                    {
                        var donation = new DonationEvent(
                            Math.Round((decimal)random.NextDouble() * 20m + 3m, 2),
                            "USD",
                            Pick(random, "Raven", "Nova", "Raynor", "Tychus", "Artanis"),
                            Pick(random, "Let's go!", "Hype!", "GG", "One more!", "Keep pushing"),
                            DateTimeOffset.UtcNow);
                        bus.Publish(EventPlaygroundMessageTypes.Donation, donation, MessageMetadata.Create("eventplayground:sim"));
                        logger.LogInformation("Sim donation {Amount} from {User}", donation.Amount, donation.FromUser);
                    }
                    else
                    {
                        var chat = new ChatMessageEvent(
                            Pick(random, "caster", "observer", "lurker", "chrono", "warp"),
                            Pick(random, "gg", "pog", "what a hold", "clean", "omega"),
                            "#demo",
                            DateTimeOffset.UtcNow);
                        bus.Publish(EventPlaygroundMessageTypes.ChatMessage, chat, MessageMetadata.Create("eventplayground:sim"));
                        logger.LogInformation("Sim chat from {User}: {Text}", chat.User, chat.Text);
                    }
                }
                catch (OperationCanceledException) when (token.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    Context?.Logger.Error(ex, "EventPlayground simulation error");
                }
            }
        }, token);

        static string Pick(Random r, params string[] values) => values[r.Next(values.Length)];
    }

    public override void Dispose()
    {
        base.Dispose();
        _simulationCts?.Cancel();
        _simulationCts?.Dispose();
    }

    private sealed record ManualEmitRequest(string? Type, JsonElement Payload, int Count = 1);
}

public sealed class EventPlaygroundState : IBitState
{
}
