namespace StreamCraft.Core.Messaging;

public static class OverlayMessageTypes
{
    private const string Category = "Overlay";

    public static readonly MessageType Action = MessageType.Create(Category, "Action");
}
