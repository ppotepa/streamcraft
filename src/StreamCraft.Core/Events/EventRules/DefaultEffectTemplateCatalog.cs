using System.Collections.Generic;

namespace StreamCraft.Core.Events.EventRules;

public sealed class DefaultEffectTemplateCatalog : IEffectTemplateCatalog
{
    private static readonly IReadOnlyList<EffectTemplateDescriptor> Templates = BuildTemplates();

    public IReadOnlyList<EffectTemplateDescriptor> GetTemplates() => Templates;

    private static IReadOnlyList<EffectTemplateDescriptor> BuildTemplates()
    {
        return
        [
            Effect("fx_confetti", "Confetti", "Celebration particle burst.", "core.overlay",
                Option("command", "Command", RuleValueType.String, true, "Overlay command", "confetti")),
            Effect("fx_caption", "Caption", "Display caption text.", "core.overlay",
                Option("command", "Command", RuleValueType.String, true, "Overlay command", "caption"),
                Option("text", "Text", RuleValueType.String, true, "Caption text", "Thanks for support!")),
            Effect("fx_sound_ding", "Sound Ding", "Play a short ding.", "core.overlay",
                Option("command", "Command", RuleValueType.String, true, "Overlay command", "sound")),
            Effect("fx_screen_flash", "Screen Flash", "Flash the screen briefly.", "core.overlay",
                Option("command", "Command", RuleValueType.String, true, "Overlay command", "flash")),
            Effect("fx_badge_pop", "Badge Pop", "Show quick badge label.", "core.overlay",
                Option("command", "Command", RuleValueType.String, true, "Overlay command", "badge"),
                Option("label", "Label", RuleValueType.String, true, "Badge text", "NEW")),
            Effect("fx_chat_highlight", "Chat Highlight", "Highlight chat bubble.", "core.overlay",
                Option("command", "Command", RuleValueType.String, true, "Overlay command", "chat-highlight")),
            Effect("fx_lower_third", "Lower-third Banner", "Show lower-third banner.", "core.overlay",
                Option("command", "Command", RuleValueType.String, true, "Overlay command", "lower-third")),
            Effect("fx_goal_pulse", "Goal Progress Pulse", "Pulse donation goal.", "core.overlay",
                Option("command", "Command", RuleValueType.String, true, "Overlay command", "goal-pulse")),
            Effect("fx_countdown", "Countdown Overlay", "Display short countdown.", "core.overlay",
                Option("command", "Command", RuleValueType.String, true, "Overlay command", "countdown")),
            Effect("fx_emoji_burst", "Emoji Burst", "Emit emoji particles.", "core.overlay",
                Option("command", "Command", RuleValueType.String, true, "Overlay command", "emoji-burst")),
            Effect("fx_hearts_rain", "Hearts Rain", "Heart particles rain effect.", "core.overlay",
                Option("command", "Command", RuleValueType.String, true, "Overlay command", "hearts-rain")),
            Effect("fx_glow_aura", "Glow Aura", "Soft glow around component.", "core.overlay",
                Option("command", "Command", RuleValueType.String, true, "Overlay command", "glow-aura")),
            Effect("fx_shake_screen", "Shake Screen", "Small camera shake effect.", "core.overlay",
                Option("command", "Command", RuleValueType.String, true, "Overlay command", "shake")),
            Effect("fx_toast", "Toast Notification", "Show toast notification.", "core.overlay",
                Option("command", "Command", RuleValueType.String, true, "Overlay command", "toast"),
                Option("text", "Text", RuleValueType.String, true, "Toast text", "Action triggered")),
            Effect("fx_log_message", "Log Message", "Write trigger context to logs.", "core.logging",
                Option("message", "Message", RuleValueType.String, false, "Log message", "Trigger fired"))
        ];
    }

    private static EffectTemplateDescriptor Effect(
        string id,
        string name,
        string description,
        string effectFactoryTypeName,
        params EffectOptionDescriptor[] options)
    {
        return new EffectTemplateDescriptor(
            new EffectTemplateId(id),
            name,
            description,
            effectFactoryTypeName,
            options);
    }

    private static EffectOptionDescriptor Option(
        string key,
        string label,
        RuleValueType valueType,
        bool required,
        string? description,
        object? defaultValue)
    {
        return new EffectOptionDescriptor(
            key,
            label,
            valueType,
            required,
            description,
            defaultValue);
    }
}

