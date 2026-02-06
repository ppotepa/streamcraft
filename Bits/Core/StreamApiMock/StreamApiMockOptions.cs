using System;

namespace StreamCraft.Bits.StreamApiMock;

public sealed class StreamApiMockOptions
{
    public bool Enabled { get; set; } = StreamApiMockDefaults.IsDevelopmentEnvironment();
    public string SourceName { get; set; } = "StreamApiMock";
    public int HistorySize { get; set; } = 200;
}

internal static class StreamApiMockDefaults
{
    public static bool IsDevelopmentEnvironment()
    {
        var env = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? string.Empty;
        return string.Equals(env, "Development", StringComparison.OrdinalIgnoreCase);
    }
}
