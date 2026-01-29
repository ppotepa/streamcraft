using Bits.Sc2.Messages;
using Core.Messaging;
using System.Net.Http;
using System.Text.Json;

namespace Bits.Sc2.Runners;

/// <summary>
/// Runner that fetches game data from SC2 Client API (localhost:6119/game) to enrich lobby data with race information.
/// This is not a traditional Runner as it doesn't target a specific panel.
/// </summary>
public class GameDataRunner : IDisposable
{
    private readonly TimeSpan _pollInterval;
    private readonly IMessageBus _messageBus;
    private readonly HttpClient _httpClient;
    private bool _gameInProgress = false;
    private string? _lastOpponentBattleTag;
    private CancellationTokenSource? _cts;
    private Task? _backgroundTask;

    public GameDataRunner(int pollIntervalMs, IMessageBus messageBus)
    {
        _pollInterval = TimeSpan.FromMilliseconds(Math.Max(500, pollIntervalMs));
        _messageBus = messageBus;
        _httpClient = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(2)
        };

        // Subscribe to tool state changes to know when games start/end
        _messageBus.Subscribe<string>(Sc2MessageType.ToolStateChanged, OnToolStateChanged);
        _messageBus.Subscribe<LobbyParsedData>(Sc2MessageType.LobbyFileParsed, OnLobbyParsed);
    }

    public void Start()
    {
        if (_backgroundTask != null) return;

        _cts = new CancellationTokenSource();
        _backgroundTask = Task.Run(async () => await RunAsync(_cts.Token), _cts.Token);
    }

    public void Stop()
    {
        _cts?.Cancel();
        _backgroundTask?.Wait(TimeSpan.FromSeconds(5));
        _backgroundTask = null;
    }

    private async Task RunAsync(CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                if (_gameInProgress)
                {
                    await FetchAndPublishGameData();
                }
            }
            catch
            {
                // Swallow errors to keep runner alive
            }

            try
            {
                await Task.Delay(_pollInterval, cancellationToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    private void OnToolStateChanged(string state)
    {
        _gameInProgress = state == "LobbyDetected";
    }

    private void OnLobbyParsed(LobbyParsedData data)
    {
        _lastOpponentBattleTag = data.OpponentBattleTag;
    }

    private async Task FetchAndPublishGameData()
    {
        try
        {
            var response = await _httpClient.GetAsync("http://localhost:6119/game");
            if (!response.IsSuccessStatusCode)
                return;

            var json = await response.Content.ReadAsStringAsync();
            var gameData = JsonSerializer.Deserialize<GameDataResponse>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (gameData?.Players == null || gameData.Players.Length < 2)
                return;

            // Find which player is the opponent
            var opponent = gameData.Players.FirstOrDefault(p =>
                !string.IsNullOrWhiteSpace(_lastOpponentBattleTag) &&
                p.Name?.Contains(_lastOpponentBattleTag.Split('#')[0], StringComparison.OrdinalIgnoreCase) == true);

            var user = gameData.Players.FirstOrDefault(p => p.Id != opponent?.Id);

            if (opponent == null || user == null)
            {
                // Fall back to assuming player 1 is one and player 2 is the other
                user = gameData.Players[0];
                opponent = gameData.Players[1];
            }

            // Publish enriched lobby data with race information
            var enrichedData = new LobbyParsedData
            {
                UserBattleTag = _lastOpponentBattleTag, // This will be fixed by SessionPanelRunner
                UserRace = NormalizeRace(user.Race),
                OpponentRace = NormalizeRace(opponent.Race),
                OpponentName = opponent.Name,
                GameTime = gameData.DisplayTime
            };

            _messageBus.Publish(Sc2MessageType.GameDataReceived, enrichedData);
        }
        catch
        {
            // Silently fail if API is unavailable
        }
    }

    private static string? NormalizeRace(string? race)
    {
        if (string.IsNullOrWhiteSpace(race))
            return null;

        // SC2 Client API returns "Terr", "Prot", "Zerg"
        return race.ToUpperInvariant() switch
        {
            "TERR" => "TERRAN",
            "PROT" => "PROTOSS",
            _ => race.ToUpperInvariant()
        };
    }

    private class GameDataResponse
    {
        public bool IsReplay { get; set; }
        public double DisplayTime { get; set; }
        public PlayerInfo[]? Players { get; set; }
    }

    private class PlayerInfo
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public string? Type { get; set; }
        public string? Race { get; set; }
        public string? Result { get; set; }
    }

    public void Dispose()
    {
        Stop();
        _httpClient?.Dispose();
        _cts?.Dispose();
    }
}
