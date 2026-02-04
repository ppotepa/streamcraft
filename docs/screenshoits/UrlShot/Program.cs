using System.Text.Json;
using Microsoft.Playwright;

var jsonOptions = new JsonSerializerOptions
{
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    WriteIndented = true,
    PropertyNameCaseInsensitive = true
};

var configPath = "shots.json";
for (var i = 0; i < args.Length; i++)
{
    if (args[i].Equals("--config", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
    {
        configPath = args[i + 1];
    }
}

var workingDir = Environment.CurrentDirectory;
var configFile = Path.GetFullPath(configPath, workingDir);
var configDir = Path.GetDirectoryName(configFile) ?? workingDir;

if (!File.Exists(configFile))
{
    var sample = new ShotRunConfig
    {
        BaseUrl = "http://localhost:5173",
        OutputDir = "..\\screenshots",
        ViewportWidth = 1440,
        ViewportHeight = 900,
        FullPage = false,
        WaitAfterLoadMs = 600,
        TimeoutMs = 30000,
        WaitUntil = "load",
        Shots =
        [
            new ShotDefinition { Name = "designer-home", Path = "/designer/ui/" },
            new ShotDefinition { Name = "designer-canvas", Path = "/designer/ui/playground2" },
            new ShotDefinition { Name = "all-controls", Path = "/designer/ui/all" },
            new ShotDefinition { Name = "media-test", Path = "/designer/ui/media-test" },
            new ShotDefinition { Name = "overlay-preview", Path = "/designer/ui/preview/demo" }
        ]
    };

    Directory.CreateDirectory(configDir);
    await File.WriteAllTextAsync(configFile, JsonSerializer.Serialize(sample, jsonOptions));
    Console.WriteLine("Created sample config: " + configFile);
    Console.WriteLine("Edit the config and re-run with: dotnet run -- --config shots.json");
    return;
}

var json = await File.ReadAllTextAsync(configFile);
var config = JsonSerializer.Deserialize<ShotRunConfig>(json, jsonOptions);
if (config == null)
{
    Console.WriteLine("Invalid config: " + configFile);
    return;
}

var outputDir = Path.GetFullPath(config.OutputDir ?? "..\\screenshots", configDir);
Directory.CreateDirectory(outputDir);

using var playwright = await Playwright.CreateAsync();
await using var browser = await playwright.Chromium.LaunchAsync(new BrowserTypeLaunchOptions
{
    Headless = true
});

foreach (var shot in config.Shots ?? [])
{
    var url = ResolveUrl(config.BaseUrl, shot.Url, shot.Path);
    if (string.IsNullOrWhiteSpace(url))
    {
        Console.WriteLine($"Skipping {shot.Name}: no URL/path configured.");
        continue;
    }

    var page = await browser.NewPageAsync(new BrowserNewPageOptions
    {
        ViewportSize = new ViewportSize
        {
            Width = shot.ViewportWidth ?? config.ViewportWidth ?? 1440,
            Height = shot.ViewportHeight ?? config.ViewportHeight ?? 900
        }
    });

    try
    {
        Console.WriteLine($"Opening {url}");
        var waitUntil = ResolveWaitUntil(shot.WaitUntil ?? config.WaitUntil);
        await page.GotoAsync(url, new PageGotoOptions
        {
            WaitUntil = waitUntil,
            Timeout = shot.TimeoutMs ?? config.TimeoutMs ?? 30000
        });

        await RunActionsAsync(page, config.Actions);
        await RunActionsAsync(page, shot.Actions);

        var waitMs = shot.WaitAfterLoadMs ?? config.WaitAfterLoadMs ?? 0;
        if (waitMs > 0)
        {
            await page.WaitForTimeoutAsync(waitMs);
        }

        var fileName = string.IsNullOrWhiteSpace(shot.FileName)
            ? $"{shot.Name}.png"
            : shot.FileName;

        var outputPath = Path.Combine(outputDir, fileName);
        await page.ScreenshotAsync(new PageScreenshotOptions
        {
            Path = outputPath,
            FullPage = shot.FullPage ?? config.FullPage ?? false
        });
        Console.WriteLine($"Saved {outputPath}");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Failed {shot.Name}: {ex.Message}");
    }
    finally
    {
        await page.CloseAsync();
    }
}

static async Task RunActionsAsync(IPage page, IReadOnlyList<ShotAction>? actions)
{
    if (actions == null) return;

    foreach (var action in actions)
    {
        switch (action.Type?.ToLowerInvariant())
        {
            case "eval":
                if (!string.IsNullOrWhiteSpace(action.Value))
                {
                    await page.EvaluateAsync(action.Value);
                }
                break;
            case "click":
                if (!string.IsNullOrWhiteSpace(action.Value))
                {
                    await page.ClickAsync(action.Value, new PageClickOptions { Timeout = action.TimeoutMs });
                }
                break;
            case "waitforselector":
                if (!string.IsNullOrWhiteSpace(action.Value))
                {
                    await page.WaitForSelectorAsync(action.Value, new PageWaitForSelectorOptions { Timeout = action.TimeoutMs });
                }
                break;
            case "wait":
            case "delay":
                if (action.TimeoutMs.HasValue)
                {
                    await page.WaitForTimeoutAsync(action.TimeoutMs.Value);
                }
                break;
        }
    }
}

static WaitUntilState ResolveWaitUntil(string? value)
{
    return value?.ToLowerInvariant() switch
    {
        "domcontentloaded" => WaitUntilState.DOMContentLoaded,
        "networkidle" => WaitUntilState.NetworkIdle,
        "load" => WaitUntilState.Load,
        _ => WaitUntilState.Load
    };
}

static string ResolveUrl(string? baseUrl, string? url, string? path)
{
    if (!string.IsNullOrWhiteSpace(url)) return url;
    if (string.IsNullOrWhiteSpace(baseUrl) || string.IsNullOrWhiteSpace(path)) return string.Empty;
    return baseUrl.TrimEnd('/') + "/" + path.TrimStart('/');
}

public sealed class ShotRunConfig
{
    public string? BaseUrl { get; set; }
    public string? OutputDir { get; set; }
    public int? ViewportWidth { get; set; }
    public int? ViewportHeight { get; set; }
    public bool? FullPage { get; set; }
    public int? WaitAfterLoadMs { get; set; }
    public int? TimeoutMs { get; set; }
    public string? WaitUntil { get; set; }
    public List<ShotAction>? Actions { get; set; }
    public List<ShotDefinition>? Shots { get; set; }
}

public sealed class ShotDefinition
{
    public string Name { get; set; } = "shot";
    public string? Url { get; set; }
    public string? Path { get; set; }
    public string? FileName { get; set; }
    public int? ViewportWidth { get; set; }
    public int? ViewportHeight { get; set; }
    public bool? FullPage { get; set; }
    public int? WaitAfterLoadMs { get; set; }
    public int? TimeoutMs { get; set; }
    public string? WaitUntil { get; set; }
    public List<ShotAction>? Actions { get; set; }
}

public sealed class ShotAction
{
    public string? Type { get; set; }
    public string? Value { get; set; }
    public int? TimeoutMs { get; set; }
}
