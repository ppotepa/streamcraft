using System;
using System.Collections.Generic;
using System.Linq;
using StreamCraft.Core.Messaging;

namespace StreamCraft.Bits.StreamApiMock;

public interface IStreamApiMockScenarioRegistry
{
    IReadOnlyList<StreamApiMockScenario> List();
    StreamApiMockScenario? Get(string id);
}

public sealed record StreamApiMockScenario(
    string Id,
    string Name,
    string Category,
    string Description,
    MessageType MessageType,
    Func<StreamApiMockScenarioContext, Dictionary<string, object?>> PayloadFactory);

public sealed class StreamApiMockScenarioContext
{
    public required StreamApiMockDataset Dataset { get; init; }
    public required Random Random { get; init; }
    public DateTime TimestampUtc { get; init; }
}

public sealed class StreamApiMockScenarioRegistry : IStreamApiMockScenarioRegistry
{
    private readonly IReadOnlyList<StreamApiMockScenario> _scenarios;
    private readonly IReadOnlyDictionary<string, StreamApiMockScenario> _lookup;

    public StreamApiMockScenarioRegistry()
    {
        _scenarios = BuildScenarios();
        _lookup = _scenarios.ToDictionary(s => s.Id, StringComparer.OrdinalIgnoreCase);
    }

    public IReadOnlyList<StreamApiMockScenario> List() => _scenarios;

    public StreamApiMockScenario? Get(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return null;
        }

        return _lookup.TryGetValue(id, out var scenario) ? scenario : null;
    }

    private static IReadOnlyList<StreamApiMockScenario> BuildScenarios()
    {
        static StreamApiMockScenario Scenario(
            string id,
            string name,
            string category,
            string description,
            string messageName,
            Func<StreamApiMockScenarioContext, Dictionary<string, object?>> factory)
            => new(
                id,
                name,
                category,
                description,
                MessageType.Create("mock.twitch", messageName),
                factory);

        var list = new List<StreamApiMockScenario>
        {
            Scenario("subscription.tier1", "Tier 1 Subscription", "Monetization", "Viewer purchases a tier 1 subscription.", "subscription", ctx => SubscriptionPayload(ctx, "Tier1")),
            Scenario("subscription.tier3", "Tier 3 Subscription", "Monetization", "Viewer upgrades to tier 3 subscription.", "subscription", ctx => SubscriptionPayload(ctx, "Tier3")),
            Scenario("subscription.gift.5", "Gift 5 Subs", "Monetization", "Viewer gifts five subs to random viewers.", "subscription", ctx => SubscriptionPayload(ctx, "Tier1", giftCount: 5)),
            Scenario("subscription.gift.20", "Gift 20 Subs", "Monetization", "Viewer gifts twenty subs to hand-picked viewers.", "subscription", ctx => SubscriptionPayload(ctx, "Tier2", giftCount: 20)),
            Scenario("chat.first-time", "First Time Chatter", "Engagement", "First-time chatter sends a welcome message.", "chat", FirstTimeChatterPayload),
            Scenario("chat.moderation.delete", "Message Deleted", "Moderation", "Moderator deletes a problematic message.", "moderation", ctx => ModerationPayload(ctx, "delete")),
            Scenario("chat.moderation.timeout", "Timeout", "Moderation", "Moderator times out a viewer for 30 seconds.", "moderation", ctx => ModerationPayload(ctx, "timeout")),
            Scenario("chat.moderation.ban", "Ban", "Moderation", "Moderator permanently bans a viewer.", "moderation", ctx => ModerationPayload(ctx, "ban")),
            Scenario("chat.vip.grant", "VIP Granted", "Moderation", "Streamer grants VIP badge to a viewer.", "vip", VipPayload),
            Scenario("hype.train.start", "Hype Train Start", "Events", "Hype train kicks off at level 1.", "hype", ctx => HypeTrainPayload(ctx, 1)),
            Scenario("hype.train.level3", "Hype Train Level 3", "Events", "Hype train reaches level 3 milestone.", "hype", ctx => HypeTrainPayload(ctx, 3)),
            Scenario("cheer.bits.100", "Cheer 100", "Monetization", "Viewer cheers 100 bits with message.", "cheer", ctx => CheerPayload(ctx, 100)),
            Scenario("cheer.bits.5000", "Cheer 5000", "Monetization", "Viewer drops a 5000 bit cheer.", "cheer", ctx => CheerPayload(ctx, 5000)),
            Scenario("channelpoints.highlight", "Highlight Message", "Channel Points", "Viewer redeems highlight message reward.", "channelpoints", ctx => ChannelPointPayload(ctx, "Highlight Message")),
            Scenario("channelpoints.sound", "Sound Alert", "Channel Points", "Viewer redeems custom sound alert.", "channelpoints", ctx => ChannelPointPayload(ctx, "Sound Alert")),
            Scenario("channelpoints.overlay", "Overlay Animation", "Channel Points", "Viewer triggers overlay animation reward.", "channelpoints", ctx => ChannelPointPayload(ctx, "Overlay Animation")),
            Scenario("prediction.created", "Prediction Created", "Engagement", "Streamer starts a prediction with two outcomes.", "prediction", ctx => PredictionPayload(ctx, "created")),
            Scenario("prediction.locked", "Prediction Locked", "Engagement", "Prediction betting window closes.", "prediction", ctx => PredictionPayload(ctx, "locked")),
            Scenario("prediction.resolved", "Prediction Resolved", "Engagement", "Prediction resolved with outcome A.", "prediction", ctx => PredictionPayload(ctx, "resolved")),
            Scenario("poll.created", "Poll Created", "Engagement", "Streamer launches a poll with three options.", "poll", ctx => PollPayload(ctx, "created")),
            Scenario("poll.progress", "Poll Updated", "Engagement", "Poll receives mid-way update.", "poll", ctx => PollPayload(ctx, "progress")),
            Scenario("poll.completed", "Poll Completed", "Engagement", "Poll is completed with winner.", "poll", ctx => PollPayload(ctx, "completed")),
            Scenario("followers.milestone", "Follower Milestone", "Channel State", "Channel reaches follower milestone.", "followers", ctx => FollowerPayload(ctx, true)),
            Scenario("followers.new", "New Follower", "Channel State", "Viewer follows during stream.", "followers", ctx => FollowerPayload(ctx, false)),
            Scenario("raid.received", "Raid Received", "Events", "Channel receives incoming raid.", "raid", ctx => RaidPayload(ctx, incoming: true)),
            Scenario("raid.sent", "Raid Sent", "Events", "Channel raids another streamer.", "raid", ctx => RaidPayload(ctx, incoming: false)),
            Scenario("stream.started", "Stream Started", "Channel State", "Broadcast goes live.", "stream", ctx => StreamStatePayload(ctx, "started")),
            Scenario("stream.ended", "Stream Ended", "Channel State", "Broadcast ends.", "stream", ctx => StreamStatePayload(ctx, "ended")),
            Scenario("stream.title.changed", "Title Changed", "Channel State", "Stream title updated mid-show.", "stream", ctx => StreamMetaPayload(ctx, "title")),
            Scenario("stream.category.changed", "Category Changed", "Channel State", "Game/category switched.", "stream", ctx => StreamMetaPayload(ctx, "category")),
            Scenario("chat.slowmode.on", "Slow Mode On", "Moderation", "Slow mode toggled on.", "chatsettings", ctx => ChatSettingPayload(ctx, "slowmode", true)),
            Scenario("chat.subonly.on", "Sub-only On", "Moderation", "Sub-only chat enabled.", "chatsettings", ctx => ChatSettingPayload(ctx, "subonly", true)),
            Scenario("chat.emoteonly.on", "Emote-only On", "Moderation", "Emote-only chat enabled.", "chatsettings", ctx => ChatSettingPayload(ctx, "emoteonly", true)),
            Scenario("chat.emoteonly.off", "Emote-only Off", "Moderation", "Emote-only chat disabled.", "chatsettings", ctx => ChatSettingPayload(ctx, "emoteonly", false)),
            Scenario("chat.cleared", "Chat Cleared", "Moderation", "Moderator clears entire chat.", "moderation", ChatClearedPayload),
            Scenario("ads.commercial.start", "Commercial Start", "Monetization", "30-second ad break triggered.", "ads", ctx => AdPayload(ctx, "start")),
            Scenario("ads.complete", "Ad Completed", "Monetization", "Ad break completion notice.", "ads", ctx => AdPayload(ctx, "complete")),
            Scenario("goals.progress", "Goal Progress", "Goals", "Donation goal progress update.", "goal", ctx => GoalPayload(ctx, false)),
            Scenario("goals.completed", "Goal Completed", "Goals", "Donation goal completed.", "goal", ctx => GoalPayload(ctx, true)),
            Scenario("giveaway.started", "Giveaway Started", "Engagement", "Giveaway opens for entries.", "giveaway", ctx => GiveawayPayload(ctx, "started")),
            Scenario("giveaway.winner", "Giveaway Winner", "Engagement", "Giveaway picks a winner.", "giveaway", ctx => GiveawayPayload(ctx, "winner")),
            Scenario("extension.highscore", "Extension High Score", "Extensions", "Mini-game posts new high score.", "extension", ExtensionPayload),
            Scenario("leaderboard.bits.reset", "Bits Leaderboard Reset", "Monetization", "Weekly bits leaderboard resets.", "leaderboard", LeaderboardPayload),
            Scenario("clips.created", "Clip Created", "Content", "Viewer captures a clip.", "clips", ClipPayload),
            Scenario("whisper.from.vip", "VIP Whisper", "Engagement", "VIP sends a whisper to streamer.", "whisper", VipWhisperPayload),
            Scenario("broadcast.warning.droppedframes", "Dropped Frames Warning", "Diagnostics", "Broadcast warns about dropped frames.", "diagnostics", ctx => DiagnosticPayload(ctx, "dropped_frames")),
            Scenario("stream.reconnect", "Stream Reconnect", "Diagnostics", "Stream disconnects and reconnects.", "diagnostics", ctx => DiagnosticPayload(ctx, "reconnect")),
            Scenario("api.quota.warning", "API Quota Warning", "Diagnostics", "Twitch API quota nearing limit.", "diagnostics", ctx => DiagnosticPayload(ctx, "api_quota")),
            Scenario("webhook.delivery.failed", "Webhook Delivery Failure", "Diagnostics", "Webhook delivery failure event.", "diagnostics", ctx => DiagnosticPayload(ctx, "webhook_failure")),
            Scenario("donation.test", "Test Donation", "Monetization", "Synthetic donation for testing overlays.", "donation", ctx => DonationPayload(ctx))
        };

        return list;
    }

    private static Dictionary<string, object?> SubscriptionPayload(StreamApiMockScenarioContext ctx, string tier, int giftCount = 0)
    {
        var payload = BasePayload(ctx, "subscription");
        payload["data"] = new Dictionary<string, object?>
        {
            ["tier"] = tier,
            ["isGift"] = giftCount > 0,
            ["giftCount"] = giftCount,
            ["months"] = ctx.Random.Next(1, 48),
            ["viewer"] = User(ctx),
            ["message"] = ctx.Dataset.NextChatMessage(ctx.Random),
            ["amount"] = ctx.Dataset.NextAmount(ctx.Random, 4.99m, 24.99m)
        };
        return payload;
    }

    private static Dictionary<string, object?> FirstTimeChatterPayload(StreamApiMockScenarioContext ctx)
    {
        var payload = BasePayload(ctx, "chat_first_time");
        payload["data"] = new Dictionary<string, object?>
        {
            ["viewer"] = User(ctx),
            ["message"] = ctx.Dataset.NextChatMessage(ctx.Random),
            ["badges"] = new[] { "first-time" }
        };
        return payload;
    }

    private static Dictionary<string, object?> ModerationPayload(StreamApiMockScenarioContext ctx, string action)
    {
        var payload = BasePayload(ctx, "moderation");
        payload["data"] = new Dictionary<string, object?>
        {
            ["action"] = action,
            ["target"] = User(ctx),
            ["moderator"] = User(ctx, role: "mod"),
            ["reason"] = ctx.Dataset.NextModerationReason(ctx.Random),
            ["durationSeconds"] = action == "timeout" ? 30 : 0
        };
        return payload;
    }

    private static Dictionary<string, object?> VipPayload(StreamApiMockScenarioContext ctx)
    {
        var payload = BasePayload(ctx, "vip_grant");
        payload["data"] = new Dictionary<string, object?>
        {
            ["viewer"] = User(ctx),
            ["grantedBy"] = User(ctx, role: "broadcaster")
        };
        return payload;
    }

    private static Dictionary<string, object?> HypeTrainPayload(StreamApiMockScenarioContext ctx, int level)
    {
        var payload = BasePayload(ctx, "hype_train");
        payload["data"] = new Dictionary<string, object?>
        {
            ["level"] = level,
            ["progress"] = ctx.Random.Next(10, 100),
            ["contributors"] = Enumerable.Range(0, Math.Max(1, level))
                .Select(_ => new Dictionary<string, object?>
                {
                    ["viewer"] = User(ctx),
                    ["type"] = ctx.Random.Next(0, 2) == 0 ? "bits" : "subs",
                    ["amount"] = ctx.Random.Next(1, 5000)
                })
                .ToArray()
        };
        return payload;
    }

    private static Dictionary<string, object?> CheerPayload(StreamApiMockScenarioContext ctx, int amount)
    {
        var payload = BasePayload(ctx, "cheer");
        payload["data"] = new Dictionary<string, object?>
        {
            ["viewer"] = User(ctx),
            ["bits"] = amount,
            ["message"] = ctx.Dataset.NextChatMessage(ctx.Random)
        };
        return payload;
    }

    private static Dictionary<string, object?> ChannelPointPayload(StreamApiMockScenarioContext ctx, string reward)
    {
        var payload = BasePayload(ctx, "channel_points");
        payload["data"] = new Dictionary<string, object?>
        {
            ["reward"] = reward,
            ["viewer"] = User(ctx),
            ["cost"] = ctx.Random.Next(500, 20000),
            ["notes"] = ctx.Dataset.NextChatMessage(ctx.Random)
        };
        return payload;
    }

    private static Dictionary<string, object?> PredictionPayload(StreamApiMockScenarioContext ctx, string phase)
    {
        var payload = BasePayload(ctx, "prediction");
        payload["data"] = new Dictionary<string, object?>
        {
            ["phase"] = phase,
            ["outcomes"] = new[] { "Blue Team", "Red Team" },
            ["totalPoints"] = ctx.Random.Next(50_000, 400_000)
        };
        return payload;
    }

    private static Dictionary<string, object?> PollPayload(StreamApiMockScenarioContext ctx, string phase)
    {
        var payload = BasePayload(ctx, "poll");
        payload["data"] = new Dictionary<string, object?>
        {
            ["phase"] = phase,
            ["options"] = new[] { "Keep Playing", "Switch Game", "BRB" },
            ["votes"] = Enumerable.Range(0, 3).Select(_ => ctx.Random.Next(0, 500)).ToArray()
        };
        return payload;
    }

    private static Dictionary<string, object?> FollowerPayload(StreamApiMockScenarioContext ctx, bool milestone)
    {
        var payload = BasePayload(ctx, milestone ? "follower_milestone" : "new_follower");
        payload["data"] = milestone
            ? new Dictionary<string, object?>
            {
                ["milestone"] = ctx.Random.Next(1, 50) * 1000,
                ["message"] = "Follower milestone reached!"
            }
            : new Dictionary<string, object?> { ["viewer"] = User(ctx) };
        return payload;
    }

    private static Dictionary<string, object?> RaidPayload(StreamApiMockScenarioContext ctx, bool incoming)
    {
        var payload = BasePayload(ctx, incoming ? "raid_received" : "raid_sent");
        payload["data"] = new Dictionary<string, object?>
        {
            ["sourceChannel"] = incoming ? ExternalChannel(ctx) : CurrentChannel(ctx),
            ["targetChannel"] = incoming ? CurrentChannel(ctx) : ExternalChannel(ctx),
            ["viewers"] = ctx.Dataset.NextViewerCount(ctx.Random, 10, 1500)
        };
        return payload;
    }

    private static Dictionary<string, object?> StreamStatePayload(StreamApiMockScenarioContext ctx, string phase)
    {
        var payload = BasePayload(ctx, $"stream_{phase}");
        payload["data"] = new Dictionary<string, object?>
        {
            ["title"] = ctx.Dataset.NextChatMessage(ctx.Random),
            ["category"] = ctx.Dataset.NextGame(ctx.Random)
        };
        return payload;
    }

    private static Dictionary<string, object?> StreamMetaPayload(StreamApiMockScenarioContext ctx, string meta)
    {
        var payload = BasePayload(ctx, $"stream_{meta}_changed");
        payload["data"] = meta == "title"
            ? new Dictionary<string, object?> { ["title"] = ctx.Dataset.NextChatMessage(ctx.Random) }
            : new Dictionary<string, object?> { ["category"] = ctx.Dataset.NextGame(ctx.Random) };
        return payload;
    }

    private static Dictionary<string, object?> ChatSettingPayload(StreamApiMockScenarioContext ctx, string setting, bool enabled)
    {
        var payload = BasePayload(ctx, "chat_setting");
        payload["data"] = new Dictionary<string, object?>
        {
            ["setting"] = setting,
            ["enabled"] = enabled,
            ["moderator"] = User(ctx, role: "mod")
        };
        return payload;
    }

    private static Dictionary<string, object?> ChatClearedPayload(StreamApiMockScenarioContext ctx)
    {
        var payload = BasePayload(ctx, "chat_clear");
        payload["data"] = new Dictionary<string, object?>
        {
            ["moderator"] = User(ctx, role: "mod"),
            ["reason"] = ctx.Dataset.NextModerationReason(ctx.Random)
        };
        return payload;
    }

    private static Dictionary<string, object?> AdPayload(StreamApiMockScenarioContext ctx, string phase)
    {
        var payload = BasePayload(ctx, "ad_break");
        payload["data"] = new Dictionary<string, object?>
        {
            ["phase"] = phase,
            ["durationSeconds"] = phase == "start" ? 30 : 0,
            ["initiatedBy"] = User(ctx, role: "broadcaster")
        };
        return payload;
    }

    private static Dictionary<string, object?> GoalPayload(StreamApiMockScenarioContext ctx, bool completed)
    {
        var payload = BasePayload(ctx, "goal_update");
        payload["data"] = new Dictionary<string, object?>
        {
            ["type"] = "donation",
            ["target"] = 500,
            ["current"] = completed ? 500 : ctx.Random.Next(50, 450),
            ["completed"] = completed
        };
        return payload;
    }

    private static Dictionary<string, object?> GiveawayPayload(StreamApiMockScenarioContext ctx, string phase)
    {
        var payload = BasePayload(ctx, "giveaway");
        payload["data"] = new Dictionary<string, object?>
        {
            ["phase"] = phase,
            ["entries"] = ctx.Random.Next(25, 500),
            ["winner"] = phase == "winner" ? User(ctx) : null
        };
        return payload;
    }

    private static Dictionary<string, object?> ExtensionPayload(StreamApiMockScenarioContext ctx)
    {
        var payload = BasePayload(ctx, "extension_event");
        payload["data"] = new Dictionary<string, object?>
        {
            ["extensionId"] = "contoso-mini-game",
            ["viewer"] = User(ctx),
            ["score"] = ctx.Random.Next(1000, 50000)
        };
        return payload;
    }

    private static Dictionary<string, object?> LeaderboardPayload(StreamApiMockScenarioContext ctx)
    {
        var payload = BasePayload(ctx, "leaderboard_reset");
        payload["data"] = new Dictionary<string, object?>
        {
            ["type"] = "bits",
            ["period"] = "weekly",
            ["top"] = Enumerable.Range(0, 3)
                .Select(rank => new Dictionary<string, object?>
                {
                    ["rank"] = rank + 1,
                    ["viewer"] = User(ctx),
                    ["amount"] = ctx.Random.Next(1000, 10000)
                })
                .ToArray()
        };
        return payload;
    }

    private static Dictionary<string, object?> ClipPayload(StreamApiMockScenarioContext ctx)
    {
        var payload = BasePayload(ctx, "clip_created");
        payload["data"] = new Dictionary<string, object?>
        {
            ["viewer"] = User(ctx),
            ["url"] = $"https://clips.twitch.tv/{Guid.NewGuid():N}",
            ["title"] = ctx.Dataset.NextChatMessage(ctx.Random)
        };
        return payload;
    }

    private static Dictionary<string, object?> VipWhisperPayload(StreamApiMockScenarioContext ctx)
    {
        var payload = BasePayload(ctx, "vip_whisper");
        payload["data"] = new Dictionary<string, object?>
        {
            ["viewer"] = User(ctx, role: "vip"),
            ["message"] = ctx.Dataset.NextChatMessage(ctx.Random)
        };
        return payload;
    }

    private static Dictionary<string, object?> DiagnosticPayload(StreamApiMockScenarioContext ctx, string code)
    {
        var payload = BasePayload(ctx, "diagnostic");
        payload["data"] = new Dictionary<string, object?>
        {
            ["code"] = code,
            ["severity"] = code.Contains("warning", StringComparison.OrdinalIgnoreCase) ? "warning" : "info",
            ["details"] = ctx.Dataset.NextChatMessage(ctx.Random)
        };
        return payload;
    }

    private static Dictionary<string, object?> DonationPayload(StreamApiMockScenarioContext ctx)
    {
        var payload = BasePayload(ctx, "donation");
        payload["data"] = new Dictionary<string, object?>
        {
            ["viewer"] = User(ctx),
            ["amount"] = ctx.Dataset.NextAmount(ctx.Random, 1, 250),
            ["currency"] = "USD",
            ["message"] = ctx.Dataset.NextChatMessage(ctx.Random)
        };
        return payload;
    }

    private static Dictionary<string, object?> BasePayload(StreamApiMockScenarioContext ctx, string eventType)
    {
        return new Dictionary<string, object?>
        {
            ["eventId"] = Guid.NewGuid().ToString("N"),
            ["eventType"] = eventType,
            ["timestampUtc"] = ctx.TimestampUtc,
            ["channel"] = CurrentChannel(ctx)
        };
    }

    private static Dictionary<string, object?> CurrentChannel(StreamApiMockScenarioContext ctx)
    {
        return new Dictionary<string, object?>
        {
            ["id"] = ctx.Dataset.NextChannelId(ctx.Random),
            ["name"] = ctx.Dataset.NextChannel(ctx.Random)
        };
    }

    private static Dictionary<string, object?> ExternalChannel(StreamApiMockScenarioContext ctx)
    {
        return new Dictionary<string, object?>
        {
            ["id"] = ctx.Dataset.NextChannelId(ctx.Random),
            ["name"] = ctx.Dataset.NextChannel(ctx.Random) + "_Raiders"
        };
    }

    private static Dictionary<string, object?> User(StreamApiMockScenarioContext ctx, string? role = null)
    {
        return new Dictionary<string, object?>
        {
            ["id"] = ctx.Dataset.NextUserId(ctx.Random),
            ["name"] = ctx.Dataset.NextUsername(ctx.Random),
            ["role"] = role ?? "viewer"
        };
    }
}
