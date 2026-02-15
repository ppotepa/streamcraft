using System.Collections.Generic;

namespace StreamCraft.Core.Events.EventRules;

public sealed class DefaultEventSchemaProvider : IEventSchemaProvider
{
    private static readonly IReadOnlyList<EventTypeDescriptor> EventTypes = BuildEventTypes();
    private static readonly IReadOnlyList<EventSourceDescriptor> Sources = BuildSources();

    public IReadOnlyList<EventSourceDescriptor> GetSources() => Sources;

    public IReadOnlyList<EventTypeDescriptor> GetEventTypes() => EventTypes;

    private static IReadOnlyList<EventSourceDescriptor> BuildSources()
    {
        return
        [
            new EventSourceDescriptor(
                new EventSourceTypeId("chat"),
                "Chat Sources",
                "Chat messages, commands, moderation, and chatter metadata.",
                [
                    new EventTypeId("eventplayground.chat.message"),
                    new EventTypeId("mocktwitch.chat"),
                    new EventTypeId("mocktwitch.moderation")
                ]),
            new EventSourceDescriptor(
                new EventSourceTypeId("donation"),
                "Donation Sources",
                "Donation, cheer, and goal progress signals.",
                [
                    new EventTypeId("eventplayground.donation.received"),
                    new EventTypeId("mocktwitch.donation"),
                    new EventTypeId("mocktwitch.cheer"),
                    new EventTypeId("mocktwitch.goal")
                ]),
            new EventSourceDescriptor(
                new EventSourceTypeId("stream"),
                "Stream Sources",
                "Stream state, follows, raids, and subscription events.",
                [
                    new EventTypeId("mocktwitch.stream"),
                    new EventTypeId("mocktwitch.followers"),
                    new EventTypeId("mocktwitch.raid"),
                    new EventTypeId("mocktwitch.subscription")
                ])
        ];
    }

    private static IReadOnlyList<EventTypeDescriptor> BuildEventTypes()
    {
        return
        [
            new EventTypeDescriptor(
                new EventTypeId("eventplayground.chat.message"),
                new EventSourceTypeId("chat"),
                "EventPlayground",
                "ChatMessage",
                "Chat Message",
                "Synthetic chat message payload from EventPlayground bit.",
                [
                    TextField("text", "Text"),
                    TextField("user", "User"),
                    TextField("channel", "Channel")
                ]),
            new EventTypeDescriptor(
                new EventTypeId("eventplayground.donation.received"),
                new EventSourceTypeId("donation"),
                "EventPlayground",
                "Donation",
                "Donation Received",
                "Synthetic donation payload from EventPlayground bit.",
                [
                    NumberField("amount", "Amount"),
                    TextField("fromUser", "From User"),
                    TextField("currency", "Currency"),
                    TextField("message", "Message")
                ]),
            new EventTypeDescriptor(
                new EventTypeId("mocktwitch.chat"),
                new EventSourceTypeId("chat"),
                "mock.twitch",
                "chat",
                "Twitch Chat",
                "Mock Twitch chat scenario payload.",
                [
                    TextField("eventType", "Event Type", "eventType"),
                    TextField("data.message", "Message", "data.message"),
                    TextField("data.viewer.name", "Viewer Name", "data.viewer.name"),
                    TextField("data.viewer.role", "Viewer Role", "data.viewer.role")
                ]),
            new EventTypeDescriptor(
                new EventTypeId("mocktwitch.moderation"),
                new EventSourceTypeId("chat"),
                "mock.twitch",
                "moderation",
                "Moderation Action",
                "Timeout/ban/delete moderation events.",
                [
                    TextField("data.action", "Action", "data.action"),
                    TextField("data.target.name", "Target User", "data.target.name"),
                    NumberField("data.durationSeconds", "Duration Seconds", "data.durationSeconds")
                ]),
            new EventTypeDescriptor(
                new EventTypeId("mocktwitch.donation"),
                new EventSourceTypeId("donation"),
                "mock.twitch",
                "donation",
                "Twitch Donation",
                "Mock donation payload.",
                [
                    NumberField("data.amount", "Amount", "data.amount"),
                    TextField("data.currency", "Currency", "data.currency"),
                    TextField("data.message", "Message", "data.message"),
                    TextField("data.viewer.name", "Viewer Name", "data.viewer.name")
                ]),
            new EventTypeDescriptor(
                new EventTypeId("mocktwitch.cheer"),
                new EventSourceTypeId("donation"),
                "mock.twitch",
                "cheer",
                "Cheer",
                "Mock cheer/bits payload.",
                [
                    NumberField("data.bits", "Bits", "data.bits"),
                    TextField("data.viewer.name", "Viewer Name", "data.viewer.name")
                ]),
            new EventTypeDescriptor(
                new EventTypeId("mocktwitch.goal"),
                new EventSourceTypeId("donation"),
                "mock.twitch",
                "goal",
                "Donation Goal",
                "Goal progress and completion events.",
                [
                    NumberField("data.current", "Current", "data.current"),
                    NumberField("data.target", "Target", "data.target"),
                    BoolField("data.completed", "Completed", "data.completed")
                ]),
            new EventTypeDescriptor(
                new EventTypeId("mocktwitch.stream"),
                new EventSourceTypeId("stream"),
                "mock.twitch",
                "stream",
                "Stream State",
                "Stream started/ended/meta changes.",
                [
                    TextField("eventType", "Event Type", "eventType"),
                    TextField("data.title", "Title", "data.title"),
                    TextField("data.category", "Category", "data.category")
                ]),
            new EventTypeDescriptor(
                new EventTypeId("mocktwitch.followers"),
                new EventSourceTypeId("stream"),
                "mock.twitch",
                "followers",
                "Followers",
                "Follower and milestone events.",
                [
                    NumberField("data.milestone", "Milestone", "data.milestone"),
                    TextField("data.viewer.name", "Viewer Name", "data.viewer.name")
                ]),
            new EventTypeDescriptor(
                new EventTypeId("mocktwitch.raid"),
                new EventSourceTypeId("stream"),
                "mock.twitch",
                "raid",
                "Raid",
                "Incoming/outgoing raid events.",
                [
                    NumberField("data.viewers", "Viewer Count", "data.viewers"),
                    TextField("data.sourceChannel.name", "Source Channel", "data.sourceChannel.name"),
                    TextField("data.targetChannel.name", "Target Channel", "data.targetChannel.name")
                ]),
            new EventTypeDescriptor(
                new EventTypeId("mocktwitch.subscription"),
                new EventSourceTypeId("stream"),
                "mock.twitch",
                "subscription",
                "Subscription",
                "Subscription and gift subscription events.",
                [
                    TextField("data.tier", "Tier", "data.tier"),
                    BoolField("data.isGift", "Is Gift", "data.isGift"),
                    NumberField("data.giftCount", "Gift Count", "data.giftCount")
                ])
        ];
    }

    private static EventFieldDescriptor TextField(string id, string name, string? path = null)
        => new(
            new EventFieldId(id),
            name,
            RuleValueType.String,
            path ?? id,
            true,
            [RuleOperator.Equals, RuleOperator.NotEquals, RuleOperator.Contains, RuleOperator.StartsWith, RuleOperator.EndsWith, RuleOperator.IsEmpty, RuleOperator.IsNotEmpty]);

    private static EventFieldDescriptor NumberField(string id, string name, string? path = null)
        => new(
            new EventFieldId(id),
            name,
            RuleValueType.Number,
            path ?? id,
            true,
            [RuleOperator.Equals, RuleOperator.NotEquals, RuleOperator.GreaterThan, RuleOperator.GreaterOrEqual, RuleOperator.LessThan, RuleOperator.LessOrEqual]);

    private static EventFieldDescriptor BoolField(string id, string name, string? path = null)
        => new(
            new EventFieldId(id),
            name,
            RuleValueType.Boolean,
            path ?? id,
            true,
            [RuleOperator.IsTrue, RuleOperator.IsFalse, RuleOperator.Equals, RuleOperator.NotEquals]);
}

