namespace StreamCraft.Core.Events;

public sealed class EventSystemOptions
{
    public bool Enabled { get; set; } = false;
    public int MaxConcurrentEffects { get; set; } = 4;
    public int EffectTimeoutSeconds { get; set; } = 30;
    public int EffectRetryCount { get; set; } = 0;
    public int EffectRetryBackoffMilliseconds { get; set; } = 1000;
    public int MaxQueuedEffects { get; set; } = 256;
    public int MaxTriggerExecutionsPerMinute { get; set; } = 0;
    public bool DiagnosticsEnabled { get; set; } = true;
}
