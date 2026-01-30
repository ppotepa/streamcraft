using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Bits.Sc2.Messages;
using Bits.Sc2.Panels;
using Bits.Sc2.Runners;
using Bits.Sc2.Application.Services;
using Core.Bits;
using Core.Messaging;
using Core.Panels;
using Core.Runners;
using Core.State;
using System.Text.Json;

namespace Bits.Sc2;

[BitRoute("/sc2")]
[HasUserInterface]
[RequiresConfiguration]
public class Sc2Bit : ConfigurableBit<Sc2BitState, Sc2BitConfig>
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
            Context!.Logger);

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
}
