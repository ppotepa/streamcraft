using System.Collections.Generic;

namespace StreamCraft.Core.Events.EventRules;

public sealed class DefaultTriggerTemplateCatalog : ITriggerTemplateCatalog
{
    private static readonly IReadOnlyList<TriggerTemplateDescriptor> Templates = BuildTemplates();

    public IReadOnlyList<TriggerTemplateDescriptor> GetTemplates() => Templates;

    private static IReadOnlyList<TriggerTemplateDescriptor> BuildTemplates()
    {
        return
        [
            Template("chat_message_received", "Chat Message Received", "Fires on every incoming chat message.", "eventplayground.chat.message", "core.template"),
            Template("chat_message_contains_word", "Chat Message Contains Word", "Fires when message text contains a keyword.", "eventplayground.chat.message", "core.template",
                Condition("text", RuleOperator.Contains, true, "keyword")),
            Template("chat_command_used", "Chat Command Used", "Fires when message starts with command prefix.", "eventplayground.chat.message", "core.template",
                Condition("text", RuleOperator.StartsWith, true, "!help")),
            Template("first_message_from_user", "First Message From User", "Fires for first-time chatter events.", "mocktwitch.chat", "core.template",
                Condition("eventType", RuleOperator.Equals, true, "chat_first_time")),
            Template("moderator_message_received", "Moderator Message Received", "Fires when moderator action appears.", "mocktwitch.moderation", "core.template",
                Condition("data.action", RuleOperator.IsNotEmpty, false, null)),
            Template("subscriber_message_received", "Subscriber Message Received", "Fires for subscription-related events.", "mocktwitch.subscription", "core.template"),
            Template("follow_received", "Follow Received", "Fires on new follower signal.", "mocktwitch.followers", "core.template"),
            Template("new_subscriber", "New Subscriber", "Fires for new or renewed subscription.", "mocktwitch.subscription", "core.template"),
            Template("gift_sub_received", "Gift Sub Received", "Fires only for gifted subscriptions.", "mocktwitch.subscription", "core.template",
                Condition("data.isGift", RuleOperator.IsTrue, true, "true")),
            Template("cheer_above_amount", "Cheer Above Amount", "Fires when bits exceed threshold.", "mocktwitch.cheer", "core.template",
                Condition("data.bits", RuleOperator.GreaterOrEqual, true, "100")),
            Template("donation_received", "Donation Received", "Fires on donation event.", "eventplayground.donation.received", "core.template"),
            Template("donation_above_amount", "Donation Above Amount", "Fires when donation amount exceeds threshold.", "eventplayground.donation.received", "core.template",
                Condition("amount", RuleOperator.GreaterOrEqual, true, "10")),
            Template("donation_goal_reached", "Donation Goal Reached", "Fires when goal is completed.", "mocktwitch.goal", "core.template",
                Condition("data.completed", RuleOperator.IsTrue, true, "true")),
            Template("raid_above_viewers", "Raid Above Viewer Count", "Fires when raid viewers exceed threshold.", "mocktwitch.raid", "core.template",
                Condition("data.viewers", RuleOperator.GreaterOrEqual, true, "50")),
            Template("stream_started", "Stream Started", "Fires when stream starts.", "mocktwitch.stream", "core.template",
                Condition("eventType", RuleOperator.Equals, true, "stream_started"))
        ];
    }

    private static TriggerTemplateDescriptor Template(
        string id,
        string name,
        string description,
        string eventTypeId,
        string triggerFactoryTypeName,
        params TriggerConditionTemplate[] conditions)
    {
        return new TriggerTemplateDescriptor(
            new TriggerTemplateId(id),
            name,
            description,
            new EventTypeId(eventTypeId),
            triggerFactoryTypeName,
            conditions);
    }

    private static TriggerConditionTemplate Condition(
        string fieldId,
        RuleOperator op,
        bool required,
        string? placeholder)
    {
        return new TriggerConditionTemplate(
            new EventFieldId(fieldId),
            op,
            required,
            placeholder);
    }
}

