# StreamCraft Architecture Documentation

## Overview

**StreamCraft** is a modular, plugin-based real-time streaming overlay system designed for content creators who want to display live game data, statistics, and interactive information in their broadcast overlays. Built on ASP.NET Core with a sophisticated plugin architecture, StreamCraft enables streamers to enhance their content by providing viewers with rich, contextual information about ongoing gameplay without requiring manual intervention or complex integrations.

At its core, StreamCraft is a **microservice hosting platform** that dynamically discovers, loads, and runs game-specific plugins (called "Bits") which expose HTTP endpoints and browser-renderable UI components. These Bits monitor game state, aggregate statistics, and serve data through clean REST APIs that can be consumed by OBS browser sources, stream overlays, or standalone web applications.

## The Problem StreamCraft Solves

Modern game streamers face a significant challenge: providing viewers with contextual information about gameplay in real-time. Traditional streaming shows only the game video and commentary, leaving viewers without insights into:

- Player statistics and rankings
- Opponent information and match history
- Real-time game metrics and performance data
- Match outcomes and win/loss records
- Contextual information about maps, strategies, or meta-game elements

StreamCraft solves this by **bridging the gap between game data and broadcast overlays**. It monitors game files, network traffic, APIs, or other data sources to extract meaningful information and presents it through a unified HTTP interface that can be consumed by any browser-based overlay system.

## What StreamCraft Does

StreamCraft performs several critical functions:

### 1. **Plugin Discovery and Loading**
On startup, StreamCraft scans a designated `Bits` folder and dynamically loads all discovered plugin assemblies. Each plugin is a self-contained .NET DLL that implements the StreamBit interface. The engine uses reflection to:
- Identify classes that inherit from `StreamBit<TState>`
- Instantiate bit instances
- Register their HTTP routes
- Initialize their internal state machines

### 2. **HTTP Endpoint Hosting**
StreamCraft runs an embedded ASP.NET Core web server (default: `http://localhost:5000`) and automatically registers routes for each loaded bit. For example, a StarCraft II bit might register:
- `/sc2` - Main data endpoint returning current state as JSON
- `/sc2/ui` - Browser-accessible overlay interface
- `/sc2/config` - Configuration management interface

### 3. **Real-Time Data Aggregation**
Each bit runs background tasks (runners) that continuously monitor data sources:
- File system watchers for game log files
- Polling loops for network APIs
- Memory readers for in-game state
- Database queries for historical statistics

This data is processed, validated, and aggregated into panel state objects that are exposed through HTTP endpoints.

### 4. **Browser-Renderable Overlays**
Bits can include pre-built UI components (typically React, Vue, or Solid.js applications) that are served as static assets. These UIs connect to the bit's data endpoints and render live-updating overlays suitable for OBS browser sources. Streamers simply add a browser source pointing to `http://localhost:5000/sc2/ui` and the overlay appears in their stream.

### 5. **Configuration Management**
StreamCraft provides a built-in configuration system where bits can define their settings schema (file paths, API keys, user identifiers) and persist them to `appsettings.json`. The `/config` endpoint provides a web-based interface for users to configure each bit without editing JSON files manually.

## Core Architectural Components

### **Bits: The Plugin System**

A **Bit** is StreamCraft's fundamental plugin unit. Each bit represents a complete integration for a specific game, service, or data source. Bits are self-contained C# class libraries that:

- **Inherit from `StreamBit<TState>`** where `TState` is a class defining the bit's internal state structure
- **Define HTTP routes** using the `[BitRoute("/path")]` attribute
- **Implement `HandleAsync(HttpContext)`** to serve JSON data at their primary endpoint
- **Optionally implement `HandleUIAsync(HttpContext)`** to serve browser-based UI assets
- **Can be configurable** by inheriting from `ConfigurableBit<TState, TConfig>` to expose settings

**Example Bit Structure:**
```csharp
[BitRoute("/sc2")]
[HasUserInterface]
[RequiresConfiguration]
public class Sc2Bit : ConfigurableBit<Sc2BitState, Sc2BitConfig>
{
    public override string Name => "SC2";
    public override string Description => "StarCraft II overlay and statistics";

    protected override async Task HandleBitRequestAsync(HttpContext httpContext)
    {
        // Serialize and return current state as JSON
        var snapshot = BuildStateSnapshot();
        await httpContext.Response.WriteAsJsonAsync(snapshot);
    }
}
```

Bits exist as standalone DLL files in the `Bits` folder and are loaded at runtime. This design enables:
- **Hot-swappable plugins** - Add new game support by dropping in a DLL
- **Version isolation** - Each bit manages its own dependencies
- **Community extensions** - Third parties can develop and distribute bits
- **Minimal coupling** - Bits don't depend on each other, only on core contracts

### **Panels: State Management Units**

**Panels** are specialized state containers within a bit that represent discrete UI components or data domains. While a bit is a top-level plugin, panels are the internal organizational units that manage specific aspects of that plugin's functionality.

Key characteristics of panels:

- **Inherit from `Panel<TState, TMessageType>`** where `TState` is the panel's data model
- **Expose a `Type` property** that categorizes the panel (e.g., "stats", "opponent", "map")
- **Subscribe to message bus events** to receive updates from runners and other panels
- **Thread-safe state access** using internal locking mechanisms (`StateLock`)
- **Provide state snapshots** through `GetStateSnapshot()` for serialization

**Example Panel:**
```csharp
public class SessionPanelState
{
    public string? UserBattleTag { get; set; }
    public string? UserName { get; set; }
    public int Wins { get; set; }
    public int Games { get; set; }
    public int Losses { get; set; }
}

public class SessionPanel : Panel<SessionPanelState, Sc2MessageType>
{
    public override string Type => "stats";

    protected override void RegisterHandlers()
    {
        MessageBus.Subscribe<LobbyParsedData>(Sc2MessageType.LobbyFileParsed, OnLobbyParsed);
    }

    private void OnLobbyParsed(LobbyParsedData data)
    {
        lock (StateLock)
        {
            State.UserBattleTag = data.UserBattleTag;
            State.UserName = data.UserName;
            UpdateLastModified();
        }
    }
}
```

Panels serve several critical purposes:

1. **Separation of Concerns** - Each panel manages one aspect of the UI (player stats, opponent info, map data)
2. **Reactive State Updates** - Panels react to message bus events rather than polling
3. **Composable Architecture** - Bits aggregate multiple panels into comprehensive state snapshots
4. **Testable Units** - Panels can be tested independently by publishing mock messages

A typical bit might contain 3-5 panels, each representing a different section of the overlay UI.

### **Runners: Background Task Executors**

**Runners** are long-running background tasks that perform continuous data acquisition and processing. While panels manage state, runners are responsible for **feeding data into panels** by monitoring external sources and publishing messages when changes occur.

Runner characteristics:

- **Inherit from `Runner<TPanel, TState>`** targeting a specific panel type
- **Execute `RunAsync(CancellationToken)`** in a background thread
- **Use `UpdatePanelState(Action<TState>)`** to safely modify panel state
- **Can poll, watch, or listen** depending on the data source
- **Gracefully handle errors** to prevent bit crashes

**Example Runner:**
```csharp
public class SessionPanelRunner : Runner<SessionPanel, SessionPanelState>
{
    private readonly string _lobbyFilePath;
    private readonly TimeSpan _pollInterval;

    protected override async Task RunAsync(CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                await CheckLobbyFileAsync();
            }
            catch
            {
                // Swallow errors to keep runner alive
            }

            await Task.Delay(_pollInterval, cancellationToken);
        }
    }

    private async Task CheckLobbyFileAsync()
    {
        // Read and parse lobby file
        var result = LobbyTagExtractor.ExtractTags(_lobbyFilePath);

        // Update panel state
        UpdatePanelState(state =>
        {
            state.UserBattleTag = result.UserBattleTag;
            state.UserName = result.UserName;
        });
    }
}
```

Runners are the **data acquisition layer** of StreamCraft. Common runner patterns include:

- **File System Watchers** - Monitor game log files for changes (replay files, match logs)
- **Polling Loops** - Periodically query REST APIs for updated statistics
- **Event Listeners** - Subscribe to game events via hooks or network traffic
- **Database Queries** - Fetch historical data for trend analysis

### **Message Bus: Inter-Component Communication**

The **MessageBus** is a type-safe, in-memory pub/sub system that enables decoupled communication between runners, panels, and other components within a bit. It uses strongly-typed message types (enums) and generic payload types to ensure compile-time safety.

Key features:

- **Thread-safe operations** using concurrent dictionaries
- **Type-safe subscriptions** - Subscribers specify exact payload types
- **Fire-and-forget publishing** - Publishers don't wait for handlers
- **Exception isolation** - Handler exceptions don't affect other subscribers
- **Scoped to each bit** - Each bit has its own message bus instance

**Example Message Flow:**
```csharp
// Define message types
public enum Sc2MessageType
{
    LobbyFileParsed,
    UserIdentified,
    MatchStarted,
    MatchEnded
}

// Runner publishes message
MessageBus.Publish(Sc2MessageType.LobbyFileParsed, new LobbyParsedData
{
    UserBattleTag = "Player#1234",
    UserName = "Player"
});

// Panel subscribes and handles
MessageBus.Subscribe<LobbyParsedData>(Sc2MessageType.LobbyFileParsed, data =>
{
    UpdateState(data);
});
```

The message bus enables:
- **Temporal decoupling** - Publishers and subscribers don't need to exist simultaneously
- **Spatial decoupling** - Components don't need references to each other
- **Event-driven architecture** - State changes propagate automatically
- **Easy testing** - Mock messages can trigger panel updates

## How Runners Update Panel State

The runner-to-panel update mechanism is the heart of StreamCraft's reactivity. Here's the complete flow:

### 1. **Runner Execution Loop**
When a bit starts, it initializes its runners using a factory or direct instantiation:
```csharp
var sessionRunner = new SessionPanelRunner(lobbyFilePath, pollInterval);
sessionRunner.Initialize(sessionPanel);
sessionRunner.Start();
```

The runner's `Start()` method creates a background task that executes `RunAsync()` in a loop:
```csharp
protected override async Task RunAsync(CancellationToken cancellationToken)
{
    while (!cancellationToken.IsCancellationRequested)
    {
        // Data acquisition logic
        await CheckLobbyFileAsync();
        
        // Wait before next iteration
        await Task.Delay(_pollInterval, cancellationToken);
    }
}
```

### 2. **Data Source Monitoring**
Inside the loop, the runner monitors its data source (file, API, memory, etc.):
```csharp
private async Task CheckLobbyFileAsync()
{
    // Check if file changed
    var fileInfo = new FileInfo(_lobbyFilePath);
    if (_lastFileWriteTime == fileInfo.LastWriteTimeUtc)
        return; // No changes

    _lastFileWriteTime = fileInfo.LastWriteTimeUtc;

    // Parse the file
    var result = LobbyTagExtractor.ExtractTags(_lobbyFilePath);
    
    // Validate data
    if (!string.IsNullOrWhiteSpace(result.UserBattleTag))
    {
        UpdatePanelStateFromResult(result);
    }
}
```

### 3. **Panel State Update**
When new data is available, the runner calls `UpdatePanelState()`, a thread-safe method provided by the base `Runner<TPanel, TState>` class:
```csharp
UpdatePanelState(state =>
{
    state.UserBattleTag = result.UserBattleTag;
    state.UserName = result.UserName;
});
```

Internally, this method:
- Acquires the panel's state lock
- Applies the mutation function
- Updates the panel's `LastUpdated` timestamp
- Releases the lock

### 4. **Optional Message Bus Broadcasting**
For complex scenarios, runners can publish messages instead of direct updates:
```csharp
MessageBus.Publish(Sc2MessageType.LobbyFileParsed, new LobbyParsedData
{
    UserBattleTag = result.UserBattleTag,
    UserName = result.UserName
});
```

The panel then handles the message in its subscription handler:
```csharp
private void OnLobbyParsed(LobbyParsedData data)
{
    lock (StateLock)
    {
        State.UserBattleTag = data.UserBattleTag;
        State.UserName = data.UserName;
        UpdateLastModified();
    }
    
    // Emit derived events
    MessageBus.Publish(Sc2MessageType.UserIdentified, data.UserBattleTag);
}
```

This pattern allows **cascading updates**: one message triggers state changes in multiple panels, which then publish derived messages that trigger further updates.

### 5. **HTTP Endpoint Serialization**
When a browser requests data from the bit's endpoint (e.g., `/sc2`), the bit aggregates panel states:
```csharp
protected override async Task HandleBitRequestAsync(HttpContext httpContext)
{
    var snapshot = new
    {
        session = sessionPanel.GetStateSnapshot(),
        opponent = opponentPanel.GetStateSnapshot(),
        map = mapPanel.GetStateSnapshot(),
        timestamp = DateTime.UtcNow
    };
    
    await httpContext.Response.WriteAsJsonAsync(snapshot);
}
```

The `GetStateSnapshot()` method acquires the panel's lock and returns a deep copy of the state, ensuring thread safety.

## The Purpose and Value Proposition

StreamCraft exists to solve the **last-mile problem** in streaming production: getting real-time game data into overlay UIs. Its architecture provides several key benefits:

### **For Streamers**
- **Zero-code overlays** - Drop a browser source into OBS, no programming required
- **Real-time updates** - Data refreshes automatically without manual intervention
- **Unified interface** - All game integrations follow the same HTTP endpoint pattern
- **Customizable UIs** - Pre-built overlays with CSS customization options

### **For Developers**
- **Plugin ecosystem** - Extend functionality without modifying core code
- **Clear separation of concerns** - Bits, panels, and runners have distinct responsibilities
- **Type-safe architecture** - Strongly-typed state management and messaging
- **Testing-friendly** - Components can be unit tested in isolation

### **For the Streaming Community**
- **Open standards** - HTTP/JSON APIs can be consumed by any client
- **Shareable configurations** - Settings files can be distributed as presets
- **Community bits** - Developers can create and share game integrations
- **Cross-platform compatibility** - Works with any streaming software that supports browser sources

## Real-World Example: StarCraft II Integration

The SC2 bit demonstrates StreamCraft's full capabilities:

**Data Sources Monitored:**
- `replay.server.battlelobby` file (binary file containing match lobby data)
- Game API endpoints (if available)
- Historical match database (for opponent statistics)

**Panels Created:**
- **SessionPanel** - Player's current session stats (wins, losses, rank)
- **OpponentPanel** - Current opponent's profile and match history
- **MapPanel** - Current map information and player's win rate on that map
- **MatchupPanel** - Racial matchup statistics

**Runners Active:**
- **SessionPanelRunner** - Polls lobby file every 250ms, extracts battle tags
- **OpponentLookupRunner** - Queries external API for opponent statistics
- **MatchHistoryRunner** - Aggregates historical match data into trends

**UI Components:**
- Live match overlay showing both players' information
- Session statistics widget with recent match history
- Map information panel with win rates
- Configuration interface for Battle.net authentication

When a streamer launches StarCraft II and enters a match, the SessionPanelRunner detects the lobby file change, extracts both players' BattleTags, updates the SessionPanel state, and publishes messages that trigger opponent lookups. Within seconds, the overlay displays comprehensive information about both players, their histories, and the current matchup—all without the streamer lifting a finger.

This is StreamCraft's core value: **turning raw game data into production-ready streaming content**, automatically and reliably, through a clean architectural pattern that scales to any game or data source.
