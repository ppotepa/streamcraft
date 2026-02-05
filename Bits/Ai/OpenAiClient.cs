using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using StreamCraft.Core.Utilities;

namespace StreamCraft.Bits.Ai;

public sealed class OpenAiClient
{
    private const string BaseUrl = "https://api.openai.com/v1/chat/completions";
    private readonly HttpClient _httpClient;
    private readonly IKeyVault _keyVault;
    private readonly IAiModelStore _modelStore;

    public OpenAiClient(HttpClient httpClient, IKeyVault keyVault, IAiModelStore modelStore)
    {
        _httpClient = httpClient;
        _keyVault = keyVault;
        _modelStore = modelStore;
    }

    public async Task<string> GetModelAsync(CancellationToken cancellationToken) =>
        await _modelStore.GetActiveModelAsync(cancellationToken);

    public string EnvironmentName => AiEnvironment.GetEnvironment().ToString().ToLowerInvariant();

    public async Task<bool> HasApiKeyAsync(CancellationToken cancellationToken)
    {
        var key = await _keyVault.GetAsync("openai", AiEnvironment.GetEnvironment(), cancellationToken);
        return !string.IsNullOrWhiteSpace(key);
    }

    public async Task<string> CreateChatCompletionAsync(
        string systemPrompt,
        string userPrompt,
        CancellationToken cancellationToken,
        float temperature = 0.2f)
    {
        var key = await GetApiKeyAsync(cancellationToken);
        var model = await _modelStore.GetActiveModelAsync(cancellationToken);
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
        message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key);
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

    private async Task<string> GetApiKeyAsync(CancellationToken cancellationToken)
    {
        var key = await _keyVault.GetAsync("openai", AiEnvironment.GetEnvironment(), cancellationToken);
        if (string.IsNullOrWhiteSpace(key))
        {
            throw new InvalidOperationException("OpenAI API key is missing from key vault.");
        }

        return key;
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



