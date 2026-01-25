using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Text.RegularExpressions;
using StreamCraft.Core.Bits;
using StreamCraft.Core.Messaging;
using StreamCraft.Core.Panels;
using StreamCraft.Bits.Sc2.Messaging;
using StreamCraft.Bits.Sc2.Panels;

namespace StreamCraft.Bits.Sc2;

[BitRoute("/sc2")]
[HasUserInterface]
public class Sc2Bit : ConfigurableBit<Sc2BitState, Sc2BitConfig>
{
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
            }),
        new BitConfigurationSection(
            id: "runner-settings",
            title: "Runner Settings",
            description: "Polling interval and lobby file path that the runner watches.",
            fields: new[]
            {
                new BitConfigurationField(
                    key: "lobbyFilePath",
                    label: "Lobby File Path",
                    type: "text",
                    description: "Location of replay.server.battlelobby.",
                    placeholder: "C:/Users/me/AppData/Local/Starcraft II/TempWriteReplayP1/replay.server.battlelobby",
                    required: true),
                new BitConfigurationField(
                    key: "pollIntervalMs",
                    label: "Poll Interval (ms)",
                    type: "number",
                    description: "Minimum 50ms. Larger values reduce CPU usage.",
                    placeholder: "250",
                    defaultValue: "250",
                    required: true,
                    validationPattern: "^[1-9][0-9]{1,4}$")
            })
    };


    private readonly HttpClient _httpClient = new()
    {
        BaseAddress = new Uri("http://localhost:6119")
    };

    private readonly object _stateLock = new();
    private readonly IMessageBus<Sc2MessageType> _messageBus = new MessageBus<Sc2MessageType>();
    private readonly IPanelRegistry _panelRegistry = new PanelRegistry();
    private CancellationTokenSource? _runnerCts;
    private Task? _runnerTask;
    private string _currentToolState = "Disconnected";
    private DateTime? _lastMatchEndTime;
    private const int PostGameStickySeconds = 20;

    public override string Name => "SC2";
    public override string Description => "StarCraft II overlay and statistics";

    protected override void OnInitialize()
    {
        base.OnInitialize();
        InitializePanels();
        StartRunner();
    }

    private void InitializePanels()
    {
        var panels = new IPanel[]
        {
            new SessionPanel(),
            new OpponentPanel(),
            new MatchupPanel(),
            new MapPanel(),
            new MetricPanel()
        };

        foreach (var panel in panels)
        {
            panel.InitializePanel(_messageBus);
            _panelRegistry.RegisterPanel(panel);
        }
    }

    public override IReadOnlyList<BitConfigurationSection> GetConfigurationSections() => ConfigSections;

    protected override async Task HandleBitRequestAsync(HttpContext httpContext)
    {
        // Check if requesting specific panel
        var panelId = GetPanelIdFromPath(httpContext.Request.Path);
        if (!string.IsNullOrEmpty(panelId))
        {
            var panel = _panelRegistry.GetPanel(panelId);
            if (panel != null)
            {
                httpContext.Response.ContentType = "application/json";
                await httpContext.Response.WriteAsync(JsonSerializer.Serialize(panel.GetStateSnapshot(), JsonOptions));
                return;
            }

            httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
            await httpContext.Response.WriteAsync($"Panel '{panelId}' not found.");
            return;
        }

        // Return composite snapshot of all panels
        var composite = _panelRegistry.GetCompositeSnapshot();

        httpContext.Response.ContentType = "application/json";
        await httpContext.Response.WriteAsync(JsonSerializer.Serialize(new
        {
            toolState = _currentToolState,
            timestamp = DateTime.UtcNow.ToString("O"),
            panels = composite
        }, JsonOptions));
    }

    private string? GetPanelIdFromPath(PathString path)
    {
        var value = path.Value ?? string.Empty;
        var routePrefix = Route?.TrimEnd('/') ?? string.Empty;

        if (!value.StartsWith(routePrefix, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var remainder = value.Substring(routePrefix.Length).TrimStart('/');

        // Check if it's /config route
        if (remainder.StartsWith("config", StringComparison.OrdinalIgnoreCase) ||
            remainder.StartsWith("ui", StringComparison.OrdinalIgnoreCase) ||
            string.IsNullOrEmpty(remainder))
        {
            return null;
        }

        // Extract panel name (e.g., /sc2/opponent -> opponent)
        var segments = remainder.Split('/', StringSplitOptions.RemoveEmptyEntries);
        return segments.Length > 0 ? segments[0] : null;
    }

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
        var pollDelay = TimeSpan.FromMilliseconds(Math.Max(100, Configuration.PollIntervalMs));

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
        var lobbyDetected = !string.IsNullOrWhiteSpace(Configuration.LobbyFilePath) && File.Exists(Configuration.LobbyFilePath);
        var gameSnapshot = await GetGameSnapshotAsync();

        // Publish SC2 process state
        if (!sc2Running)
        {
            lock (_stateLock)
            {
                var state = State;
                ClearState(state);
            }

            if (_currentToolState != "Disconnected")
            {
                _currentToolState = "Disconnected";
                _messageBus.Publish(Sc2MessageType.ToolStateChanged, _currentToolState);
            }
            return;
        }

        // Determine tool state
        var isInGame = gameSnapshot?.IsInGame == true;
        var newToolState = isInGame ? "InGame" : (lobbyDetected ? "LobbyDetected" : "InMenus");

        if (_currentToolState != newToolState)
        {
            _currentToolState = newToolState;
            _messageBus.Publish(Sc2MessageType.ToolStateChanged, _currentToolState);
        }

        // Publish game snapshot
        if (gameSnapshot != null)
        {
            _messageBus.Publish(Sc2MessageType.GameSnapshotReceived, new GameSnapshotData
            {
                IsInGame = gameSnapshot.IsInGame,
                Players = gameSnapshot.Players?.Select(p => new GamePlayerData
                {
                    Name = p.Name,
                    Race = p.Race
                }).ToList()
            });
        }

        // Publish lobby file detected
        if (lobbyDetected)
        {
            _messageBus.Publish(Sc2MessageType.LobbyFileDetected, Configuration.LobbyFilePath);

            // Extract tags and publish parsed data
            var playerNames = gameSnapshot?.Players?
                .Select(p => p.Name ?? string.Empty)
                .Where(n => !string.IsNullOrWhiteSpace(n))
                .ToArray();

            var extraction = LobbyTagExtractor.ExtractTags(
                Configuration.LobbyFilePath,
                Configuration.UserBattleTag,
                playerNames);

            var lobbyData = new LobbyParsedData
            {
                UserBattleTag = extraction.UserBattleTag,
                UserName = extraction.UserName,
                OpponentBattleTag = extraction.OpponentBattleTag,
                OpponentName = extraction.OpponentName
            };

            // Infer user name from battle tag if not extracted
            if (string.IsNullOrWhiteSpace(lobbyData.UserName) && !string.IsNullOrWhiteSpace(lobbyData.UserBattleTag))
            {
                var prefix = lobbyData.UserBattleTag.Split('#')[0];
                lobbyData.UserName = playerNames?.FirstOrDefault(n => n.Equals(prefix, StringComparison.OrdinalIgnoreCase));
            }

            // Infer opponent name if not extracted
            if (string.IsNullOrWhiteSpace(lobbyData.OpponentName) && playerNames != null && !string.IsNullOrWhiteSpace(lobbyData.UserName))
            {
                lobbyData.OpponentName = playerNames.FirstOrDefault(n =>
                    !n.Equals(lobbyData.UserName, StringComparison.OrdinalIgnoreCase));
            }

            _messageBus.Publish(Sc2MessageType.LobbyFileParsed, lobbyData);

            // Keep legacy state for backward compatibility (temporary)
            lock (_stateLock)
            {
                var state = State;
                state.ToolState = newToolState;
                state.UserBattleTag = lobbyData.UserBattleTag;
                state.UserName = lobbyData.UserName;
                state.OpponentBattleTag = lobbyData.OpponentBattleTag;
                state.OpponentName = lobbyData.OpponentName;
                state.Timestamp = DateTime.UtcNow;
            }
        }

        // Handle post-game sticky state
        if (!isInGame && !lobbyDetected)
        {
            if (!_lastMatchEndTime.HasValue)
            {
                _lastMatchEndTime = DateTime.UtcNow;
            }
            else if ((DateTime.UtcNow - _lastMatchEndTime.Value).TotalSeconds > PostGameStickySeconds)
            {
                lock (_stateLock)
                {
                    ClearMatchData(State);
                }
            }
        }
        else
        {
            _lastMatchEndTime = null;
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

    protected override IReadOnlyDictionary<string, object?> BuildConfigurationValueMap()
        => new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase)
        {
            ["userBattleTag"] = Configuration.UserBattleTag,
            ["lobbyFilePath"] = Configuration.LobbyFilePath,
            ["pollIntervalMs"] = Configuration.PollIntervalMs
        };

    protected override async Task<bool> OnConfigurationUpdateAsync(JsonElement root)
    {
        var updated = false;

        if (root.TryGetProperty("userBattleTag", out var battleTagElement))
        {
            var newBattleTag = battleTagElement.GetString()?.Trim() ?? string.Empty;
            if (!string.IsNullOrWhiteSpace(newBattleTag) && !BattleTagRegex.IsMatch(newBattleTag))
            {
                throw new ArgumentException("BattleTag must look like Name#1234.");
            }

            if (!string.Equals(Configuration.UserBattleTag, newBattleTag, StringComparison.Ordinal))
            {
                Configuration.UserBattleTag = newBattleTag;
                updated = true;
            }
        }

        if (root.TryGetProperty("lobbyFilePath", out var lobbyFilePathElement))
        {
            var newLobbyPath = lobbyFilePathElement.GetString()?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(newLobbyPath))
            {
                throw new ArgumentException("Lobby file path is required.");
            }

            if (!string.Equals(Configuration.LobbyFilePath, newLobbyPath, StringComparison.OrdinalIgnoreCase))
            {
                Configuration.LobbyFilePath = newLobbyPath;
                updated = true;
            }
        }

        if (root.TryGetProperty("pollIntervalMs", out var pollIntervalElement))
        {
            var pollInterval = TryParseInt(pollIntervalElement);
            if (!pollInterval.HasValue || pollInterval.Value < 50)
            {
                throw new ArgumentException("Poll interval must be at least 50 milliseconds.");
            }

            if (Configuration.PollIntervalMs != pollInterval.Value)
            {
                Configuration.PollIntervalMs = pollInterval.Value;
                updated = true;
            }
        }

        return updated;
    }

    protected override Task OnConfigurationPersistedAsync()
    {
        lock (_stateLock)
        {
            State.UserBattleTag = string.IsNullOrWhiteSpace(Configuration.UserBattleTag) ? null : Configuration.UserBattleTag;
        }
        return Task.CompletedTask;
    }

    protected override Sc2BitConfig DeserializeConfiguration(string json)
    {
        var root = JsonSerializer.Deserialize<ConfigRoot>(json, JsonOptions);
        return root?.Sc2 ?? JsonSerializer.Deserialize<Sc2BitConfig>(json, JsonOptions) ?? new Sc2BitConfig();
    }

    protected override Sc2BitConfig CreateDefaultConfiguration()
    {
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
