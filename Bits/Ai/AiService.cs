using System.Text.Json;

namespace StreamCraft.Bits.Ai;

public sealed record AiStatus(bool Configured, string Provider, string Environment, string Model, string Message);

public sealed record AiPromptRequest(string Prompt);

public sealed record AiThemeRequest(string Prompt, string? BaseThemeId, string? ThemeMode);

public sealed record AiThemeTokens(Dictionary<string, string> Light, Dictionary<string, string> Dark);

public sealed record AiThemeResult(string Name, string Description, AiThemeTokens Tokens, string Model);

public sealed class AiService
{
    private static readonly HashSet<string> AllowedTokens = new(StringComparer.OrdinalIgnoreCase)
    {
        "--sc-font-ui",
        "--sc-surface",
        "--sc-surface-alt",
        "--sc-surface-canvas",
        "--sc-surface-artboard",
        "--sc-border-dark",
        "--sc-border-light",
        "--sc-text",
        "--sc-text-inverse",
        "--sc-text-muted",
        "--sc-accent",
        "--sc-accent-soft",
        "--sc-safe-area",
        "--sc-selection",
        "--sc-selection-bg",
        "--sc-surface-strong",
        "--sc-surface-subtle",
        "--sc-border-muted",
        "--sc-success",
        "--sc-warning",
        "--sc-error",
        "--sc-info",
        "--sc-link",
        "--sc-canvas-bg",
        "--sc-canvas-grid",
        "--sc-media-bg",
        "--sc-media-frame",
        "--sc-overlay",
        "--sc-code-string",
        "--sc-code-number",
        "--sc-code-boolean",
        "--sc-code-keyword",
        "--sc-code-gray",
        "--sc-radius",
        "--sc-shadow"
    };

    private const int MaxPromptLength = 2000;
    private readonly AiProviderRegistry _providerRegistry;
    private readonly IAiConfigStore _configStore;
    private readonly IAiMetapromptStore _metapromptStore;

    public AiService(AiProviderRegistry providerRegistry, IAiConfigStore configStore, IAiMetapromptStore metapromptStore)
    {
        _providerRegistry = providerRegistry;
        _configStore = configStore;
        _metapromptStore = metapromptStore;
    }

    public async Task<AiStatus> GetStatusAsync(CancellationToken cancellationToken)
    {
        var config = await _configStore.GetAsync(cancellationToken);
        var provider = _providerRegistry.GetProvider(config.ProviderId);
        var status = await provider.GetStatusAsync(config, cancellationToken);
        return new AiStatus(status.Configured, status.ProviderId, status.EnvironmentName, status.Model, status.Message);
    }

    public async Task<string> RunPromptAsync(string prompt, CancellationToken cancellationToken)
    {
        var trimmed = NormalizePrompt(prompt);
        var system = "You are StreamCraft AI. Respond in a concise helpful tone.";
        var config = await _configStore.GetAsync(cancellationToken);
        var provider = _providerRegistry.GetProvider(config.ProviderId);
        return await provider.CreateChatCompletionAsync(config, system, trimmed, 0.35f, cancellationToken);
    }

    public async Task<AiThemeResult> GenerateThemeAsync(AiThemeRequest request, CancellationToken cancellationToken)
    {
        var trimmed = NormalizePrompt(request.Prompt);
        var system = await BuildThemeSystemPromptAsync(cancellationToken);
        var userPrompt = await BuildThemeUserPromptAsync(trimmed, request.BaseThemeId, request.ThemeMode, cancellationToken);

        var config = await _configStore.GetAsync(cancellationToken);
        var provider = _providerRegistry.GetProvider(config.ProviderId);
        var output = await provider.CreateChatCompletionAsync(config, system, userPrompt, 0.25f, cancellationToken);
        var json = TryExtractJson(output) ?? throw new InvalidOperationException("Theme response was not valid JSON.");
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        var name = root.TryGetProperty("name", out var nameProp) ? nameProp.GetString() : null;
        var description = root.TryGetProperty("description", out var descProp) ? descProp.GetString() : null;

        var tokensRoot = root;
        if (root.TryGetProperty("tokens", out var tokensProp) && tokensProp.ValueKind == JsonValueKind.Object)
        {
            tokensRoot = tokensProp;
        }

        var light = ReadTokenMap(tokensRoot, "light");
        var dark = ReadTokenMap(tokensRoot, "dark");

        if (light.Count == 0 && dark.Count == 0)
        {
            throw new InvalidOperationException("Theme response did not contain any recognized tokens.");
        }

        var model = string.IsNullOrWhiteSpace(config.TargetModel)
            ? provider.GetDefaultModel()
            : config.TargetModel!.Trim();

        return new AiThemeResult(
            name ?? "AI Theme",
            description ?? "AI generated theme",
            new AiThemeTokens(light, dark),
            model);
    }

    private static string NormalizePrompt(string prompt)
    {
        var trimmed = (prompt ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
        {
            throw new InvalidOperationException("Prompt is required.");
        }
        if (trimmed.Length > MaxPromptLength)
        {
            trimmed = trimmed.Substring(0, MaxPromptLength);
        }
        return trimmed;
    }

    private static readonly string DefaultThemeSystemPrompt =
        "You are the StreamCraft UI theme generator. Return JSON only with no extra text.\n" +
        "Generate both light and dark token maps.\n" +
        "Tokens are CSS variables used by the Designer UI and control library.\n" +
        "Token roles:\n" +
        "--sc-font-ui: font family stack for the entire UI.\n" +
        "--sc-surface: base window and panel background.\n" +
        "--sc-surface-alt: alternate surface for inputs, menus, list items, title bar controls.\n" +
        "--sc-surface-canvas: main app background behind windows.\n" +
        "--sc-surface-artboard: artboard and preview surfaces.\n" +
        "--sc-border-dark: main border line and window chrome.\n" +
        "--sc-border-light: highlight edge for a raised look.\n" +
        "--sc-border-muted: subtle dividers.\n" +
        "--sc-text: primary text.\n" +
        "--sc-text-inverse: text on accent surfaces.\n" +
        "--sc-text-muted: secondary labels.\n" +
        "--sc-accent: primary accent and title bar background.\n" +
        "--sc-accent-soft: secondary accent and hover states.\n" +
        "--sc-selection: selection outline and active items.\n" +
        "--sc-selection-bg: translucent selection fill.\n" +
        "--sc-safe-area: safe area outline on canvas.\n" +
        "--sc-surface-strong: stronger container surfaces.\n" +
        "--sc-surface-subtle: subtle container surfaces.\n" +
        "--sc-success, --sc-warning, --sc-error, --sc-info: status colors.\n" +
        "--sc-link: link color.\n" +
        "--sc-canvas-bg: canvas background.\n" +
        "--sc-canvas-grid: grid lines with alpha.\n" +
        "--sc-media-bg: media preview background.\n" +
        "--sc-media-frame: media frame border.\n" +
        "--sc-overlay: modal overlay tint.\n" +
        "--sc-code-string, --sc-code-number, --sc-code-boolean, --sc-code-keyword, --sc-code-gray: JSON preview syntax colors.\n" +
        "--sc-radius: global border radius with units.\n" +
        "--sc-shadow: window shadow CSS.\n" +
        "Guidelines: keep readable contrast, keep accent and selection related, use alpha for selection-bg and overlay, use hex or rgba values, and do not invent new tokens.";

    private static readonly string DefaultThemeUserTemplate =
        "Create a cohesive StreamCraft UI theme.\n" +
        "Base theme: {baseThemeId}\n" +
        "Primary mode: {themeMode}\n" +
        "User prompt: {prompt}\n" +
        "Return JSON:\n" +
        "{\n" +
        "  \"name\": \"Theme name\",\n" +
        "  \"description\": \"Short description\",\n" +
        "  \"light\": { \"--sc-surface\": \"#ffffff\" },\n" +
        "  \"dark\": { \"--sc-surface\": \"#111111\" }\n" +
        "}\n" +
        "Allowed tokens: {tokens}";

    private async Task<string> BuildThemeSystemPromptAsync(CancellationToken cancellationToken)
    {
        var stored = await _metapromptStore.GetAsync(AiMetapromptIds.ThemeSystem, cancellationToken);
        return string.IsNullOrWhiteSpace(stored) ? DefaultThemeSystemPrompt : stored;
    }

    private async Task<string> BuildThemeUserPromptAsync(
        string prompt,
        string? baseTheme,
        string? mode,
        CancellationToken cancellationToken)
    {
        var template = await _metapromptStore.GetAsync(AiMetapromptIds.ThemeUser, cancellationToken);
        if (string.IsNullOrWhiteSpace(template))
        {
            template = DefaultThemeUserTemplate;
        }

        var tokens = string.Join(", ", AllowedTokens.OrderBy(t => t, StringComparer.OrdinalIgnoreCase));
        var baseValue = string.IsNullOrWhiteSpace(baseTheme) ? "none" : baseTheme.Trim();
        var modeValue = string.IsNullOrWhiteSpace(mode) ? "auto" : mode.Trim();

        return template
            .Replace("{prompt}", prompt, StringComparison.OrdinalIgnoreCase)
            .Replace("{baseThemeId}", baseValue, StringComparison.OrdinalIgnoreCase)
            .Replace("{themeMode}", modeValue, StringComparison.OrdinalIgnoreCase)
            .Replace("{tokens}", tokens, StringComparison.OrdinalIgnoreCase);
    }

    private static Dictionary<string, string> ReadTokenMap(JsonElement root, string property)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        if (!root.TryGetProperty(property, out var map) || map.ValueKind != JsonValueKind.Object)
        {
            return result;
        }

        foreach (var entry in map.EnumerateObject())
        {
            var key = NormalizeTokenKey(entry.Name);
            if (!AllowedTokens.Contains(key))
            {
                continue;
            }

            var value = entry.Value.ValueKind switch
            {
                JsonValueKind.String => entry.Value.GetString() ?? string.Empty,
                JsonValueKind.Number => entry.Value.GetRawText(),
                JsonValueKind.True => "true",
                JsonValueKind.False => "false",
                _ => entry.Value.GetRawText()
            };

            if (string.IsNullOrWhiteSpace(value))
            {
                continue;
            }

            result[key] = value.Trim();
        }

        return result;
    }

    private static string NormalizeTokenKey(string raw)
    {
        var key = raw.Trim();
        if (key.StartsWith("--", StringComparison.Ordinal))
        {
            return key.ToLowerInvariant();
        }

        var trimmed = key.TrimStart('-');
        if (!trimmed.StartsWith("sc-", StringComparison.OrdinalIgnoreCase))
        {
            trimmed = $"sc-{trimmed}";
        }

        return $"--{trimmed}".ToLowerInvariant();
    }

    private static string? TryExtractJson(string output)
    {
        if (string.IsNullOrWhiteSpace(output)) return null;
        var start = output.IndexOf('{');
        var end = output.LastIndexOf('}');
        if (start < 0 || end <= start) return null;
        return output.Substring(start, end - start + 1);
    }
}



