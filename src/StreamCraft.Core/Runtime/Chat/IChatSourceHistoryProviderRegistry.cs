namespace StreamCraft.Core.Runtime.Chat;

public interface IChatSourceHistoryProviderRegistry
{
    IReadOnlyList<IChatSourceHistoryProvider> GetAll();
    IChatSourceHistoryProvider? Get(string sourceId);
    void Register(IChatSourceHistoryProvider provider);
    void RegisterRange(IEnumerable<IChatSourceHistoryProvider> providers);
}

