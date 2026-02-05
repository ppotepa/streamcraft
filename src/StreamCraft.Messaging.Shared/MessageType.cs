namespace Messaging.Shared;

/// <summary>
/// Represents a strongly-typed message type identifier that is unique across all bits.
/// Uses a category prefix to ensure no collisions between different message sources.
/// </summary>
public readonly struct MessageType : IEquatable<MessageType>
{
    /// <summary>
    /// The full unique identifier in format "Category.EventName"
    /// </summary>
    public string Id { get; }

    /// <summary>
    /// The category/namespace (e.g., "Common", "Sc2", "Debug")
    /// </summary>
    public string Category { get; }

    /// <summary>
    /// The event name without category prefix (e.g., "ApplicationStarted", "LobbyFileParsed")
    /// </summary>
    public string Name { get; }

    private MessageType(string category, string name)
    {
        Category = category ?? throw new ArgumentNullException(nameof(category));
        Name = name ?? throw new ArgumentNullException(nameof(name));
        Id = $"{category}.{name}";
    }

    /// <summary>
    /// Creates a new message type with the specified category and name.
    /// </summary>
    public static MessageType Create(string category, string name) => new(category, name);

    public bool Equals(MessageType other) => Id == other.Id;
    public override bool Equals(object? obj) => obj is MessageType other && Equals(other);
    public override int GetHashCode() => Id.GetHashCode();
    public override string ToString() => Id;

    public static bool operator ==(MessageType left, MessageType right) => left.Equals(right);
    public static bool operator !=(MessageType left, MessageType right) => !left.Equals(right);
}
