using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.RegularExpressions;

var keysPath = GetArgumentValue(args, "--keys");
var readStdin = args.Any(arg => string.Equals(arg, "--stdin", StringComparison.OrdinalIgnoreCase));

if (string.IsNullOrWhiteSpace(keysPath) && !readStdin && File.Exists("keys.txt"))
{
    keysPath = "keys.txt";
}

if (string.IsNullOrWhiteSpace(keysPath) && !readStdin && Console.IsInputRedirected)
{
    readStdin = true;
}

List<string> keys;
if (!string.IsNullOrWhiteSpace(keysPath))
{
    if (!File.Exists(keysPath))
    {
        Console.Error.WriteLine($"Keys file not found: {keysPath}");
        return;
    }

    keys = File.ReadAllLines(keysPath).ToList();
}
else if (readStdin)
{
    var input = await Console.In.ReadToEndAsync();
    keys = input
        .Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
        .ToList();
}
else
{
    PrintUsage();
    return;
}

keys = keys
    .Select(line => line.Trim())
    .Where(line => !string.IsNullOrWhiteSpace(line))
    .Where(line => !line.StartsWith("#", StringComparison.Ordinal))
    .ToList();

if (keys.Count == 0)
{
    Console.Error.WriteLine("No keys provided.");
    return;
}

using var httpClient = new HttpClient();

foreach (var key in keys)
{
    var displayKey = MaskKey(key);
    if (string.IsNullOrWhiteSpace(key))
    {
        Console.WriteLine($"{displayKey}: SKIP");
        continue;
    }

    try
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "https://api.openai.com/v1/models");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key);

        using var response = await httpClient.SendAsync(request);
        if (response.IsSuccessStatusCode)
        {
            Console.WriteLine($"{displayKey}: OK");
            continue;
        }

        var body = await response.Content.ReadAsStringAsync();
        var message = ExtractErrorMessage(body) ?? response.ReasonPhrase ?? "Unknown error";
        message = SanitizeMessage(message);
        Console.WriteLine($"{displayKey}: FAIL {(int)response.StatusCode} {message}");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"{displayKey}: ERROR {ex.Message}");
    }
}

static string? GetArgumentValue(string[] args, string name)
{
    for (var i = 0; i < args.Length - 1; i++)
    {
        if (string.Equals(args[i], name, StringComparison.OrdinalIgnoreCase))
        {
            return args[i + 1];
        }
    }

    return null;
}

static void PrintUsage()
{
    Console.WriteLine("Usage:");
    Console.WriteLine("  dotnet run --project tools/OpenAiKeyValidator -- --keys path/to/keys.txt");
    Console.WriteLine("  type keys.txt | dotnet run --project tools/OpenAiKeyValidator -- --stdin");
    Console.WriteLine("  (default) dotnet run --project tools/OpenAiKeyValidator  # uses ./keys.txt if present");
}

static string MaskKey(string key)
{
    if (string.IsNullOrWhiteSpace(key))
    {
        return "sk-***";
    }

    var trimmed = key.Trim();
    var suffix = trimmed.Length > 4 ? trimmed[^4..] : trimmed;
    return $"sk-***{suffix}";
}

static string? ExtractErrorMessage(string payload)
{
    if (string.IsNullOrWhiteSpace(payload))
    {
        return null;
    }

    try
    {
        using var doc = JsonDocument.Parse(payload);
        if (doc.RootElement.TryGetProperty("error", out var error) &&
            error.ValueKind == JsonValueKind.Object &&
            error.TryGetProperty("message", out var message) &&
            message.ValueKind == JsonValueKind.String)
        {
            return message.GetString();
        }
    }
    catch (JsonException)
    {
        return payload.Trim();
    }

    return payload.Trim();
}

static string SanitizeMessage(string message)
{
    if (string.IsNullOrWhiteSpace(message))
    {
        return message;
    }

    var regex = new Regex("sk-[A-Za-z0-9-_]{10,}", RegexOptions.Compiled);
    return regex.Replace(message, "sk-***");
}
