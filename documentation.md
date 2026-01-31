# StreamCraft Documentation

Last updated: 2026-01-31

This document is a practical, AI?friendly map of the StreamCraft codebase and runtime. It is optimized for onboarding other agents quickly and safely.

---

## 1) What StreamCraft is

StreamCraft is an "overlay OS" framework for game/stream plugins ("bits"). Each bit is a plugin that can:

- expose a HTTP endpoint (e.g., `/sc2`)
- provide a UI bundle served from `/[bit]/ui`
- publish/consume events
- keep state via a shared core state store
- optionally add runners/background services

Core goals:

- plugin isolation (ALC per plugin)
- universal state update & streaming (SSE)
- per?bit logging
- dynamic bits and configs
- simple hosting model

---

## 2) Runtime layout (host + engine + bits)

```
App (entry)
 ?? EngineBuilder
     ?? discovers plugins
     ?? builds Host (ApplicationHost)
     ?? wires DI and middleware
     ?? registers bit routes

Host (ApplicationHost)
 ?? ASP.NET Core minimal hosting
 ?? middleware (exception capture, routing, static files)
 ?? services (DI)
 ?? runs WebApplication

Bits (plugins)
 ?? loaded from App/bin/.../bits
 ?? each bit has plugin.json + entry assembly
 ?? ALC per plugin
 ?? routes + UI + state
```

---

## 3) Important folders

- `App/` ? entry app, appsettings, host startup
- `Engine/` ? discovery, routing, engine lifecycle
- `Hosting/` ? ApplicationHost + middleware
- `Core/` ? base abstractions: bits, state, logging, diagnostics, config stores
- `Bits/` ? plugin projects (Debug, Sc2, Plugins, Logging/Exceptions)
- `sql/` ? core DB migrations (embedded into Core)
- `Docs/` ? project docs

---

## 4) Plugin system

### 4.1 Discovery

- `Engine/Services/PluginDiscoveryService.cs`
- Reads `plugin.json` in each subfolder of bits path
- Loads entry assembly and bit types
- Uses `PluginLoadContext` (ALC) per plugin for isolation

### 4.2 plugin.json

Example:

```
{
  "id": "Logging",
  "entryAssembly": "Exceptions.dll"
}
```

The `id` drives:
- output folder name
- migration prefix
- plugin id in routes/configs

### 4.3 Entrypoints

Bits can implement `IStreamCraftPlugin` to hook:

- `ConfigureServices(IServiceCollection)`
- `MapEndpoints(IEndpointRouteBuilder)`

---

## 5) Bits: structure and routing

### 5.1 Base types

- `Core/Bits/StreamBit<TState>`
- `Core/Bits/BitRouteAttribute`
- `Core/Bits/HasUserInterfaceAttribute`

### 5.2 Routes

Bit routes are registered in `Engine/Routing/BitRouteRegistrar.cs`:

| Route | Purpose |
|---|---|
| `/[bit]` | main bit handler (`HandleAsync`) |
| `/[bit]/config` | shared config UI shell |
| `/[bit]/config/schema` | bit schema |
| `/[bit]/config/value` | config GET/POST |
| `/[bit]/state` | snapshot JSON |
| `/[bit]/state/stream` | SSE stream (single?line JSON) |
| `/[bit]/ui` | bit UI (static files) |
| `/[bit]/debug` | optional debug view |

### 5.3 UI convention

- UI root is `ui/` or `ui/dist` next to the bit assembly
- Fallbacks to `index.html` for SPA

---

## 6) State system

### 6.1 State store

- `Core/State/BitStateStore<TState>`
- single writer loop via Channel
- state snapshots are cloned via JSON to avoid mutable leaks
- SSE streams read from `WatchAsync`

### 6.2 State keys

- `BitRouteHelpers.GetStateKey(bit)`
- uses `bit.Route` or `bit.Name`

---

## 7) Logging system (global + per bit)

### 7.1 Serilog config

- `Core/Logging/LoggerFactory.cs`
- Writes:
  - console
  - `logs/{RunId}.log`
  - per?bit logs `logs/{RunId}.{bitName}.log` via `PerBitFileSink`

### 7.2 RunId

`yyyyMMdd.{runNo}` based on existing log files for the day.

### 7.3 Log stream for UI

- `Core/Logging/LogEventStream` implements `ILogEventStream` and `ILogEventSink`
- All Serilog events are captured and replayed
- Engine registers `ILogEventStream` for DI

---

## 8) Logging bit (UI)

### 8.1 Purpose

The ?Logging? bit is the central log console. It shows:

- all log events (not just exceptions)
- level counts (Verbose/Debug/Info/Warning/Error/Critical)
- exception count (events with attached exception)
- filtering by level, bit/source, and ?exceptions only?

### 8.2 Routes

- `/logging` (bit JSON)
- `/logging/ui` (UI)
- `/logging/state` and `/logging/state/stream`

Legacy:
- `/exceptions/*` redirects to `/logging/*`

### 8.3 UI filters

- Level filter (buttons)
- ?Exceptions only? toggle
- Bit/source filter (select)
- Search (message + source + bit + correlation)

---

## 9) Diagnostics / exceptions pipeline

### 9.1 Exception pipeline

- `Core/Diagnostics/ExceptionPipeline`
- Receives `ExceptionNotice` objects and fan?outs to sinks
- Options via `ExceptionPipelineOptions`

### 9.2 Exception sinks

- `InMemoryExceptionStore` for live stream & recent history
- `PostgresExceptionSink` for persistence (`core_exception_events`)

### 9.3 ExceptionFactory

- Central reporter used across codebase
- Attaches UnhandledException + UnobservedTaskException
- Logs via Serilog and sends to pipeline

---

## 10) Database / migrations

### 10.1 Core migrations

- In `sql/migrations/*.sql`
- Embedded into Core assembly
- Applied by `PostgresMigrationRunner`

### 10.2 Bit migrations

If a bit has `sql/migrations`, it is loaded and validated:
- Allowed table prefix: `bit_{bitId}_`

### 10.3 Postgres connection

Configured in `App/appsettings.json`:

```
StreamCraft:Database:ConnectionString
```

---

## 11) Sc2 bit (example plugin)

- `Bits/Games/Sc2`
- Uses runners/background services
- UI under `Bits/Games/Sc2/ui`
- Uses SC2 APIs (Pulse + GameData)

Known issues (from recent session):
- SC2 GameData timeouts will throw exceptions; should be visible in Logging bit
- If SC2 API is down, host can stop if unhandled (configure safely)

---

## 12) Hosting + middleware

`Hosting/ApplicationHost.cs`:

- Adds global exception handler in middleware
- `ExceptionFactory.Report(...)` logs HTTP pipeline exceptions with path/method/traceId

Important: SSE payloads are **single line JSON** to avoid parsing errors in EventSource.

---

## 13) How to add a new bit

1. Create a new project under `Bits/YourBit`
2. Implement `StreamBit<TState>`
3. Add `plugin.json` with id and entryAssembly
4. Optionally add UI under `ui/` or `ui/dist`
5. Optional: `sql/migrations` for bit DB tables (prefixed `bit_{bitId}_`)
6. Build and copy to `App/bin/.../bits` (App.csproj handles this)

---

## 14) How to expose custom endpoints from a bit

Implement `IBitEndpointContributor` and map routes in `MapEndpoints(IEndpointRouteBuilder)`.

---

## 15) How to wire services for a plugin

Implement `IStreamCraftPlugin` in the plugin assembly and register services in `ConfigureServices`.

---

## 16) Common debugging tips

- If `/logging/ui` is empty:
  - Ensure LogEventStream is wired (restart app)
  - Confirm UI is reading `/logging/state/stream`
  - Validate SSE payload is single?line JSON

- If a bit UI doesn't load:
  - Check `ui/` path and output copy
  - Verify `Registered UI static files` in logs

- If DB migrations fail:
  - Confirm Postgres is running
  - Check `core_schema_migrations`

---

## 17) Known conventions

- Bit route names are lower?cased route segments (e.g. `/logging`, `/sc2`)
- State store key is route or bit name
- Migration tables must match prefix
- Logs have RunId, and per?bit logs if BitId is set

---

## 18) Quick URLs

- `/health`
- `/diagnostics`
- `/metrics`
- `/metrics/prometheus`
- `/logging/ui`
- `/sc2/ui`

---

## 19) TODOs / next improvements

- Make BitId enrichment ubiquitous (so log filter is accurate)
- Move all "exception" UI views under Logging tabs
- Add paging + retention policy to logging UI
- Replace polling where possible with file watchers (DirectoryEventScanner)

---

## 20) Versioning notes

- This doc reflects code as of 2026?01?31 in `d:\git\streamcraft`

---

End of document.