using StreamCraft.Core.DataSources;

namespace StreamCraft.Bits.StreamApiMock;

[DataSourceCategory("Mock")]
public sealed record StreamApiMockChatSource : IChatSource
{
    public const string SourceId = "system-chat";

    public string Id => SourceId;
    public string Name => "Chat Source";
    public string Description => "Mock chat feed for designer bindings and preview.";
    public string Kind => "chat";
    public string? CategoryId => "chat-mock";
}

