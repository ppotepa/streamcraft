# StreamCraft Documentation

Last updated: 2026-01-31

This document is a practical, AI-friendly map of the StreamCraft codebase and runtime. It is optimized for onboarding other agents quickly and safely.

---

## 1) What StreamCraft is

StreamCraft is an "overlay OS" framework for game/stream plugins ("bits"). Each bit is a plugin that can:

- expose HTTP endpoints (e.g., `/sc2`)
- provide a UI bundle served from `/[bit]/ui`
- publish/consume events
- keep state via a shared core state store
- optionally add runners/background services

Core goals:

- plugin isolation (ALC per plugin)
- universal state update & streaming (SSE)
- per-bit logging
- dynamic bits and configs
- designer-driven bit creation

---

## 2) Runtime layout (host + engine + bits)

```
App (entry)
 └─ EngineBuilder
     ├─ discovers plugins
     ├─ builds Host (ApplicationHost)
     ├─ wires DI + middleware
     ├─ registers bit routes
     └─ runs startup checks

Host (ApplicationHost)
 ├─ ASP.NET Core minimal hosting
 ├─ middleware (exception capture, routing, static files)
 ├─ services (DI)
 └─ runs WebApplication

Bits (plugins)
 ├─ loaded from App/bin/.../bits
 ├─ each bit has plugin.json + entry assembly
 ├─ ALC per plugin (isolation)
 └─ routes + UI + state
```

---

## 3) Important folders

- `App/` — entry app, appsettings, host startup
- `Engine/` — discovery, routing, engine lifecycle
- `Hosting/` — ApplicationHost + middleware
- `Core/` — base abstractions: bits, state, logging, diagnostics, config stores, designer schema
- `Bits/` — plugin projects (Debug, Sc2, Plugins, Logging, Designer, PublicApiSources, SystemDataSources)
- `UI/` — core app UI (static assets served at `/ui`)
- `sql/` — core DB migrations (embedded into Core)
- `Docs/` — project docs
- `.submodules/public-apis` — public-apis repo (for curated source ideas)

---

## 4) Plugin system

### 4.1 Discovery

- `Engine/Services/PluginDiscoveryService.cs`
- Reads `plugin.json` in each subfolder of bits path
- Loads entry assembly and bit types
- Uses `PluginLoadContext` (ALC) per plugin for isolation
- `plugin.json` can be marked `"internal": true` (built-in feature)

### 4.2 plugin.json

Example:

```
{
  "id": "Logging",
  "entryAssembly": "Exceptions.dll",
  "internal": true
}
```

The `id` drives:
- output folder name
- migration prefix
- plugin id in routes/configs

### 4.3 Entrypoints

Bits can implement `IStreamCraftPlugin`:

- `ConfigureServices(IServiceCollection)`
- `MapEndpoints(IEndpointRouteBuilder)`

---

## 5) Bits: structure and routing

### 5.1 Base types

- `Core/Bits/StreamBit<TState>`
- `Core/Bits/BitRouteAttribute`
- `Core/Bits/HasUserInterfaceAttribute`
- `Core/Bits/IBuiltInFeature` (internal-only features)

### 5.2 Routes

Bit routes are registered in `Engine/Routing/BitRouteRegistrar.cs`:

| Route | Purpose |
|---|---|
| `/[bit]` | main bit handler (`HandleAsync`) |
| `/[bit]/config` | shared config UI shell |
| `/[bit]/config/schema` | bit schema |
| `/[bit]/config/value` | config GET/POST |
| `/[bit]/state` | snapshot JSON |
| `/[bit]/state/stream` | SSE stream (single-line JSON) |
| `/[bit]/ui` | bit UI (static files) |
| `/[bit]/debug` | optional debug view |

### 5.3 UI convention

- UI root is `ui/` or `ui/dist` next to the bit assembly
- Fallback to `index.html` for SPA

---

## 6) State system

### 6.1 State store

- `Core/State/BitStateStore<TState>`
- single writer loop via Channel
- snapshots cloned via JSON to avoid mutable leaks
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
- per-bit logs `logs/{RunId}.{bitName}.log` via `PerBitFileSink`

### 7.2 RunId

`yyyyMMdd.{runNo}` based on existing log files for the day.

### 7.3 Log stream for UI

- `Core/Logging/LogEventStream` implements `ILogEventStream` and `ILogEventSink`
- All Serilog events are captured and replayed
- Engine registers `ILogEventStream` for DI

---

## 8) Logging bit (UI)

### 8.1 Purpose

The "Logging" bit is the central log console. It shows:

- all log events (not just exceptions)
- level counts (Verbose/Debug/Info/Warning/Error/Critical)
- exception count (events with attached exception)
- filtering by level, bit/source, and "exceptions only"

### 8.2 Routes

- `/logging` (bit JSON)
- `/logging/ui` (UI)
- `/logging/state` and `/logging/state/stream`

Legacy:
- `/exceptions/*` redirects to `/logging/*`

---

## 9) Diagnostics / exceptions pipeline

### 9.1 Exception pipeline

- `Core/Diagnostics/ExceptionPipeline`
- Receives `ExceptionNotice` objects and fan-outs to sinks
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

### 10.4 SQL query store

- `Core/Data/Sql/SqlQueryStore`
- Queries live in `sql/queries/**` and are embedded into Core
- All DB operations load SQL by key (no inline SQL in code)

### 10.5 Startup checks

- `Core/Diagnostics/StartupChecks`
- Checks include DB connectivity, migrations, and bits folder
- Fail-fast when critical checks fail
- Optional TUI-style progress via `StartupCheckConsoleRenderer`

---

## 11) Designer system (shared core + UI bit)

### 11.1 Shared designer contracts (Core)

Located under `Core/Designer/`:

- `IDataSource` — id/name/description/kind
- `IApiDataSource` — API specialization
- `IDataSourceRegistry` — shared registry for all data sources
- `IApiSourceRegistry` — API-only view
- `IDataSourceProviderRegistry` — live preview providers
- `IWidgetRegistry` + `WidgetDefinition` — widget catalog

### 11.2 Registries

Registered in `Engine/EngineBuilder.cs`:

- `IDataSourceRegistry`
- `IApiSourceRegistry`
- `IDataSourceProviderRegistry`
- `IWidgetRegistry`

### 11.3 Designer bit

Bit: `Bits/Designer`

Routes:
- `/designer` — bit state JSON
- `/designer/ui` — Designer UI
- `/designer/sources` — all data sources (system + APIs)
- `/designer/widgets` — widget catalog
- `/designer/preview?sourceId=...` — preview payload for a source

Preview behavior:
- If a provider exists, returns live preview data.
- Otherwise returns the source metadata (fallback).

### 11.4 Current Designer UI

Features:
- Drag widgets from palette onto canvas
- Move widgets on canvas
- Select widget to edit in Inspector
- Bind source + field path
- Live preview value shown per widget
- Data preview JSON panel

---

## 12) Data sources

### 12.1 Public API sources

Bit: `Bits/PublicApiSources`

- Loads curated, **no-auth** public APIs into the registry.
- List curated in `Bits/PublicApiSources/PublicApiSourceLoader.cs`.
- `.submodules/public-apis` used as an idea source.

### 12.2 System data sources

Bit: `Bits/SystemDataSources`

Provides Windows system data:

- `system-processes` — top processes + memory
- `system-memory` — GC + working set + private memory
- `system-uptime` — uptime in ms

Includes preview providers so Designer can show live data.

---

## 13) Core app UI

Project: `UI/`

- Static assets served under `/ui`
- `runlocal.ps1` copies assets into `App/bin/.../static/ui`

---

## 14) Sc2 bit (example plugin)

- `Bits/Games/Sc2`
- Uses runners/background services
- UI under `Bits/Games/Sc2/ui`
- Uses SC2 APIs (Pulse + GameData)
- Configuration supports dropdowns for Provider and Region

Known issues (recent):
- SC2 GameData timeouts will throw exceptions; should be visible in Logging bit
- If SC2 API is down, host can stop if unhandled (configure safely)

---

## 15) How to add a new bit

1. Create project under `Bits/YourBit`
2. Implement `StreamBit<TState>`
3. Add `plugin.json` with id and entry assembly
4. Optionally add UI under `ui/` or `ui/dist`
5. Optional: `sql/migrations` for bit DB tables (prefixed `bit_{bitId}_`)
6. Build and copy to `App/bin/.../bits` (App.csproj handles this)

---

## 16) How to expose custom endpoints from a bit

Implement `IBitEndpointContributor` and map routes in `MapEndpoints(IEndpointRouteBuilder)`.

---

## 17) How to wire services for a plugin

Implement `IStreamCraftPlugin` in the plugin assembly and register services in `ConfigureServices`.

---

## 18) Common debugging tips

- If `/logging/ui` is empty:
  - Ensure LogEventStream is wired (restart app)
  - Confirm UI is reading `/logging/state/stream`
  - Validate SSE payload is single-line JSON

- If a bit UI doesn't load:
  - Check `ui/` path and output copy
  - Verify `Registered UI static files` in logs

- If DB migrations fail:
  - Confirm Postgres is running
  - Check `core_schema_migrations`

- If build fails with file locks:
  - Stop the running `App` process (App DLLs can lock outputs)

---

## 19) Known conventions

- Bit route names are lower-cased route segments (e.g. `/logging`, `/sc2`)
- State store key is route or bit name
- Migration tables must match prefix
- Logs have RunId, and per-bit logs if BitId is set
- Built-in features can be marked `"internal": true` in `plugin.json`

---

## 20) Quick URLs

- `/ui`
- `/diagnostics`
- `/metrics`
- `/metrics/prometheus`
- `/logging/ui`
- `/designer/ui`
- `/sc2/ui`

---

## 21) TODOs / next improvements

- Designer: snapping, resizing, multi-select, export schema
- Widget schema + renderer for runtime
- Per-widget throttling + formatting pipeline
- Data source field explorer + auto-pick path

---

## 22) Versioning notes

- This doc reflects code as of 2026-01-31 in `d:\git\streamcraft`

---

End of document.
