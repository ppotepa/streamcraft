namespace StreamCraft.Core.Runtime.Chat;

public interface IChatSourceHistoryProvider
{
    string SourceId { get; }
    Task<IReadOnlyList<ChatMessageRecord>> GetHistoryAsync(CancellationToken cancellationToken);
}

