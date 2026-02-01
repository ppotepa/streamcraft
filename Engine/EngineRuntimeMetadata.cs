namespace Engine;

public sealed class EngineRuntimeMetadata
{
    public EngineRuntimeMetadata(DateTime startTimeUtc)
    {
        StartTimeUtc = startTimeUtc;
    }

    public DateTime StartTimeUtc { get; }
}
