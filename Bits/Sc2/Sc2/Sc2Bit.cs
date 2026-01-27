using Microsoft.AspNetCore.Http;
using Bits.Sc2.Messages;
using Bits.Sc2.Panels;
using Bits.Sc2.Runners;
using Core.Bits;
using Core.Messaging;
using Core.Panels;
using Core.Runners;
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
    private readonly MessageBus _messageBus = new();
    private readonly PanelRegistry _panelRegistry = new();
    private readonly RunnerRegistry _runnerRegistry = new();
    private bool _runtimeInitialized;
    private SessionPanel? _sessionPanel;

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

        var stateSnapshot = new
        {
            panels = _panelRegistry.GetCompositeSnapshot(),
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

        return Task.FromResult(updated);
    }

    protected override Task OnConfigurationPersistedAsync()
    {
        ReconfigureRunners();
        return Task.CompletedTask;
    }

    protected override void OnInitialize()
    {
        base.OnInitialize();
        EnsureRuntimeInitialized();
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
        _sessionPanel.Initialize(_messageBus);
        _panelRegistry.RegisterPanel(_sessionPanel);

        var opponentPanel = new OpponentPanel();
        opponentPanel.Initialize(_messageBus);
        _panelRegistry.RegisterPanel(opponentPanel);

        var metricPanel = new MetricPanel();
        metricPanel.Initialize(_messageBus);
        _panelRegistry.RegisterPanel(metricPanel);

        var mapPanel = new MapPanel();
        mapPanel.Initialize(_messageBus);
        _panelRegistry.RegisterPanel(mapPanel);

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
            _messageBus);

        sessionRunner.Initialize(_sessionPanel);
        _runnerRegistry.RegisterRunner(sessionRunner);

        // Add game data runner to fetch race information from SC2 Client API
        var gameDataRunner = new GameDataRunner(Configuration.PollIntervalMs, _messageBus);
        gameDataRunner.Start();

        // Add opponent data runner (not a traditional runner, just start it)
        var opponentDataRunner = new OpponentDataRunner(_messageBus);
        opponentDataRunner.Start();

        // Add player data runner (fetches current user's stats)
        var playerDataRunner = new PlayerDataRunner(_messageBus, Configuration.GetEffectiveBattleTag());
        playerDataRunner.Start();

        _runnerRegistry.StartAll();
    }

    private void ReconfigureRunners()
    {
        EnsureRuntimeInitialized();
        lock (_initLock)
        {
            _runnerRegistry.StopAll();
            _runnerRegistry.Clear();
            InitializeRunners();
        }
    }
}
