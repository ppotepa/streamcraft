using Bits.Sc2.Application.Services;
using Bits.Sc2.Configuration;
using Bits.Sc2.Messages;
using Bits.Sc2.Panels;
using Core.Diagnostics;
using Core.IO;
using Core.Messaging;
using Core.Runners;
using Microsoft.Extensions.Options;
using Serilog;
using Core.Diagnostics.ProcessEvents;

namespace Bits.Sc2.Runners;

/// <summary>
/// Runner that detects SC2 process, scans lobby file, and updates SessionPanel via message bus.
/// </summary>
public class SessionPanelRunner : Runner<SessionPanel, SessionPanelState>
{
    private readonly Sc2RuntimeOptions _options;
    private readonly IMessageBus _messageBus;
    private readonly ILogger _logger;
    private readonly ISc2ProcessWatcher _processWatcher;
    private readonly ILobbyFileWatcher _lobbyWatcher;
    private readonly ILobbyParserService _parser;
    private readonly IToolStatePublisher _toolStatePublisher;
    private readonly object _scanLock = new();
    private DateTime? _lastFileWriteTime;
    private bool _wasLobbyPresent;
    private bool _isSc2Running;

    public SessionPanelRunner(
        int pollIntervalMs,
        string? configuredUserBattleTag,
        IMessageBus messageBus,
        ILogger logger,
        ISc2ProcessWatcher processWatcher,
        ILobbyFileWatcher lobbyWatcher,
        ILobbyParserService parser,
        IToolStatePublisher toolStatePublisher,
        IOptions<Sc2RuntimeOptions> options)
    {
        _options = options?.Value ?? new Sc2RuntimeOptions { PollIntervalMs = pollIntervalMs };
        _messageBus = messageBus;
        _logger = logger.ForContext<SessionPanelRunner>();
        _processWatcher = processWatcher;
        _lobbyWatcher = lobbyWatcher;
        _parser = parser;
        _toolStatePublisher = toolStatePublisher;

        _logger = _logger.ForContext("ConfiguredBattleTag", configuredUserBattleTag ?? "(none)");
    }

    protected override async Task RunAsync(CancellationToken cancellationToken)
    {
        _logger.Information("SessionPanelRunner starting with poll interval: {PollIntervalMs}ms",
            _options.PollIntervalMs);

        await _processWatcher.StartAsync(cancellationToken);

        try
        {
            await _lobbyWatcher.StartAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.Warning(ex, "Directory watcher unavailable; falling back to polling.");
        }

        var processTask = MonitorProcessAsync(cancellationToken);
        var eventTask = _lobbyWatcher != null
            ? ConsumeEventsAsync(_lobbyWatcher, cancellationToken)
            : PollLobbyAsync(cancellationToken);

        await Task.WhenAll(processTask, eventTask);

        _logger.Information("SessionPanelRunner stopped");
    }

    private async Task MonitorProcessAsync(CancellationToken cancellationToken)
    {
        await foreach (var change in _processWatcher.WatchAsync(cancellationToken))
        {
            if (change.Kind == ProcessChangeKind.Started)
            {
                _isSc2Running = true;
                HandleSc2Started();
            }
            else
            {
                _isSc2Running = false;
                HandleSc2Stopped();
            }
        }
    }

    private async Task ConsumeEventsAsync(ILobbyFileWatcher watcher, CancellationToken cancellationToken)
    {
        await foreach (var change in watcher.WatchAsync(cancellationToken))
        {
            if (change.Kind == FileChangeKind.Overflow)
            {
                HandleOverflow();
                continue;
            }

            if (IsLobbyFile(change.Path))
            {
                if (change.Kind == FileChangeKind.Deleted)
                {
                    HandleLobbyMissing();
                    continue;
                }

                if (change.Kind == FileChangeKind.Renamed &&
                    !string.IsNullOrWhiteSpace(change.OldPath) &&
                    IsLobbyFile(change.OldPath) &&
                    !IsLobbyFile(change.Path))
                {
                    HandleLobbyMissing();
                    continue;
                }

                HandleLobbyFileChanged(change.Path);
            }
        }
    }

    private async Task PollLobbyAsync(CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                ScanSc2AndLobby();
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Error during SC2 lobby scan");
            }

            try
            {
                await Task.Delay(TimeSpan.FromMilliseconds(Math.Max(50, _options.PollIntervalMs)), cancellationToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    private void ScanSc2AndLobby()
    {
        if (!_isSc2Running)
        {
            return;
        }

        var lobbyFilePath = _lobbyWatcher.GetCurrentLobbyPath();
        _logger.Debug("Lobby file path: {LobbyFilePath}", lobbyFilePath ?? "(null)");

        if (string.IsNullOrWhiteSpace(lobbyFilePath) || !File.Exists(lobbyFilePath))
        {
            HandleLobbyMissing();
            return;
        }

        HandleLobbyFileChanged(lobbyFilePath);
    }

    private void HandleSc2Started()
    {
        _logger.Debug("SC2 process detected");
        var lobbyFilePath = _lobbyWatcher.GetCurrentLobbyPath();
        if (!string.IsNullOrWhiteSpace(lobbyFilePath) && File.Exists(lobbyFilePath))
        {
            HandleLobbyFileChanged(lobbyFilePath);
        }
        else
        {
            _toolStatePublisher.Publish(Sc2ToolState.InMenus);
        }
    }

    private void HandleSc2Stopped()
    {
        lock (_scanLock)
        {
            _lastFileWriteTime = null;
            _wasLobbyPresent = false;
        }
        _toolStatePublisher.Publish(Sc2ToolState.Sc2ProcessNotFound);
    }

    private void HandleLobbyMissing()
    {
        lock (_scanLock)
        {
            _lastFileWriteTime = null;
            if (_wasLobbyPresent)
            {
                _logger.Debug("Lobby file disappeared - player in menus");
            }
            _wasLobbyPresent = false;
        }
        _toolStatePublisher.Publish(Sc2ToolState.InMenus);
    }

    private void HandleOverflow()
    {
        _logger.Warning("Lobby directory watcher overflow; reconciling state.");
        var lobbyFilePath = _lobbyWatcher.GetCurrentLobbyPath();
        if (!string.IsNullOrWhiteSpace(lobbyFilePath) && File.Exists(lobbyFilePath))
        {
            HandleLobbyFileChanged(lobbyFilePath);
        }
        else
        {
            HandleLobbyMissing();
        }
    }

    private void HandleLobbyFileChanged(string lobbyFilePath)
    {
        if (!_isSc2Running)
        {
            return;
        }

        if (!File.Exists(lobbyFilePath))
        {
            HandleLobbyMissing();
            return;
        }

        lock (_scanLock)
        {
            var fileInfo = new FileInfo(lobbyFilePath);
            var writeTime = fileInfo.LastWriteTimeUtc;
            if (_lastFileWriteTime == writeTime)
            {
                return;
            }

            _lastFileWriteTime = writeTime;

            bool isFirstDetection = !_wasLobbyPresent;
            if (isFirstDetection)
            {
                _wasLobbyPresent = true;
                _logger.Information("Lobby file detected for first time at {FilePath} - forcing initial parse", lobbyFilePath);
            }

            _toolStatePublisher.Publish(Sc2ToolState.LobbyDetected);

            string parseReason = isFirstDetection ? "initial" : "changed";
            _logger.Information("Lobby file {ParseReason}, parsing...", parseReason);

            var parsed = _parser.Parse(lobbyFilePath);
            if (parsed != null)
            {
                _logger.Information("Publishing LobbyParsedData - User: {UserTag}, Opponent: {OpponentTag}",
                    parsed.UserBattleTag, parsed.OpponentBattleTag);
                _messageBus.Publish(Sc2MessageType.LobbyFileParsed, parsed);
            }
            else
            {
                _logger.Warning("Failed to parse lobby file at {FilePath}", lobbyFilePath);
            }
        }
    }

    private bool IsLobbyFile(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return false;
        }

        var expected = _lobbyWatcher.GetCurrentLobbyPath();
        return expected != null && string.Equals(path, expected, StringComparison.OrdinalIgnoreCase);
    }
}
