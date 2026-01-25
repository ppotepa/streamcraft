using Microsoft.AspNetCore.Http;
using System.Diagnostics;
using System.Net.Http;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Linq;
using StreamCraft.Core.Bits;

namespace StreamCraft.Bits.Sc2;

[BitRoute("/sc2")]
[HasUserInterface]
public class Sc2Bit : StreamBit<Sc2BitState>, IBitConfiguration<Sc2BitConfig>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        WriteIndented = true
    };

    private static readonly Regex BattleTagRegex = new("^[A-Za-z0-9_]{1,12}#[0-9]{3,5}$", RegexOptions.Compiled);

    private static readonly IReadOnlyList<BitConfigurationSection> ConfigSections = new[]
    {
        new BitConfigurationSection(
            id: "player-identity",
            title: "Player Identity",
            description: "Used by the SC2 plugin runner to determine who you are in lobby files.",
            fields: new[]
            {
                new BitConfigurationField(
                    key: "userBattleTag",
                    label: "BattleTag",
                    type: "text",
                    description: "Format: Name#1234 (3-5 digits).",
                    placeholder: "XLover#2803",
                    defaultValue: "XLover#2803",
                    required: true,
                    validationPattern: "^[A-Za-z0-9_]{1,12}#[0-9]{3,5}$")
            })
    };


    private readonly HttpClient _httpClient = new()
    {
        BaseAddress = new Uri("http://localhost:6119")
    };

    private readonly object _stateLock = new();
    private CancellationTokenSource? _runnerCts;
    private Task? _runnerTask;
    private Sc2BitConfig _config = new();
    private string _configPath = string.Empty;
    private DateTime? _lastMatchEndTime;
    private const int PostGameStickySeconds = 20;

    public override string Name => "SC2";
    public override string Description => "StarCraft II overlay and statistics";

    public Sc2BitConfig Configuration => _config;

    protected override void OnInitialize()
    {
        base.OnInitialize();

        _configPath = GetConfigPath();
        _config = LoadConfig(_configPath);
        StartRunner();
    }

    public override async Task HandleAsync(HttpContext httpContext)
    {
        if (IsConfigRequest(httpContext.Request.Path))
        {
            await HandleConfigAsync(httpContext);
            return;
        }

        object stateSnapshot;
        lock (_stateLock)
        {
            var state = State;
            stateSnapshot = new
            {
                toolState = state.ToolState,
                timestamp = state.Timestamp.ToString("O"),
                userBattleTag = state.UserBattleTag,
                userName = state.UserName,
                opponentBattleTag = state.OpponentBattleTag,
                opponentName = state.OpponentName,
                matchup = state.Matchup,
                metric = new
                {
                    value = state.HeartRate,
                    timestampUtc = state.HeartRateTimestamp?.ToString("O"),
                    units = "bpm"
                },
                session = new
                {
                    contextTag = state.Matchup,
                    opponentName = state.OpponentName,
                    rankLabel = state.RankLabel,
                    wins = state.Wins,
                    games = state.Games,
                    losses = state.Losses,
                    recentItems = state.RecentMatches.Select(m => new
                    {
                        dateUtc = m.DateUtc.ToString("O"),
                        tag = m.Tag,
                        delta = m.Delta,
                        duration = m.Duration
                    }).ToArray(),
                    altSlots = new
                    {
                        stat1Label = "Win Rate",
                        stat1Value = state.Games > 0 ? $"{(state.Wins * 100 / state.Games)}%" : "N/A",
                        stat2Label = "Avg Duration",
                        stat2Value = "12:34",
                        stat3Label = "Peak MMR",
                        stat3Value = "4500"
                    }
                },
                entity = new
                {
                    summaryLine1 = new[] { state.OpponentMMR, state.OpponentRank, state.OpponentRace },
                    summaryLine2 = new[] { state.OpponentTodayRecord, state.OpponentSeasonRecord, state.OpponentLeague },
                    summaryLine3 = new[] { state.OpponentWinRate, state.OpponentStreak, state.OpponentFavoriteMap },
                    recentItems = state.OpponentHistory.Select(m => new
                    {
                        dateUtc = m.DateUtc.ToString("O"),
                        tag = m.Tag,
                        delta = m.Delta,
                        duration = m.Duration
                    }).ToArray()
                },
                panel4 = new
                {
                    title = "Map",
                    lines = new[] { state.CurrentMap, state.MapWinRate },
                    badge = state.MapBadge
                }
            };
        }

        httpContext.Response.ContentType = "application/json";
        await httpContext.Response.WriteAsync(JsonSerializer.Serialize(stateSnapshot, JsonOptions));
    }

    public override async Task HandleUIAsync(HttpContext httpContext)
    {
        var assemblyLocation = Path.GetDirectoryName(GetType().Assembly.Location);
        var uiRoot = Path.Combine(assemblyLocation!, "ui", "dist");
        var requestPath = httpContext.Request.Path.Value ?? string.Empty;

        var routePrefix = (Route ?? string.Empty).TrimEnd('/');
        var relativePath = requestPath;
        if (!string.IsNullOrEmpty(routePrefix) && requestPath.StartsWith(routePrefix, StringComparison.OrdinalIgnoreCase))
        {
            relativePath = requestPath[routePrefix.Length..];
        }

        relativePath = relativePath.TrimStart('/');
        if (string.IsNullOrEmpty(relativePath) || relativePath.Equals("ui", StringComparison.OrdinalIgnoreCase))
        {
            relativePath = "index.html";
        }
        else if (relativePath.StartsWith("ui/", StringComparison.OrdinalIgnoreCase))
        {
            relativePath = relativePath[3..];
        }

        if (relativePath.Contains("..", StringComparison.Ordinal))
        {
            httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await httpContext.Response.WriteAsync("Invalid UI asset path.");
            return;
        }

        var filePath = Path.Combine(uiRoot, relativePath);

        if (File.Exists(filePath))
        {
            httpContext.Response.ContentType = GetContentType(filePath);
            await httpContext.Response.SendFileAsync(filePath);
        }
        else
        {
            httpContext.Response.StatusCode = 404;
            await httpContext.Response.WriteAsync($"UI file not found at: {filePath}");
        }
    }

    public IReadOnlyList<BitConfigurationSection> GetConfigurationSections() => ConfigSections;

    private void StartRunner()
    {
        StopRunner();
        _runnerCts = new CancellationTokenSource();
        _runnerTask = Task.Run(() => RunnerLoopAsync(_runnerCts.Token));
    }

    private void StopRunner()
    {
        if (_runnerCts == null)
        {
            return;
        }

        try
        {
            _runnerCts.Cancel();
            _runnerTask?.Wait(TimeSpan.FromSeconds(1));
        }
        catch
        {
            // Ignore cancellation errors
        }
        finally
        {
            _runnerCts.Dispose();
            _runnerCts = null;
            _runnerTask = null;
        }
    }

    private async Task RunnerLoopAsync(CancellationToken cancellationToken)
    {
        var pollDelay = TimeSpan.FromMilliseconds(Math.Max(100, _config.PollIntervalMs));

        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                await UpdateStateAsync();
            }
            catch
            {
                // Swallow runner exceptions so the loop keeps going
            }

            try
            {
                await Task.Delay(pollDelay, cancellationToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    private async Task UpdateStateAsync()
    {
        var sc2Running = Process.GetProcessesByName("SC2_x64").Any();
        var lobbyDetected = !string.IsNullOrWhiteSpace(_config.LobbyFilePath) && File.Exists(_config.LobbyFilePath);
        var gameSnapshot = await GetGameSnapshotAsync();

        lock (_stateLock)
        {
            var state = State;

            if (!sc2Running)
            {
                ClearState(state);
                return;
            }

            var isInGame = gameSnapshot?.IsInGame == true;
            state.ToolState = isInGame ? "InGame" : (lobbyDetected ? "LobbyDetected" : "InMenus");

            var playerNames = gameSnapshot?.Players?
                .Select(p => p.Name ?? string.Empty)
                .Where(n => !string.IsNullOrWhiteSpace(n))
                .ToArray();

            var extraction = LobbyTagExtractor.ExtractTags(
                _config.LobbyFilePath,
                _config.UserBattleTag,
                playerNames);

            if (!string.IsNullOrWhiteSpace(extraction.UserBattleTag))
            {
                state.UserBattleTag = extraction.UserBattleTag;
            }
            else if (!string.IsNullOrWhiteSpace(_config.UserBattleTag))
            {
                state.UserBattleTag ??= _config.UserBattleTag;
            }

            if (!string.IsNullOrWhiteSpace(extraction.UserName))
            {
                state.UserName = extraction.UserName;
            }
            else if (playerNames != null && !string.IsNullOrWhiteSpace(state.UserBattleTag))
            {
                var prefix = state.UserBattleTag.Split('#')[0];
                var match = playerNames.FirstOrDefault(n => n.Equals(prefix, StringComparison.OrdinalIgnoreCase));
                if (!string.IsNullOrWhiteSpace(match))
                {
                    state.UserName = match;
                }
            }

            if (!string.IsNullOrWhiteSpace(extraction.OpponentBattleTag))
            {
                state.OpponentBattleTag = extraction.OpponentBattleTag;
            }

            if (!string.IsNullOrWhiteSpace(extraction.OpponentName))
            {
                state.OpponentName = extraction.OpponentName;
            }
            else if (playerNames != null && !string.IsNullOrWhiteSpace(state.UserName))
            {
                var opponentName = playerNames.FirstOrDefault(n =>
                    !n.Equals(state.UserName, StringComparison.OrdinalIgnoreCase));
                if (!string.IsNullOrWhiteSpace(opponentName))
                {
                    state.OpponentName = opponentName;
                }
            }

            if (gameSnapshot?.Players?.Count == 2)
            {
                var p1 = gameSnapshot.Players[0];
                var p2 = gameSnapshot.Players[1];

                if (!string.IsNullOrWhiteSpace(p1.Race) && !string.IsNullOrWhiteSpace(p2.Race))
                {
                    state.Matchup = $"{p1.Race[0]}v{p2.Race[0]}";
                }
            }

            if (!isInGame && !lobbyDetected)
            {
                if (!_lastMatchEndTime.HasValue)
                {
                    _lastMatchEndTime = DateTime.UtcNow;
                }
                else if ((DateTime.UtcNow - _lastMatchEndTime.Value).TotalSeconds > PostGameStickySeconds)
                {
                    ClearMatchData(state);
                }
            }
            else
            {
                _lastMatchEndTime = null;
            }

            state.Timestamp = DateTime.UtcNow;
        }
    }

    private async Task<GameSnapshot?> GetGameSnapshotAsync()
    {
        try
        {
            using var response = await _httpClient.GetAsync("/game");
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            await using var stream = await response.Content.ReadAsStreamAsync();
            return await JsonSerializer.DeserializeAsync<GameSnapshot>(stream, JsonOptions);
        }
        catch
        {
            return null;
        }
    }

    private async Task HandleConfigAsync(HttpContext httpContext)
    {
        var subPath = GetConfigSubPath(httpContext.Request.Path);
        var method = httpContext.Request.Method;

        if (method.Equals("GET", StringComparison.OrdinalIgnoreCase))
        {
            if (string.IsNullOrEmpty(subPath))
            {
                await ServeConfigAssetAsync(httpContext, "config/index.html");
                return;
            }

            if (subPath.Equals("schema", StringComparison.OrdinalIgnoreCase))
            {
                await RespondWithConfigSchemaAsync(httpContext);
                return;
            }

            if (subPath.Equals("value", StringComparison.OrdinalIgnoreCase))
            {
                await RespondWithConfigValuesAsync(httpContext);
                return;
            }

            await ServeConfigAssetAsync(httpContext, $"config/{subPath}");
            return;
        }

        if (method.Equals("POST", StringComparison.OrdinalIgnoreCase) &&
            subPath.Equals("value", StringComparison.OrdinalIgnoreCase))
        {
            await UpdateConfigValuesAsync(httpContext);
            return;
        }

        httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
        await httpContext.Response.WriteAsync("Config resource not found.");
    }

    private bool IsConfigRequest(PathString path)
    {
        var basePath = $"{Route}/config";
        return path.HasValue && path.Value!.StartsWith(basePath, StringComparison.OrdinalIgnoreCase);
    }

    private string GetConfigSubPath(PathString path)
    {
        var basePath = $"{Route}/config";
        var value = path.Value ?? string.Empty;

        if (!value.StartsWith(basePath, StringComparison.OrdinalIgnoreCase))
        {
            return string.Empty;
        }

        if (value.Length == basePath.Length)
        {
            return string.Empty;
        }

        return value.Substring(basePath.Length).TrimStart('/');
    }

    private async Task ServeConfigAssetAsync(HttpContext httpContext, string relativePath)
    {
        var assemblyLocation = Path.GetDirectoryName(GetType().Assembly.Location);
        var sanitizedPath = relativePath.Replace('/', Path.DirectorySeparatorChar);
        if (sanitizedPath.Contains("..", StringComparison.Ordinal))
        {
            httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await httpContext.Response.WriteAsync("Invalid config asset path.");
            return;
        }
        var filePath = Path.Combine(assemblyLocation!, sanitizedPath);

        if (!File.Exists(filePath))
        {
            httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
            await httpContext.Response.WriteAsync($"Config asset not found at: {filePath}");
            return;
        }

        httpContext.Response.ContentType = GetContentType(filePath);
        await httpContext.Response.SendFileAsync(filePath);
    }

    private async Task RespondWithConfigSchemaAsync(HttpContext httpContext)
    {
        var payload = new { sections = GetConfigurationSections() };
        httpContext.Response.ContentType = "application/json";
        await httpContext.Response.WriteAsync(JsonSerializer.Serialize(payload, JsonOptions));
    }

    private async Task RespondWithConfigValuesAsync(HttpContext httpContext)
    {
        httpContext.Response.ContentType = "application/json";
        await httpContext.Response.WriteAsync(JsonSerializer.Serialize(new
        {
            userBattleTag = _config.UserBattleTag,
            lobbyFilePath = _config.LobbyFilePath,
            pollIntervalMs = _config.PollIntervalMs
        }, JsonOptions));
    }

    private async Task UpdateConfigValuesAsync(HttpContext httpContext)
    {
        try
        {
            using var document = await JsonDocument.ParseAsync(httpContext.Request.Body);
            var root = document.RootElement;

            var newBattleTag = root.TryGetProperty("userBattleTag", out var battleTagElement)
                ? battleTagElement.GetString()?.Trim()
                : _config.UserBattleTag;

            if (!string.IsNullOrWhiteSpace(newBattleTag) && !BattleTagRegex.IsMatch(newBattleTag))
            {
                httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
                await httpContext.Response.WriteAsync("BattleTag must look like Name#1234.");
                return;
            }

            _config.UserBattleTag = newBattleTag ?? string.Empty;
            PersistConfig();

            lock (_stateLock)
            {
                State.UserBattleTag = string.IsNullOrWhiteSpace(_config.UserBattleTag) ? null : _config.UserBattleTag;
            }

            httpContext.Response.StatusCode = StatusCodes.Status204NoContent;
        }
        catch (JsonException)
        {
            httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await httpContext.Response.WriteAsync("Invalid JSON payload.");
        }
    }

    private void PersistConfig()
    {
        try
        {
            var directory = Path.GetDirectoryName(_configPath);
            if (!string.IsNullOrEmpty(directory))
            {
                Directory.CreateDirectory(directory);
            }

            var root = new ConfigRoot { Sc2 = _config };
            var json = JsonSerializer.Serialize(root, JsonOptions);
            File.WriteAllText(_configPath, json);
        }
        catch
        {
            // Ignore persistence errors for now
        }
    }

    private static string GetContentType(string filePath)
    {
        return Path.GetExtension(filePath).ToLowerInvariant() switch
        {
            ".html" => "text/html",
            ".css" => "text/css",
            ".js" => "application/javascript",
            ".json" => "application/json",
            ".png" => "image/png",
            ".jpg" => "image/jpeg",
            ".jpeg" => "image/jpeg",
            ".svg" => "image/svg+xml",
            _ => "application/octet-stream"
        };
    }

    private string GetConfigPath()
    {
        var assemblyDir = Path.GetDirectoryName(GetType().Assembly.Location) ?? AppContext.BaseDirectory;
        var configDir = Path.Combine(assemblyDir, "config");
        Directory.CreateDirectory(configDir);
        return Path.Combine(configDir, "config.json");
    }

    private static Sc2BitConfig LoadConfig(string configPath)
    {
        var candidatePaths = new List<string> { configPath };
        var configDirectory = Path.GetDirectoryName(configPath);
        if (!string.IsNullOrWhiteSpace(configDirectory))
        {
            var legacyPath = Path.GetFullPath(Path.Combine(configDirectory, "..", "config.json"));
            if (!legacyPath.Equals(configPath, StringComparison.OrdinalIgnoreCase))
            {
                candidatePaths.Add(legacyPath);
            }
        }

        foreach (var path in candidatePaths)
        {
            if (!File.Exists(path))
            {
                continue;
            }

            try
            {
                var json = File.ReadAllText(path);
                var root = JsonSerializer.Deserialize<ConfigRoot>(json, JsonOptions);
                var parsed = root?.Sc2 ?? JsonSerializer.Deserialize<Sc2BitConfig>(json, JsonOptions) ?? new Sc2BitConfig();

                if (!path.Equals(configPath, StringComparison.OrdinalIgnoreCase))
                {
                    try
                    {
                        Directory.CreateDirectory(Path.GetDirectoryName(configPath)!);
                        File.WriteAllText(configPath, json);
                    }
                    catch
                    {
                        // Ignore migration copy failures
                    }
                }

                return NormalizeConfig(parsed);
            }
            catch
            {
                // Try next candidate
            }
        }

        return NormalizeConfig(new Sc2BitConfig());
    }

    private static Sc2BitConfig NormalizeConfig(Sc2BitConfig config)
    {
        if (string.IsNullOrWhiteSpace(config.UserBattleTag))
        {
            config.UserBattleTag = "XLover#2803";
        }

        if (string.IsNullOrWhiteSpace(config.LobbyFilePath))
        {
            config.LobbyFilePath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "Starcraft II",
                "TempWriteReplayP1",
                "replay.server.battlelobby");
        }

        if (config.PollIntervalMs <= 0)
        {
            config.PollIntervalMs = 250;
        }

        return config;
    }

    private static void ClearState(Sc2BitState state)
    {
        state.ToolState = "Disconnected";
        state.UserBattleTag = null;
        state.UserName = null;
        ClearMatchData(state);
        state.Timestamp = DateTime.UtcNow;
    }

    private static void ClearMatchData(Sc2BitState state)
    {
        state.OpponentBattleTag = null;
        state.OpponentName = null;
        state.Matchup = null;
    }

    ~Sc2Bit()
    {
        StopRunner();
        _httpClient.Dispose();
    }

    private sealed class ConfigRoot
    {
        public Sc2BitConfig? Sc2 { get; set; }
    }

    private sealed class GameSnapshot
    {
        public bool IsInGame { get; set; }
        public List<GamePlayer>? Players { get; set; }
    }

    private sealed class GamePlayer
    {
        public string? Name { get; set; }
        public string? Race { get; set; }
    }
}
