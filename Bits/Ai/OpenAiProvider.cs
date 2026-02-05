using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Core.Utilities;

namespace StreamCraft.Bits.Ai;

public sealed class OpenAiProvider : IAiProvider
{
    private const string BaseUrl = "https://api.openai.com/v1/chat/completions";
    private readonly HttpClient _httpClient;
    private readonly IKeyVault _keyVault;

    public OpenAiProvider(HttpClient httpClient, IKeyVault keyVault)
    {
        _httpClient = httpClient;
        _keyVault = keyVault;
    }

    public string Id => AiProviderDefaults.DefaultProviderId;
    public string DisplayName => "OpenAI";
    public string EnvironmentName => AiEnvironment.GetEnvironment().ToString().ToLowerInvariant();

    public IReadOnlyList<string> ListModels() => AiEnvironment.GetConfiguredModels();

    public string GetDefaultModel() => AiEnvironment.GetDefaultModel();

    public async Task<AiProviderStatus> GetStatusAsync(AiProviderConfig config, CancellationToken cancellationToken)
    {
        var token = await ResolveTokenAsync(config, cancellationToken);
        var configured = !string.IsNullOrWhiteSpace(token);
        var model = string.IsNullOrWhiteSpace(config.TargetModel) ? GetDefaultModel() : config.TargetModel!.Trim();
        var message = configured
            ? "OpenAI token available."
            : "OpenAI token missing. Add it in AI config or KeyVault (name: openai).";

        return new AiProviderStatus(configured, Id, EnvironmentName, model, message);
    }

    public async Task<AiProviderValidationResult> ValidateConfigurationAsync(AiProviderConfig config, CancellationToken cancellationToken)
    {
        var token = await ResolveTokenAsync(config, cancellationToken);
        if (string.IsNullOrWhiteSpace(token))
        {
            return new AiProviderValidationResult(false, "OpenAI token missing. Add it in AI config or KeyVault (name: openai).");
        }

        using var request = new HttpRequestMessage(HttpMethod.Get, "https://api.openai.com/v1/models");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (response.IsSuccessStatusCode)
        {
            return new AiProviderValidationResult(true, "OpenAI key validated.");
        }

        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
        var snippet = Truncate(responseBody, 200);
        var message = $"OpenAI validation failed: {(int)response.StatusCode} {response.ReasonPhrase}.";
        if (!string.IsNullOrWhiteSpace(snippet))
        {
            message = $"{message} {snippet}";
        }

        return new AiProviderValidationResult(false, message);
    }

    public async Task<string> CreateChatCompletionAsync(
        AiProviderConfig config,
        string systemPrompt,
        string userPrompt,
        float temperature,
        CancellationToken cancellationToken)
    {
        var token = await ResolveTokenAsync(config, cancellationToken);
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new InvalidOperationException("OpenAI token is missing.");
        }

        var model = string.IsNullOrWhiteSpace(config.TargetModel) ? GetDefaultModel() : config.TargetModel!.Trim();
        var request = new
        {
            model,
            messages = new[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = userPrompt }
            },
            temperature
        };

        var payload = JsonSerializer.Serialize(request);
        using var message = new HttpRequestMessage(HttpMethod.Post, BaseUrl);
        message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        message.Content = new StringContent(payload, Encoding.UTF8, "application/json");

        using var response = await _httpClient.SendAsync(message, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                $"OpenAI request failed: {(int)response.StatusCode} {response.ReasonPhrase}. {responseBody}");
        }

        return ExtractText(responseBody);
    }

    private async Task<string?> ResolveTokenAsync(AiProviderConfig config, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(config.AccessToken))
        {
            return config.AccessToken!.Trim();
        }

        return await _keyVault.GetAsync("openai", AiEnvironment.GetEnvironment(), cancellationToken);
    }

    private static string? Truncate(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        if (trimmed.Length <= maxLength)
        {
            return trimmed;
        }

        return trimmed.Substring(0, maxLength) + "...";
    }

    private static string ExtractText(string payload)
    {
        using var doc = JsonDocument.Parse(payload);
        if (doc.RootElement.TryGetProperty("choices", out var choices) && choices.ValueKind == JsonValueKind.Array)
        {
            var choice = choices.EnumerateArray().FirstOrDefault();
            if (choice.ValueKind == JsonValueKind.Object)
            {
                if (choice.TryGetProperty("message", out var message) && message.ValueKind == JsonValueKind.Object)
                {
                    if (message.TryGetProperty("content", out var content))
                    {
                        return content.GetString() ?? string.Empty;
                    }
                }
                if (choice.TryGetProperty("text", out var text))
                {
                    return text.GetString() ?? string.Empty;
                }
            }
        }

        if (doc.RootElement.TryGetProperty("output_text", out var outputText))
        {
            return outputText.GetString() ?? string.Empty;
        }

        if (doc.RootElement.TryGetProperty("output", out var output) && output.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in output.EnumerateArray())
            {
                if (!item.TryGetProperty("content", out var contentArray) || contentArray.ValueKind != JsonValueKind.Array)
                {
                    continue;
                }

                foreach (var content in contentArray.EnumerateArray())
                {
                    if (content.TryGetProperty("text", out var text))
                    {
                        return text.GetString() ?? string.Empty;
                    }
                }
            }
        }

        return payload;
    }
}
