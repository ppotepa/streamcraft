namespace Core.State;

public interface IBitStateStoreRegistry
{
    void Register<TState>(string bitId, IBitStateStore<TState> store);
    bool TryGet(string bitId, out IBitStateStore store);
    bool TryGet<TState>(string bitId, out IBitStateStore<TState> store);
    Task<IBitStateStore<TState>> WaitForStoreAsync<TState>(string bitId, CancellationToken cancellationToken);
    IReadOnlyDictionary<string, IBitStateStore> GetAll();
}
