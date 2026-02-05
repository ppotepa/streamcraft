namespace StreamCraft.Bits.Ai;

public interface IAiProvider
{
    string Id { get; }
    string DisplayName { get; }
    string EnvironmentName { get; }
    IReadOnlyList<string> ListModels();
    string GetDefaultModel();
    Task<AiProviderStatus> GetStatusAsync(AiProviderConfig config, CancellationToken cancellationToken);
    Task<AiProviderValidationResult> ValidateConfigurationAsync(AiProviderConfig config, CancellationToken cancellationToken);
    Task<string> CreateChatCompletionAsync(
        AiProviderConfig config,
        string systemPrompt,
        string userPrompt,
        float temperature,
        CancellationToken cancellationToken);
}

public sealed record AiProviderStatus(
    bool Configured,
    string ProviderId,
    string EnvironmentName,
    string Model,
    string Message);

public sealed record AiProviderValidationResult(bool Ok, string Message);

public sealed record AiProviderDescriptor(string Id, string Name);



