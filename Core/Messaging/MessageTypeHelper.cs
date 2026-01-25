using Messaging.Shared;

namespace Core.Messaging;

/// <summary>
/// Helper methods for creating and working with MessageType instances.
/// </summary>
public static class MessageTypeHelper
{
    /// <summary>
    /// Creates a batch of message types for a given category.
    /// Useful when defining multiple message types at once.
    /// </summary>
    public static IEnumerable<(string Name, MessageType Type)> CreateBatch(
        string category,
        params string[] names)
    {
        foreach (var name in names)
        {
            yield return (name, MessageType.Create(category, name));
        }
    }

    /// <summary>
    /// Checks if two message types belong to the same category.
    /// </summary>
    public static bool IsSameCategory(MessageType type1, MessageType type2)
    {
        return string.Equals(type1.Category, type2.Category, StringComparison.Ordinal);
    }

    /// <summary>
    /// Checks if a message type belongs to a specific category.
    /// </summary>
    public static bool IsCategory(MessageType type, string category)
    {
        return string.Equals(type.Category, category, StringComparison.Ordinal);
    }
}
