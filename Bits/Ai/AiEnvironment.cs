using Core.Utilities;

namespace StreamCraft.Bits.Ai;

public static class AiEnvironment
{
    private const string DefaultModel = "gpt-4o-mini";

    public static KeyVaultEnvironment GetEnvironment()
    {
        var raw = Environment.GetEnvironmentVariable("STREAMCRAFT_ENV") ?? "dev";
        if (string.Equals(raw, "test", StringComparison.OrdinalIgnoreCase)) return KeyVaultEnvironment.Test;
        if (string.Equals(raw, "live", StringComparison.OrdinalIgnoreCase)) return KeyVaultEnvironment.Live;
        return KeyVaultEnvironment.Dev;
    }

    public static string GetDefaultModel()
    {
        var model = Environment.GetEnvironmentVariable("STREAMCRAFT_OPENAI_MODEL");
        return string.IsNullOrWhiteSpace(model) ? DefaultModel : model;
    }

    public static IReadOnlyList<string> GetConfiguredModels()
    {
        var raw = Environment.GetEnvironmentVariable("STREAMCRAFT_OPENAI_MODELS");
        if (string.IsNullOrWhiteSpace(raw))
        {
            return new[] { GetDefaultModel() };
        }

        var models = raw.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(entry => !string.IsNullOrWhiteSpace(entry))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (models.Count == 0)
        {
            models.Add(GetDefaultModel());
        }

        return models;
    }
}
