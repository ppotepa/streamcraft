using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace StreamCraft.Bits.Ai;

/// <summary>
/// ChatGPT Free Tier provider (unauthenticated/anonymous API).
/// WARNING: This is for DEVELOPMENT ONLY. Uses the public ChatGPT free tier API.
/// Tokens expire quickly and need manual refresh from browser dev tools.
/// </summary>
public sealed class ChatGptFreeProvider : IAiProvider
{
    private const string BaseUrl = "https://chatgpt.com/backend-anon/f/conversation";
    private readonly HttpClient _httpClient;

    public ChatGptFreeProvider(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public string Id => "chatgpt-free";
    public string DisplayName => "ChatGPT Free (Dev Only)";
    public string EnvironmentName => "development";

    public IReadOnlyList<string> ListModels() => new[] { "auto", "gpt-4o-mini", "gpt-4o" };

    public string GetDefaultModel() => "auto";

    public async Task<AiProviderStatus> GetStatusAsync(AiProviderConfig config, CancellationToken cancellationToken)
    {
        var configured = HasRequiredTokens(config);
        var model = string.IsNullOrWhiteSpace(config.TargetModel) ? GetDefaultModel() : config.TargetModel!.Trim();
        var message = configured
            ? "ChatGPT Free tokens available (DEV ONLY - tokens expire quickly)."
            : "ChatGPT Free tokens missing. Extract from browser dev tools (DEV ONLY).";

        return new AiProviderStatus(configured, Id, EnvironmentName, model, message, "config");
    }

    public Task<AiProviderValidationResult> ValidateConfigurationAsync(AiProviderConfig config, CancellationToken cancellationToken)
    {
        if (!HasRequiredTokens(config))
        {
            return Task.FromResult(new AiProviderValidationResult(
                false,
                "Missing required tokens. Extract from browser dev tools: openai-sentinel-chat-requirements-token, openai-sentinel-proof-token, openai-sentinel-turnstile-token, x-conduit-token"));
        }

        return Task.FromResult(new AiProviderValidationResult(
            true,
            "ChatGPT Free tokens present (WARNING: tokens expire quickly, for development only)."));
    }

    public async Task<string> CreateChatCompletionAsync(
        AiProviderConfig config,
        string systemPrompt,
        string userPrompt,
        float temperature,
        CancellationToken cancellationToken)
    {
        if (!HasRequiredTokens(config))
        {
            throw new InvalidOperationException(
                "ChatGPT Free tokens missing. Extract from browser dev tools (openai-sentinel-chat-requirements-token, openai-sentinel-proof-token, openai-sentinel-turnstile-token, x-conduit-token).");
        }

        var model = string.IsNullOrWhiteSpace(config.TargetModel) ? GetDefaultModel() : config.TargetModel!.Trim();
        var deviceId = GetConfigValue(config, "oai-device-id") ?? Guid.NewGuid().ToString();

        // Combine system and user prompt (free tier doesn't support proper system messages)
        var combinedPrompt = string.IsNullOrWhiteSpace(systemPrompt)
            ? userPrompt
            : $"{systemPrompt}\n\n{userPrompt}";

        var requestBody = new
        {
            action = "next",
            messages = new[]
            {
                new
                {
                    id = Guid.NewGuid().ToString(),
                    author = new { role = "user" },
                    create_time = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                    content = new
                    {
                        content_type = "text",
                        parts = new[] { combinedPrompt }
                    },
                    metadata = new
                    {
                        selected_github_repos = Array.Empty<string>(),
                        selected_all_github_repos = false,
                        serialization_metadata = new { custom_symbol_offsets = Array.Empty<string>() }
                    }
                }
            },
            parent_message_id = "client-created-root",
            model,
            timezone_offset_min = -60,
            timezone = "Europe/Warsaw",
            history_and_training_disabled = true,
            conversation_mode = new { kind = "primary_assistant" },
            enable_message_followups = true,
            system_hints = Array.Empty<string>(),
            supports_buffering = true,
            supported_encodings = new[] { "v1" },
            client_contextual_info = new
            {
                is_dark_mode = true,
                time_since_loaded = 16,
                page_height = 914,
                page_width = 978,
                pixel_ratio = 1,
                screen_height = 1080,
                screen_width = 1920,
                app_name = "chatgpt.com"
            },
            paragen_cot_summary_display_override = "allow",
            force_parallel_switch = "auto"
        };

        var payload = JsonSerializer.Serialize(requestBody);
        using var request = new HttpRequestMessage(HttpMethod.Post, BaseUrl);

        // Set required headers
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("text/event-stream"));
        request.Headers.Add("accept-language", GetConfigValue(config, "accept-language") ?? "en");
        request.Headers.Add("oai-client-build-number", GetConfigValue(config, "oai-client-build-number") ?? "4447028");
        request.Headers.Add("oai-client-version", GetConfigValue(config, "oai-client-version") ?? "prod-f50cd5e9549eb4becd2894855ea1ec884592618a");
        request.Headers.Add("oai-device-id", deviceId);
        request.Headers.Add("oai-echo-logs", "0");
        request.Headers.Add("oai-language", GetConfigValue(config, "oai-language") ?? "en-US");
        request.Headers.Add("openai-sentinel-chat-requirements-token", GetConfigValue(config, "openai-sentinel-chat-requirements-token") ?? "");
        request.Headers.Add("openai-sentinel-proof-token", GetConfigValue(config, "openai-sentinel-proof-token") ?? "");
        request.Headers.Add("openai-sentinel-turnstile-token", GetConfigValue(config, "openai-sentinel-turnstile-token") ?? "");
        request.Headers.Add("x-conduit-token", GetConfigValue(config, "x-conduit-token") ?? "");
        request.Headers.Add("x-oai-turn-trace-id", Guid.NewGuid().ToString());

        request.Content = new StringContent(payload, Encoding.UTF8, "application/json");

        using var response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException(
                $"ChatGPT Free request failed: {(int)response.StatusCode} {response.ReasonPhrase}. {errorBody}");
        }

        // Parse SSE stream
        return await ParseSseResponseAsync(response, cancellationToken);
    }

    private static bool HasRequiredTokens(AiProviderConfig config)
    {
        return !string.IsNullOrWhiteSpace(GetConfigValue(config, "openai-sentinel-chat-requirements-token"))
               && !string.IsNullOrWhiteSpace(GetConfigValue(config, "openai-sentinel-proof-token"))
               && !string.IsNullOrWhiteSpace(GetConfigValue(config, "openai-sentinel-turnstile-token"))
               && !string.IsNullOrWhiteSpace(GetConfigValue(config, "x-conduit-token"));
    }

    private static string? GetConfigValue(AiProviderConfig config, string key)
    {
        if (!config.Metadata.HasValue)
        {
            return null;
        }

        if (config.Metadata.Value.TryGetProperty(key, out var value))
        {
            return value.GetString();
        }

        return null;
    }

    private static async Task<string> ParseSseResponseAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        var completionText = new StringBuilder();

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var reader = new StreamReader(stream);

        while (!reader.EndOfStream)
        {
            var line = await reader.ReadLineAsync(cancellationToken);
            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            if (!line.StartsWith("data: ", StringComparison.Ordinal))
            {
                continue;
            }

            var data = line.Substring(6).Trim();
            if (data == "[DONE]")
            {
                break;
            }

            try
            {
                using var doc = JsonDocument.Parse(data);
                var root = doc.RootElement;

                // Try to extract message content
                if (root.TryGetProperty("message", out var message))
                {
                    if (message.TryGetProperty("content", out var content))
                    {
                        if (content.TryGetProperty("parts", out var parts) && parts.ValueKind == JsonValueKind.Array)
                        {
                            foreach (var part in parts.EnumerateArray())
                            {
                                if (part.ValueKind == JsonValueKind.String)
                                {
                                    completionText.Append(part.GetString());
                                }
                            }
                        }
                    }
                }
            }
            catch (JsonException)
            {
                // Skip malformed JSON chunks
                continue;
            }
        }

        var result = completionText.ToString().Trim();
        return string.IsNullOrEmpty(result) ? "No response from ChatGPT Free API." : result;
    }
}
