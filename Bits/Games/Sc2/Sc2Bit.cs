using Bits.Sc2.Application.Services;
using Bits.Sc2.Panels;
using Bits.Sc2.Runners;
using Core.Bits;
using Core.Messaging;
using Core.Panels;
using Core.Runners;
using Core.State;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Sc2GameDataClient;
using System.Diagnostics;
using System.Text.Json;

namespace Bits.Sc2;

[BitRoute("/sc2")]
[HasUserInterface]
[RequiresConfiguration]
public class Sc2Bit : ConfigurableBit<Sc2BitState, Sc2BitConfig>, IBitDebugProvider
{
    public override string Name => "SC2";
    public override string Description => "StarCraft II overlay and statistics";

    private readonly object _initLock = new();
    private IMessageBus? _messageBus;
    private PanelRegistry? _panelRegistry;
    private IRunnerRegistry? _runnerRegistry;
    private bool _runtimeInitialized;
    private SessionPanel? _sessionPanel;
    private ISSPanel? _issPanel;
    private ISc2RuntimeConfig? _runtimeConfig;
    // VitalsRunner removed - now using VitalsBackgroundService via DI

    public override IReadOnlyList<BitConfigurationSection> GetConfigurationSections()
    {
        return new[]
        {
            new BitConfigurationSection(
                id: "general",
                title: "General Settings",
                description: "Configure your StarCraft II integration",
                fields: new[]
                {
                    new BitConfigurationField(
                        key: "BattleTag",
                        label: "Battle Tag",
                        type: "text",
                        description: "Your Battle.net BattleTag (e.g., Player#1234)",
                        placeholder: "Player#1234",
                        required: true,
                        validationPattern: @"^[A-Za-z0-9]{3,16}#\d{4,5}$"
                    ),
                    new BitConfigurationField(
                        key: "ApiProvider",
                        label: "Data Provider",
                        type: "text",
                        description: "Choose data source: sc2pulse | blizzard",
                        defaultValue: Sc2ApiProviders.Sc2Pulse,
                        required: false
                    ),
                    new BitConfigurationField(
                        key: "PollIntervalMs",
                        label: "Poll Interval (ms)",
                        type: "number",
                        description: "How often to check lobby file for changes",
                        defaultValue: "250",
                        required: false
                    )
                })
        };
    }

    protected override async Task HandleBitRequestAsync(HttpContext httpContext)
    {
        EnsureRuntimeInitialized();

        var snapshot = StateStore?.GetSnapshot() ?? State;
        var panels = BuildPanelSnapshot(snapshot);

        var stateSnapshot = new
        {
            panels = panels,
            timestamp = DateTime.UtcNow
        };

        httpContext.Response.ContentType = "application/json";
        await httpContext.Response.WriteAsync(JsonSerializer.Serialize(stateSnapshot, new JsonSerializerOptions { WriteIndented = true }));
    }

    protected override IReadOnlyDictionary<string, object?> BuildConfigurationValueMap()
    {
        return new Dictionary<string, object?>
        {
            ["BattleTag"] = Configuration.BattleTag,
            ["ApiProvider"] = Configuration.ApiProvider,
            ["PollIntervalMs"] = Configuration.PollIntervalMs
        };
    }

    protected override Task<bool> OnConfigurationUpdateAsync(JsonElement root)
    {
        var updated = false;

        if (root.TryGetProperty("BattleTag", out var battleTag) && battleTag.ValueKind == JsonValueKind.String)
        {
            Configuration.BattleTag = battleTag.GetString();
            updated = true;
        }

        if (root.TryGetProperty("PollIntervalMs", out var pollIntervalMs))
        {
            var interval = TryParseInt(pollIntervalMs);
            if (interval.HasValue)
            {
                Configuration.PollIntervalMs = interval.Value;
                updated = true;
            }
        }

        if (root.TryGetProperty("ApiProvider", out var apiProvider) && apiProvider.ValueKind == JsonValueKind.String)
        {
            var provider = apiProvider.GetString();
            if (!string.IsNullOrWhiteSpace(provider))
            {
                Configuration.ApiProvider = provider.Trim();
                updated = true;
            }
        }

        return Task.FromResult(updated);
    }

    protected override Task OnConfigurationPersistedAsync()
    {
        _runtimeConfig?.Update(Configuration);
        ReconfigureRunners();
        return Task.CompletedTask;
    }

    protected override void OnInitialize()
    {
        base.OnInitialize();

        // Get shared services from context
        _messageBus = Context!.MessageBus;
        _panelRegistry = new PanelRegistry();
        _panelRegistry.PanelUpdated += _ => UpdatePanelsSnapshot();
        _runnerRegistry = Context!.ServiceProvider.GetRequiredService<IRunnerRegistry>();
        _runtimeConfig = Context!.ServiceProvider.GetRequiredService<ISc2RuntimeConfig>();
        _runtimeConfig.Update(Configuration);

        EnsureRuntimeInitialized();
    }

    protected override IBitStateStore<Sc2BitState> CreateStateStore()
    {
        return new BitStateStore<Sc2BitState>(
            State,
            state => new Sc2BitState
            {
                HeartRate = state.HeartRate,
                HeartRateTimestamp = state.HeartRateTimestamp,
                HeartRateHasSignal = state.HeartRateHasSignal,
                PanelsUpdatedAt = state.PanelsUpdatedAt,
                Panels = new Dictionary<string, object>(state.Panels, StringComparer.OrdinalIgnoreCase)
            },
            Context?.Logger);
    }

    private void EnsureRuntimeInitialized()
    {
        if (_runtimeInitialized)
        {
            return;
        }

        lock (_initLock)
        {
            if (_runtimeInitialized)
            {
                return;
            }

            InitializePanels();
            InitializeRunners();
            _runtimeInitialized = true;
        }
    }

    private void InitializePanels()
    {
        _sessionPanel = new SessionPanel();
        _sessionPanel.Initialize(_messageBus!);
        _panelRegistry!.RegisterPanel(_sessionPanel);

        var opponentPanel = new OpponentPanel();
        opponentPanel.Initialize(_messageBus!);
        _panelRegistry.RegisterPanel(opponentPanel);

        var metricPanel = new MetricPanel();
        metricPanel.Initialize(_messageBus!);
        _panelRegistry.RegisterPanel(metricPanel);

        _issPanel = new ISSPanel();
        _issPanel.Initialize(_messageBus!);
        _panelRegistry.RegisterPanel(_issPanel);

        UpdatePanelsSnapshot();
    }

    private void InitializeRunners()
    {
        if (_sessionPanel == null)
        {
            return;
        }

        var sessionRunner = new SessionPanelRunner(
            Configuration.PollIntervalMs,
            Configuration.GetEffectiveBattleTag(),
            _messageBus!,
            Context!.Logger,
            Context!.ServiceProvider.GetRequiredService<Bits.Sc2.Application.Services.ISc2ProcessWatcher>(),
            Context!.ServiceProvider.GetRequiredService<Bits.Sc2.Application.Services.ILobbyFileWatcher>(),
            Context!.ServiceProvider.GetRequiredService<Bits.Sc2.Application.Services.ILobbyParserService>(),
            Context!.ServiceProvider.GetRequiredService<Bits.Sc2.Application.Services.IToolStatePublisher>(),
            Context!.ServiceProvider.GetRequiredService<Microsoft.Extensions.Options.IOptions<Bits.Sc2.Configuration.Sc2RuntimeOptions>>());

        sessionRunner.Initialize(_sessionPanel);
        _runnerRegistry!.RegisterRunner(sessionRunner);

        // Add ISS panel runner (fetches ISS position and crew data)
        if (_issPanel != null)
        {
            var issRunner = new ISSPanelRunner(_messageBus!, new HttpClient(), Context!.Logger);
            issRunner.Initialize(_issPanel);
            _runnerRegistry.RegisterRunner(issRunner);
        }

        // VitalsRunner removed - now using VitalsBackgroundService via DI
        // The background service automatically starts and monitors heart rate

    }

    private void ReconfigureRunners()
    {
        EnsureRuntimeInitialized();
        lock (_initLock)
        {
            // Stop and clear existing runners
            _runnerRegistry!.StopAll();
            _runnerRegistry.Clear();

            // Reinitialize runners with new configuration
            InitializeRunners();
            _runnerRegistry.StartAll();
        }
    }

    private Dictionary<string, object> BuildPanelSnapshot(Sc2BitState snapshot)
    {
        var panels = snapshot.Panels != null && snapshot.Panels.Count > 0
            ? new Dictionary<string, object>(snapshot.Panels, StringComparer.OrdinalIgnoreCase)
            : _panelRegistry?.GetCompositeSnapshot() as Dictionary<string, object>
              ?? new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);

        panels["metric"] = new
        {
            value = snapshot.HeartRate,
            timestampUtc = snapshot.HeartRateTimestamp?.ToString("O"),
            units = "bpm",
            hasSignal = snapshot.HeartRateHasSignal
        };

        return panels;
    }

    private void UpdatePanelsSnapshot()
    {
        if (StateStore == null || _panelRegistry == null)
        {
            return;
        }

        var snapshot = StateStore.GetSnapshot();
        var panels = _panelRegistry.GetCompositeSnapshot() as Dictionary<string, object>
                     ?? new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);

        panels["metric"] = new
        {
            value = snapshot.HeartRate,
            timestampUtc = snapshot.HeartRateTimestamp?.ToString("O"),
            units = "bpm",
            hasSignal = snapshot.HeartRateHasSignal
        };

        StateStore.Update(state =>
        {
            state.Panels = panels;
            state.PanelsUpdatedAt = DateTime.UtcNow;
        });
    }

    private async Task HandleDebugRequestAsync(HttpContext httpContext)
    {
        var snapshot = StateStore?.GetSnapshot() ?? State;
        var panelsSnapshot = BuildPanelSnapshot(snapshot);
        var panelsDiagnostics = _panelRegistry?.GetAllPanels()
            .Select(panel => (object)new
            {
                id = panel.Id,
                type = panel.Type,
                lastUpdatedUtc = panel.LastUpdated
            })
            .ToList() ?? new List<object>();

        object? stateDiagnostics = null;
        if (StateStore is IBitStateStoreDiagnostics diagnostics)
        {
            stateDiagnostics = new
            {
                subscriberCount = diagnostics.SubscriberCount,
                pendingUpdates = diagnostics.PendingUpdates,
                lastUpdatedUtc = diagnostics.LastUpdatedUtc == DateTime.MinValue
                    ? (DateTime?)null
                    : diagnostics.LastUpdatedUtc
            };
        }

        var runtimeConfig = _runtimeConfig;
        var provider = runtimeConfig?.ApiProvider ?? Configuration.ApiProvider;

        var blizzardOptions = Context?.ServiceProvider.GetService<IOptions<Sc2GameDataClientOptions>>()?.Value;
        object? blizzardConfig = null;
        if (blizzardOptions != null)
        {
            blizzardConfig = new
            {
                region = blizzardOptions.Region,
                locale = blizzardOptions.Locale,
                regionId = blizzardOptions.RegionId,
                realmId = blizzardOptions.RealmId,
                profileId = blizzardOptions.ProfileId,
                accountId = blizzardOptions.AccountId,
                defaultBattleTag = blizzardOptions.DefaultBattleTag,
                useChinaGateway = blizzardOptions.UseChinaGateway,
                hasClientId = !string.IsNullOrWhiteSpace(blizzardOptions.ClientId),
                hasClientSecret = !string.IsNullOrWhiteSpace(blizzardOptions.ClientSecret)
            };
        }

        var payload = new
        {
            timestampUtc = DateTime.UtcNow,
            bit = new
            {
                name = Name,
                route = Route,
                description = Description,
                hasUi = HasUserInterface,
                runtimeInitialized = _runtimeInitialized
            },
            engine = new
            {
                startTimeUtc = Context?.EngineState.StartTime,
                uptimeSeconds = (DateTime.UtcNow - (Context?.EngineState.StartTime ?? DateTime.UtcNow)).TotalSeconds
            },
            config = new
            {
                battleTag = Configuration.BattleTag,
                pollIntervalMs = Configuration.PollIntervalMs,
                apiProvider = Configuration.ApiProvider
            },
            runtime = new
            {
                battleTag = runtimeConfig?.BattleTag,
                pollIntervalMs = runtimeConfig?.PollIntervalMs,
                apiProvider = provider
            },
            sc2 = new
            {
                processDetected = IsSc2ProcessRunning(),
                lobbyFilePath = GetLobbyFilePath(),
                lobbyFileExists = File.Exists(GetLobbyFilePath()),
                lobbyFileLastWriteUtc = GetLobbyFileLastWriteUtc()
            },
            providers = new
            {
                active = provider,
                blizzard = blizzardConfig
            },
            panels = new
            {
                diagnostics = panelsDiagnostics,
                snapshot = panelsSnapshot,
                lastUpdatedUtc = snapshot.PanelsUpdatedAt
            },
            stateStore = stateDiagnostics,
            runners = _runnerRegistry?.GetAllRunners()
                .Where(runner => runner.GetType().Namespace?.StartsWith("Bits.Sc2", StringComparison.Ordinal) == true)
                .Select(runner => (object)new
                {
                    name = runner.Name,
                    type = runner.GetType().FullName,
                    isRunning = runner.IsRunning
                })
                .ToList() ?? new List<object>()
        };

        httpContext.Response.ContentType = "application/json";
        await httpContext.Response.WriteAsync(JsonSerializer.Serialize(payload, new JsonSerializerOptions { WriteIndented = true }));
    }

    public Task HandleDebugAsync(HttpContext httpContext)
    {
        return HandleDebugRequestAsync(httpContext);
    }

    private static bool IsSc2ProcessRunning()
    {
        return Process.GetProcessesByName("SC2").Length > 0 ||
               Process.GetProcessesByName("SC2_x64").Length > 0;
    }

    private static string GetLobbyFilePath()
    {
        var localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        return Path.Combine(localAppData, @"Temp\Starcraft II\TempWriteReplayP1\replay.server.battlelobby");
    }

    private static DateTime? GetLobbyFileLastWriteUtc()
    {
        var path = GetLobbyFilePath();
        if (!File.Exists(path))
        {
            return null;
        }

        return new FileInfo(path).LastWriteTimeUtc;
    }
}
