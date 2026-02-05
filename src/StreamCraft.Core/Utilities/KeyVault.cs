namespace StreamCraft.Core.Utilities;

public enum KeyVaultEnvironment
{
    Dev,
    Test,
    Live
}

public interface IKeyVault
{
    Task<string?> GetAsync(string name, KeyVaultEnvironment environment, CancellationToken cancellationToken = default);
    Task SetAsync(string name, string dev, string test, string live, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<string>> ListAsync(CancellationToken cancellationToken = default);
}



