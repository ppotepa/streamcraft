using Bits.Sc2.Messages;
using Bits.Sc2.Panels;
using Bits.Sc2.Parsing;
using Core.Messaging;
using Core.Runners;
using System.Diagnostics;

namespace Bits.Sc2.Runners;

/// <summary>
/// Runner that detects SC2 process, scans lobby file, and updates SessionPanel via message bus.
/// </summary>
public class SessionPanelRunner : Runner<SessionPanel, SessionPanelState>
{
    private readonly TimeSpan _pollInterval;
    private readonly string? _configuredUserBattleTag;
    private readonly IMessageBus _messageBus;
    private DateTime? _lastFileWriteTime;
    private string? _lastToolState;
    private bool _wasLobbyPresent;

    public SessionPanelRunner(int pollIntervalMs, string? configuredUserBattleTag, IMessageBus messageBus)
    {
        _pollInterval = TimeSpan.FromMilliseconds(Math.Max(50, pollIntervalMs));
        _configuredUserBattleTag = string.IsNullOrWhiteSpace(configuredUserBattleTag) ? null : configuredUserBattleTag.Trim();
        _messageBus = messageBus;
    }

    protected override async Task RunAsync(CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                ScanSc2AndLobby();
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

    private void ScanSc2AndLobby()
    {
        if (!IsSc2Running())
        {
            _lastFileWriteTime = null;
            _wasLobbyPresent = false;
            PublishToolState("Sc2ProcessNotFound");
            return;
        }

        var lobbyFilePath = GetLobbyFilePath();
        if (string.IsNullOrWhiteSpace(lobbyFilePath) || !File.Exists(lobbyFilePath))
        {
            _lastFileWriteTime = null;
            _wasLobbyPresent = false;
            PublishToolState("InMenus");
            return;
        }

        if (!_wasLobbyPresent)
        {
            _wasLobbyPresent = true;
        }

        PublishToolState("LobbyDetected");

        var fileInfo = new FileInfo(lobbyFilePath);
        var writeTime = fileInfo.LastWriteTimeUtc;

        if (_lastFileWriteTime == writeTime)
        {
            return;
        }

        _lastFileWriteTime = writeTime;

        var parsed = ParseLobbyFile(lobbyFilePath);
        if (parsed != null)
        {
            _messageBus.Publish(Sc2MessageType.LobbyFileParsed, parsed);
        }
    }

    private void PublishToolState(string state)
    {
        if (string.Equals(_lastToolState, state, StringComparison.Ordinal))
        {
            return;
        }

        _lastToolState = state;
        _messageBus.Publish(Sc2MessageType.ToolStateChanged, state);
    }

    private LobbyParsedData? ParseLobbyFile(string lobbyFilePath)
    {
        var result = LobbyFileParser.ParseLobbyFile(lobbyFilePath);
        if (result == null)
        {
            return null;
        }

        var userBattleTag = result.Player1BattleTag;
        var userName = result.Player1Name;
        var opponentBattleTag = result.Player2BattleTag;
        var opponentName = result.Player2Name;

        // Swap if configured user is player 2
        if (!string.IsNullOrWhiteSpace(_configuredUserBattleTag))
        {
            var config = _configuredUserBattleTag;
            var userIsP2 = string.Equals(result.Player2BattleTag, config, StringComparison.OrdinalIgnoreCase);
            if (userIsP2 && !string.Equals(result.Player1BattleTag, config, StringComparison.OrdinalIgnoreCase))
            {
                userBattleTag = result.Player2BattleTag;
                userName = result.Player2Name;
                opponentBattleTag = result.Player1BattleTag;
                opponentName = result.Player1Name;
            }
        }

        return new LobbyParsedData
        {
            UserBattleTag = userBattleTag,
            UserName = userName,
            OpponentBattleTag = opponentBattleTag,
            OpponentName = opponentName
        };
    }

    private static bool IsSc2Running()
    {
        return Process.GetProcessesByName("SC2").Length > 0 ||
               Process.GetProcessesByName("SC2_x64").Length > 0;
    }

    private static string GetLobbyFilePath()
    {
        var localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        return Path.Combine(localAppData, @"Temp\Starcraft II\TempWriteReplayP1\replay.server.battlelobby");
    }
}
