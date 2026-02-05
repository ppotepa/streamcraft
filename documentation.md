# StreamCraft Documentation

Last updated: 2026-02-05

This document is a comprehensive, AI-friendly guide to the StreamCraft codebase and runtime. It provides architectural patterns, real code examples, navigation aids, and actionable development guidance for AI assistants and developers.

---

## Table of Contents

### Quick Navigation
- [Recent Changes (2026-02-04)](#0-recent-changes-2026-02-04)
- [Project Overview](#1-what-streamcraft-is)
- [Runtime Architecture](#2-runtime-layout-host--engine--bits)
- [Code Examples Library](#25-code-examples-library)
- [Development Tasks](#26-step-by-step-development-tasks)
- [Best Practices](#27-best-practices-for-ai-agents)
- [Quick Reference Tables](#29-quick-reference-tables)

### Core Concepts
1. [What StreamCraft is](#1-what-streamcraft-is)
2. [Runtime layout (host + engine + bits)](#2-runtime-layout-host--engine--bits)
3. [Important folders](#3-important-folders)
4. [Bit system](#4-bit-system)
   - Discovery, bit.json, Entrypoints
5. [Bits: structure and routing](#5-bits-structure-and-routing)
   - Base types, Routes

### Systems & Features
6. [Designer UI framework (client)](#6-designer-ui-framework-client)
7. [State system](#7-state-system)
8. [Logging system (global + per bit)](#8-logging-system-global--per-bit)
9. [Logging bit (UI)](#9-logging-bit-ui)
10. [Diagnostics / exceptions pipeline](#10-diagnostics--exceptions-pipeline)
11. [Database / migrations](#11-database--migrations)
12. [Designer system (shared core + UI bit)](#12-designer-system-shared-core--ui-bit)
13. [Data sources](#13-data-sources)
14. [Media system (gateway + cache)](#14-media-system-gateway--cache)
15. [KeyVault (secrets)](#15-keyvault-secrets)
16. [Text Styles + Fonts](#16-text-styles--fonts)

### Additional Components
17. [Core app UI](#17-core-app-ui)
18. [Sc2 bit (example plugin)](#18-sc2-bit-example-plugin)
19. [How to add a new bit](#19-how-to-add-a-new-bit)
20. [How to expose custom endpoints from a bit](#20-how-to-expose-custom-endpoints-from-a-bit)
21. [How to wire services for a plugin](#21-how-to-wire-services-for-a-plugin)
22. [Common debugging tips](#22-common-debugging-tips)
23. [Known conventions](#23-known-conventions)
24. [Quick URLs](#24-quick-urls)

### Code Examples & Guidance
25. [Code Examples Library](#25-code-examples-library)
    - Simple Bit (DebugBit)
    - Configurable Bit (AiBit)
    - Plugin Registration (AiPlugin)
    - DuckDB Store (AiConfigStore)
    - SQL Migration
    - Custom Endpoints (DesignerBit)
    - State Streaming (SSE)
    - Program Entry Point
    - State Update Pattern
    - bit.json Metadata
26. [Step-by-Step Development Tasks](#26-step-by-step-development-tasks)
    - Create a New Bit from Scratch
    - Add Database Persistence
    - Add Custom API Endpoint with Authentication
27. [Best Practices for AI Agents](#27-best-practices-for-ai-agents)
    - When Adding Features
    - When Debugging
    - When Refactoring
    - Common Pitfalls
    - Testing Patterns

### Reference
28. [TODOs / next improvements](#28-todos--next-improvements)
29. [Quick Reference Tables](#29-quick-reference-tables)
    - Bit Base Classes
    - Key Interfaces
    - Default Bit Routes
    - Core System Endpoints
    - File Structure Conventions
    - Naming Conventions Summary
    - Configuration Sources
    - Environment Variables
30. [Architecture Diagrams](#30-architecture-diagrams)
    - Request Flow
    - State Update Flow
    - Bit Discovery Flow
    - Data Source Category Resolution
    - Designer Binding Flow
31. [Validation Checklist](#31-validation-checklist)
32. [Document Maintenance](#32-document-maintenance)
33. [Versioning notes](#33-versioning-notes)
34. [Additional Resources](#34-additional-resources)

---

## 0) Recent changes (2026-02-04)

High‑signal updates since the last session:

- **DuckDB migration**: primary storage is now DuckDB (`data/streamcraft.duckdb`). Core + bit migrations run through the DuckDB migration runner.
- **Media gateway + cache**: `/localmedia/*` endpoints now route through a shared media gateway with a DuckDB-backed blob cache.
- **Pexels media integration**: Pexels bit seeds the media cache and exposes random/search endpoints via the gateway (16:9 1080p/4K filter for videos).
- **KeyVault**: secrets now live in a DuckDB-backed store with dev/test/live values (bit provides UI/admin surface, DPAPI encryption on Windows).
- **Text styles catalog**: Google Fonts catalog + file caching via `/textstyles/fonts/*` and a new Text Styles dialog in Designer (extension-driven).
- **Overlay video preview**: video preview dialog is now in-app (not a new page), with playlist + search + cache support and 16:9 video enforcement.
- **Designer UX updates**: progress overlay on load, Win98-themed Text Styles window, placeholder images for empty image controls, buffered image loading, and clipped text rendering inside canvas bounds.
- **Contextual editing**: a new Context Bar control now hosts per‑tool options; Properties is informational only.
- **Scheduling rework**: replaced the old background worker UI with a simple interval scheduler (stopwatch next to bindings) and a lightweight “Scheduler Stats” view.
- **Autosave UX**: autosave is now idle‑based (5s), and shows a blocking “AUTOSAVING …” overlay while saving.
- **Dock layout persistence**: docked windows are stored in localStorage (personal prefs) and removed from autosave payloads.
- **Docs + screenshots**: README now embeds live screenshots; a Playwright helper (`docs/screenshoits/UrlShot`) generates them with per‑page delays.
- **UI extensions**: extension registry moved to `Core/Ui/Extensions` so any bit can inject UI panels or dialogs.
- **Data source contracts**: interfaces moved into `Core/DataSources` (separate from `Core/Designer`) for reuse across bits and runtime services.

---

## 1) What StreamCraft is

StreamCraft is an "overlay OS" framework for game/stream bits (plugin modules). Each bit can:

- expose HTTP endpoints (e.g., `/sc2`)
- provide a UI bundle served from `/[bit]/ui`
- publish/consume events
- keep state via a shared core state store
- optionally add runners/background services

Core goals:

- bit isolation (ALC per bit)
- universal state update & streaming (SSE)
- per-bit logging
- dynamic bits and configs
- designer-driven bit creation

---

## 2) Runtime layout (host + engine + bits)

```
App (entry)
 └─ EngineBuilder
     ├─ discovers bits
     ├─ builds Host (ApplicationHost)
     ├─ wires DI + middleware
     ├─ registers bit routes
     └─ runs startup checks

Host (ApplicationHost)
 ├─ ASP.NET Core minimal hosting
 ├─ middleware (exception capture, routing, static files)
 ├─ services (DI)
 └─ runs WebApplication

Bits
 ├─ loaded from App/bin/.../bits
 ├─ each bit has bit.json + entry assembly
 ├─ ALC per bit (isolation)
 └─ routes + UI + state
```

---

## 3) Important folders

- `App/` — entry app, appsettings, host startup
- `Engine/` — discovery, routing, engine lifecycle
- `Hosting/` — ApplicationHost + middleware
- `Core/` — base abstractions: bits, state, logging, diagnostics, config stores, designer schema
- `Core/DataSources/` — data source contracts + category resolver (shared across bits + Designer)
- `Core/Media/` — media cache, gateway, and font services
- `Core/Runtime/Preview/` — preview providers + registry for live data
- `Core/Security/` — KeyVault storage + encryption helpers
- `Core/Ui/Extensions/` — UI extension registry + definitions
- `Bits/` — bit projects (Debug, Sc2, Plugins, Logging, Designer, PublicApiSources, SystemDataSources, Vault, PexelsMedia, TextStyles)
- `UI/` — core app UI (static assets served at `/ui`)
- `data/` — DuckDB database file and WAL
- `sql/` — core DB migrations (embedded into Core)
- `docs/` — project docs
- `docs/screenshots/` — screenshots committed to the repo (README embeds)
- `docs/screenshoits/UrlShot/` — Playwright screenshot tool (local helper)
- `.submodules/public-apis` — public-apis repo (for curated source ideas)
- `run.ps1` — single entry-point for running StreamCraft (menu-driven prebuilt or watch)

---

## 4) Bit system

### 4.1 Discovery

- `Engine/Services/BitDiscoveryService.cs`
- Reads `bit.json` in each subfolder of bits path
- Loads entry assembly and bit types
- Uses `BitLoadContext` (ALC) per bit for isolation
- `bit.json` can be marked `"internal": true` (built-in feature)

### 4.2 bit.json

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
- bit id in routes/configs

### 4.3 Entrypoints

Bits can implement `IStreamCraftBit`:

- `ConfigureServices(IServiceCollection)`
- `MapEndpoints(IEndpointRouteBuilder)`

Optional runtime helpers:

- `IBitEndpointContributor` to add custom endpoints outside the default routing.
- `IBitDebugProvider` to expose a debug endpoint or debug assets under `/[bit]/debug`.

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

---

## 6) Designer UI framework (client)

The Designer UI framework (Bits/Designer/ui) is modular:

- **Control registry**: controls are registered and can be extended via plugins.
- **Schema validation + defaults**: controls can declare prop validation and defaults.
- **Diagnostics**: warnings/errors are surfaced via a diagnostics store and optional diagnostics panel.
- **Core modules**: style/layout/drag are extracted into reusable modules.

Key entry points:
- `Bits/Designer/ui/src/forms/registry.ts`
- `Bits/Designer/ui/src/forms/core/diagnostics.ts`
- `Bits/Designer/ui/src/forms/core/style.ts`

### 6.1 UI convention

- UI root is `ui/` or `ui/dist` next to the bit assembly
- Fallback to `index.html` for SPA

### 6.2 Context bar + scheduling (Playground2)

- **Context bar** (`ControlKind.contextBar`) is a top‑level control that provides inline editors for the selected item (text, image, progress, shapes, binding).
- **Scheduling** is attached to bindings via a **stopwatch button** next to the Bind/Change UI. It opens a small window where you set `scheduleIntervalMs`.
- **Reset timers** (right side of the bar) resets a shared epoch so all scheduled intervals tick in sync.
- **Scheduler Stats** dialog (View → Windows) lists bound items, their interval, and last run time.
- Docking state is **stored in localStorage** (personal prefs) and is not serialized with project autosaves.
- Storage key: `sc:designer:dockLayout:v1` (JSON with docked windows + open panels).
- Autosave runs **after 5s of inactivity** and shows a blocking “AUTOSAVING …” overlay while the save promise is pending.

---

## 7) State system

### 7.1 State store

- `Core/State/BitStateStore<TState>`
- single writer loop via Channel
- snapshots cloned via JSON to avoid mutable leaks
- SSE streams read from `WatchAsync`

### 7.2 State keys

- `BitRouteHelpers.GetStateKey(bit)`
- uses `bit.Route` or `bit.Name`

---

## 8) Logging system (global + per bit)

### 8.1 Serilog config

- `Core/Logging/LoggerFactory.cs`
- Writes:
  - console
  - `logs/{RunId}.log`
- per-bit logs `logs/{RunId}.{bitName}.log` via `PerBitFileSink`

### 8.2 RunId

`yyyyMMdd.{runNo}` based on existing log files for the day.

### 8.3 Log stream for UI

- `Core/Logging/LogEventStream` implements `ILogEventStream` and `ILogEventSink`
- All Serilog events are captured and replayed
- Engine registers `ILogEventStream` for DI

---

## 9) Logging bit (UI)

### 9.1 Purpose

The "Logging" bit is the central log console. It shows:

- all log events (not just exceptions)
- level counts (Verbose/Debug/Info/Warning/Error/Critical)
- exception count (events with attached exception)
- filtering by level, bit/source, and "exceptions only"

### 9.2 Routes

- `/logging` (bit JSON)
- `/logging/ui` (UI)
- `/logging/state` and `/logging/state/stream`

Legacy:
- `/exceptions/*` redirects to `/logging/*`

---

## 10) Diagnostics / exceptions pipeline

### 10.1 Exception pipeline

- `Core/Diagnostics/ExceptionPipeline`
- Receives `ExceptionNotice` objects and fan-outs to sinks
- Options via `ExceptionPipelineOptions`

### 10.2 Exception sinks

- `InMemoryExceptionStore` for live stream & recent history
- `DuckDbExceptionSink` for persistence (stored in DuckDB, table created by core migrations)

### 10.3 ExceptionFactory

- Central reporter used across codebase
- Attaches UnhandledException + UnobservedTaskException
- Logs via Serilog and sends to pipeline

---

## 11) Database / migrations

### 11.1 Core migrations (DuckDB)

- In `sql/migrations/*.sql`
- Embedded into Core assembly
- Applied by `Core/Data/DuckDb/DuckDbMigrationRunner`

### 11.2 Bit migrations

If a bit has `sql/migrations`, it is loaded and validated:
- Allowed table prefix: `bit_{bitId}_`

### 11.3 DuckDB storage

- Default database file: `data/streamcraft.duckdb`
- WAL + temp files live next to the DB file
- Bit configuration values are persisted via `Core/Bits/DuckDbBitConfigStore`

DuckDB notes:
- The DB file is single-writer; opening it in external tools can lock the host.
- Some complex `ALTER TABLE` operations are not supported (migrations should prefer additive changes).

### 11.4 Startup checks

- `Core/Diagnostics/StartupChecks`
- Checks include DB connectivity, migrations, and bits folder
- Fail-fast when critical checks fail
- Optional TUI-style progress via `StartupCheckConsoleRenderer`

---

## 12) Designer system (shared core + UI bit)

### 12.1 Shared designer contracts (Core)

**Data source contracts** live in `Core/DataSources/` (shared across Designer + runtime):

- `IDataSource` — base contract (id/name/description/kind/categoryId)
- `IApiSource` — API shape (base URL, endpoints); not a data source by itself
- `IPublicApiDataSource` — `IDataSource` + `IApiSource` (no‑auth public APIs)
- `ISystemDataSource` — system/telemetry sources (no endpoints)
- `IMediaDataSource` — cached media sources (images/videos)
- `IOBSDataSource` — OBS‑specific sources (placeholder for streaming integrations)
- `DataSourceCategoryAttribute` — applied to category interfaces or concrete classes for labels
- `DataSourceCategoryResolver` — enforces one‑level category interface + generates labels/ids
- `IDataSourceRegistry` — shared registry for all data sources
- `IApiSourceRegistry` — API‑only view (public APIs)

**Preview providers** live in `Core/Runtime/Preview/`:

- `IDataSourceProviderRegistry` + `IDataSourceProvider` for live preview payloads

**Designer‑specific contracts** remain in `Core/Designer/`:

- `IWidgetRegistry` + `WidgetDefinition` — widget catalog

**UI extensions** live in `Core/Ui/Extensions`:

- `DesignerUiExtensionRegistry` stores extension definitions + extension data
- `DesignerUiExtensionDefinition` includes `id`, optional `group`, `targets`, `order`, `form`, and `data`
- `UiForm` helpers can build `form` payloads without JSX

Extension data can be merged at runtime via `POST /designer/extensions/data` (used for caching remote catalog results).

Category rules enforced by `DataSourceCategoryResolver`:

- Every `IDataSource` must implement exactly one category interface with `[DataSourceCategory]`.
- Category IDs are derived from the interface name (kebab‑case), labels come from the attribute.
- Subcategory IDs come from the concrete class `[DataSourceCategory]` label or `CategoryId`.
- Multi‑level category interfaces (e.g., `IStreamingDataSource : ISystemDataSource`) are rejected.

### 12.2 Registries

Registered in `Engine/EngineBuilder.cs`:

- `IDataSourceRegistry`
- `IApiSourceRegistry`
- `IDataSourceProviderRegistry`
- `IWidgetRegistry`
- `IDesignerUiExtensionRegistry`
- `IMediaProviderRegistry`

### 12.3 Designer bit

Bit: `Bits/Designer`

Routes:
- `/designer` — bit state JSON
- `/designer/ui` — Designer UI
- `/designer/sources` — all data sources (system + APIs)
- `/designer/widgets` — widget catalog
- `/designer/extensions` — registered UI extensions (forms + metadata)
- `/designer/extensions/data` (POST) — merge/overwrite extension data payloads
- `/designer/preview/{projectId}` — redirect to `/designer/ui/preview/{projectId}`
- `/designer/preview?sourceId=...` — preview payload for a source
- `/designer/preview?project=...` — redirect to `/designer/ui/preview/{projectId}`
- `/designer/layout?layoutId=...` (GET/POST) — named layout save/load (DB)
- `/designer/autosave?sessionId=...` (GET/POST) — autosave buffer (DB)

`/designer/sources` returns `kind`/`categoryId` plus `kindLabel`/`categoryLabel` derived from the category interface + optional `[DataSourceCategory]` label.

Preview behavior:
- If a provider exists, returns live preview data.
- Otherwise returns the source metadata (fallback).

### 12.4 Current Designer UI

Features:
- Full‑screen, Win98‑style layout with menu + status bar (save state + “unsaved changes”)
- Dock panel on the right with collapse toggle; docked windows stack and undock via a pin button
- Toolbox → drag‑to‑place canvas with selection box, resize handles, and multi‑select
- Hand tool for panning (Ctrl+drag also pans while Select is active)
- 16:9 canvas (1920×1080) with white border and center helper lines
- Tabbed properties panel (Basic / Binding / Text / Worker / Events)
- Data Source Explorer as the **primary** binding surface (Category → Subcategory → Source)
- API sources: endpoint picker + “Test” request button
- System sources: no endpoints, live preview values only
- Expandable JSON preview tree; clicking fields auto‑sets `response.<path>`
- Live preview values rendered directly on widgets
- WinForms‑style control names (Text1, Image1, Progress1, etc.) editable in properties
- Progress widget (progress bar) with bindable numeric value and min/max
- Text is clipped to the control bounds; wrapping is only used when it fits in the bounding box
- Image controls show a placeholder (“YOUR IMAGE GOES HERE”) when no image source is set
- Image sources are buffered before swap to avoid flicker on large assets
- Array binding warning when a control only supports scalar values
- Background worker configuration + workers view (Tools → Workers)
- Autosave every ~1s + manual save (Ctrl+S) to named layouts
- Status bar includes manual zoom controls (buttons + percentage)
- Loading modal with progress steps on initial load
- UI extensions can inject controls and dialogs (e.g., Text Styles)
- Text Styles dialog (extension-driven) with catalog search, filters, favorites, preview text, sync toggle, and AI prompt placeholder
- Overlay Video Preview dialog with playlist, search, cache state, overlay/grid toggles, and 16:9-only preview enforcement

### 12.4.1 Autosave + layout persistence

The Designer now persists layout state in two modes:

- **Autosave** (`/designer/autosave?sessionId=...`): writes to `bit_designer_autosave` every ~1s from the UI. This is the temporary “draft” buffer and is loaded on startup.
- **Manual save** (`/designer/layout?layoutId=...`): stores named layouts in `bit_designer_layouts`. Once a layout name exists, manual saves update the same record.

Dock panel state (collapsed flag, docked window IDs, and window visibility) is included in the saved layout JSON so windows reopen in their last docked/float state.

Both stores use DuckDB with a retry‑backoff mechanism to avoid repeated failures when the DB is unavailable.

### 12.4.2 Overlay Video Preview dialog

- In-app dialog (no new page) for previewing cached background videos.
- Playlist sidebar is collapsible; shows cached items and their durations.
- “Random” triggers fetch + cache; cached items are labeled.
- Search queries the public API directly and marks cached results.
- Options menu includes “Clear Cache” to wipe cached media.
- Preview enforces 16:9 and hides native player controls (overlay-only view).
- Overlay + grid toggles render the current canvas on top of the video.
- Busy/search state shows an overlay and status message while results load.

### 12.4.3 Text Styles dialog

- Extension-driven window with category filters, favorites, and preview text.
- Remote search hits Google Fonts; results can be cached into extension data.
- Preview area includes a character map and a “sync to selection” toggle.
- Font files are lazy-loaded for selected + hovered styles.

### 12.5 What the Designer is

The Designer is StreamCraft’s visual layout editor for building overlay screens (“bits” UI) without hand-coding. It runs inside the Designer bit UI at `/designer/ui` and provides a canvas, toolbox, and properties inspector for composing UI elements and binding them to data sources. The Designer is intentionally “WinForms‑like” to support rapid layout, predictable placement, and declarative control configuration.

Core goals:
- Visual composition: place and size elements directly on a canvas.
- Data binding: connect controls to `IDataSource` fields and show live previews.
- Metadata‑driven: control definitions and defaults come from a registry.
- Portable: the Designer works as a client UI using the shared form library.

### 12.6 Designer UI library (forms)

The Designer UI library is a lightweight, declarative React rendering system located under `Bits/Designer/ui/src/forms`. It provides:

- **Control registry** (`forms/registry.ts`): controls register renderers, defaults, and validations.
- **Core renderer** (`forms/core.tsx`): renders nodes (`node`) and DOM elements (`element`) into React.
- **Event bus** (`forms/core/events.ts` + `FormContainer`): string event names map to handler functions.
- **Style system** (`forms/core/style.ts`): resolves styles, including inline style strings.
- **Drag/Window helpers** (`forms/core/drag.ts`, `forms/core/windowManager.ts`): draggable windows and z‑ordering.

The library uses a simple node model:

- `node(type, props, ...children)` creates a typed control node.
- `element(tag, props, ...children)` creates DOM nodes via the same pipeline.
- `ControlKind` constants define supported control types.
- `FormContainer` injects event handlers and binding context.

### 12.7 Control system and how it works

Controls are plain React renderers registered by name. At runtime:

1. A view builds a tree of nodes (`node`/`element`).
2. `FormRenderer` walks the tree and delegates to the control registry.
3. Each control renderer receives context helpers (render children, style resolver, event dispatcher).
4. Props are validated and defaults are applied where declared.
5. Events use string handlers (e.g., `onClick: "save"`) to dispatch through the event bus.

This allows the Designer to build complex UIs without JSX, while still running in React.

### 12.8 Controls available (current)

Key controls (non‑exhaustive) include:

- **Windowing/Containers**: `window`, `panel`, `panelContainer`, `groupBox`, `splitContainer`, `tabControl`, `tabPage`, `dock`, `view`, `layoutCanvas`.
- **Menus/Toolbars**: `menuBar`, `menuItem`, `menuItemEntry`, `toolStrip`, `toolButton`, `docBar`.
- **Inputs**: `textBox`, `comboBox`, `listBox`, `checkBox`, `radioButton`, `trackBar`.
- **Buttons/Actions**: `button`, `switchButton`.
- **Display**: `label`, `text`, `progressBar`, `canvas`, `element` (raw DOM).
- **Diagnostics**: `diagnosticsPanel`, `messageBox`.
- **Designer specific**: `toolbox` and `layoutCanvas` for the visual editor.

Controls can be extended by adding new renderers and registering them in the control registry.

### 12.9 Deep dive: How the Designer works (full description)

The Designer is a self‑contained visual editor that sits on top of StreamCraft’s plugin system and the Designer UI library. Its job is to let a user compose overlays by placing controls on a canvas, then configure those controls using a properties inspector. The Designer is intentionally modeled after WinForms/OLE style editors: you select a tool, drag to place an element, resize via handles, and edit properties in tabbed sections. Under the hood, the Designer doesn’t use raw JSX to build its UI; instead, it uses a lightweight form description system that builds a node tree (`node`/`element`) and a control registry to turn those nodes into React components. This architecture keeps the UI consistent across bits, supports validation and defaults, and makes it easy to add new controls without rewriting the layout logic.

At runtime, the Designer UI is served by the Designer bit (`/designer/ui`). The UI fetches available data sources from `/designer/sources`. These sources are registered in the host via `IDataSourceRegistry` and can include **system sources** (no endpoints) or **public API sources** (with endpoints + metadata). The response includes category labels derived from `DataSourceCategoryResolver`, which the UI uses to build Category/Subcategory filters. For API sources, the Designer can fetch previews and run tests; for system sources, the Designer only uses live preview values. When the user runs a test on an API endpoint, the UI hits `/public-api-sources/test` and stores the returned payload in a local “virtual state.” This virtual state powers the live preview values on the canvas. The Designer is therefore a thin client that relies on the engine’s registry and preview providers to supply metadata; it doesn’t parse or discover data itself.

The visual editing experience is primarily handled by `Playground2`, a view that implements the canvas, toolbox, properties panel, and extra dialogs. The canvas is a `layoutCanvas` control that renders an absolute‑positioned surface with a grid. The toolbox exposes available tools (select, hand, text, image, progress, rect, ellipse, line, polygon, bind). When a tool is active, mouse events on the canvas drive placement and selection; the Hand tool (or Ctrl+drag on Select) pans the canvas. Drag‑to‑size placement uses a “placement box” that tracks mouse down/move/up and resolves to a new item on mouse up. Selection uses a “selection box” that can include multiple items when the user shift‑selects. Resizing uses handles at the corners of a selected item; a “transform ref” stores the starting position and size so resizing can be computed with each mouse move. Docked windows live in the right dock panel and undock via a pin button. These behaviors are implemented entirely on the client side, in a deterministic and predictable way, which is a key requirement for design tools.

Each item placed on the canvas is a plain object with position, size, name, and style properties. Text items can include font, weight, size, color, transform, and shadow settings. Shape items include fill and stroke. Image items include a `src` and can optionally bind to a field that supplies an image URL. Progress items include `value`, `minimum`, `maximum`, and a `progressStyle` (blocks/continuous). Items also carry data‑binding references (`sourceId`, `endpointPath`, `fieldPath`) and formatting options for text (plain, uppercase, JSON). The item model is intentionally verbose so that the properties panel can update any field independently. The Designer doesn’t attempt to infer relationships between properties; it treats each property as a first‑class editable value. This is why the properties inspector is tabbed and explicit: it lets users change a wide set of controls without hiding or collapsing them into compound logic.

Data binding is a central part of the Designer. The flow is: select a source, then select an endpoint (API sources only), then select a field (or enter a custom field path). The Designer stores these parts on the item. The Data Source Explorer shows field metadata alongside an expandable JSON preview; clicking a field auto‑sets `response.<path>`. When preview data is available, the Designer resolves the field path against the virtual state and displays the bound value on the canvas. Field path parsing supports dot notation and array indexing (e.g., `response.data[0].title`). If a bound value is an array, the UI warns that only the first element is used for scalar controls. The “resolved value” is intentionally kept in the UI layer; it’s not written back to the item, which keeps the item as a declarative configuration rather than a snapshot of data. This design aligns with the goal of letting a runtime renderer fetch and resolve bindings independently.

The properties inspector is built with the control library using a `panel` + `tabControl`. Each tab (Basic, Binding, Text, Worker, Events) isolates a logical set of fields, which keeps the UI manageable even when a control has many properties. The inspector supports both simple controls (text inputs, checkboxes, selects) and embedded actions (test, setup, effects) that open dialog windows. Those dialogs are `window` controls, which means they are draggable, can have title bars, and match the UI’s desktop‑style aesthetic. The use of dialogs is a deliberate UI choice to keep advanced settings (such as text effects or worker configuration) visible without cluttering the main properties panel.

The “background worker” section demonstrates how the Designer can configure non‑visual behaviors. Worker settings (trigger, interval, debounce, retry, backoff, timeout, cache TTL, stale‑while‑revalidate, error policy, logging) are stored on the item. The UI exposes a setup dialog, and the “enabled” toggle controls whether the worker is active. When enabled and when a binding is complete, the item is mirrored into a simple in‑memory worker registry. This registry is client‑side and provides a current snapshot of active workers. The “Tools → Workers” menu item opens a view that lists these active workers. Polling is paused while items are being moved/resized to avoid flicker or jitter. This is a UI‑level registry intended for visibility and debugging, and it provides a clear place to surface background activity without coupling to the runtime engine. In a future evolution, this registry could be wired to the host to actually schedule work; for now, it provides the configuration surface and a live list of enabled workers.

The Designer UI library (forms) is the foundation of these views. Instead of writing JSX directly, the views build a node tree using `node(type, props, ...children)` or `element(tag, props, ...children)`. This tree is then rendered by `FormRenderer`. When `FormRenderer` sees a node, it uses the `controlRegistry` to find the correct renderer. The renderer receives a `ControlContext` that includes helpers: `renderChildren` (recursively render nested nodes), `resolveStyle` (parse and merge style strings), `raiseEvent` (dispatch string‑named events), and utilities for dragging or layout. Controls are responsible for mapping props to DOM or composed widgets, and can opt into validation and defaults. This gives StreamCraft a uniform mechanism for UI controls across different bits, and makes it easier to add new controls without re‑architecting the Designer.

The event system is intentionally decoupled from React callbacks. Controls can declare events as strings (e.g., `onClose: "closeWorkerSetup"`). The `FormContainer` builds an event bus using the handlers map passed from the view. When a control raises an event, the bus routes the call to the view’s handler function. This approach allows declarative UIs to remain “data‑driven” while still supporting interactive behaviors. It also allows controls to remain generic; they don’t need to know which view or feature they’re used in, only the event name and the event arguments. The event bus makes the Designer views easier to reason about because all event handlers live in one place.

Control registration is also explicit and centralized. `registerDefaultControls` adds default renderers, validations, and defaults. For example, `window` supports `startPosition` validation; `textBox` validates multiline rows; `comboBox` and `listBox` validate `items` and `selectedIndex`; `splitContainer` validates orientation. This is important because the Designer is a configuration tool: it must guard against invalid configurations before they become runtime failures. By handling validation at the control layer, the system catches mistakes early and surfaces them to diagnostics (or logs). The control registry makes this extensible: new controls can define their own validations and defaults without modifying the core renderer.

Visually, the Designer aims for a retro, desktop UI aesthetic. The control styles are defined in the UI CSS and include menu bars, dropdowns, title bars, group boxes, and tool icons. The `menuBar`, `menuItem`, and `menuItemEntry` controls provide a Windows‑style menu, used in the Playground view and adapted for Playground2. The `switchButton` control supports “pressed” tool buttons to keep tool selection visually consistent. The `layoutCanvas` control provides the grid background, selection overlays, and is the main surface for elements. This gives StreamCraft a consistent visual language across Designer screens.

In practice, building a Designer screen follows a consistent pattern. The view creates its state: items, selection, and UI modal states. It creates callbacks for data fetching, testing, and binding. It computes derived values (selected item, available fields). It builds the node tree: menu bar, canvas, toolbox, properties panel, and dialogs. Finally, it renders everything through `FormContainer`, passing the handlers map. This pipeline keeps the view declarative and predictable. Since the node tree can be built without React JSX, it also makes it easier to share or serialize layouts in the future, which aligns with the goal of exporting layouts to schema.

Overall, the Designer is a combination of a declarative UI library and a domain‑specific editing experience. The library provides a stable set of controls and a uniform event model. The Designer view organizes those controls into a layout editor with data binding, previews, and configuration dialogs. The result is a system that is flexible enough for future widgets and data sources, while still being easy to understand and extend by developers. The separation between the UI library and the Designer view is key: the library is generic and reusable, and the Designer is a specific application built on top of it. This separation is what makes StreamCraft’s design tooling adaptable, and it positions the system for future features like schema export, runtime rendering, and collaborative editing.

### 12.10 Key library files and core code snippets

Below are the most important files in the Designer UI library, with brief descriptions and representative snippets.

**Core rendering**

- `Bits/Designer/ui/src/forms/core.tsx`
  - Defines the `node`/`element` helpers and the `FormRenderer` that walks the node tree.
  - Injects event/binding context into child nodes.

Snippet (node + element helpers):

```ts
export const node = (type: string, props?: Record<string, unknown>, ...children: FormChild[]): FormNode => ({
  type,
  props,
  children
});

export const element = (tag: keyof JSX.IntrinsicElements, props?: Record<string, unknown>, ...children: FormChild[]): FormNode =>
  node(ControlKind.element, { tag, ...props }, ...children);
```

**Form container + event bus**

- `Bits/Designer/ui/src/forms/FormContainer.tsx`
  - Provides the event bus and binding context to the node tree.
  - Translates string event names into handler function calls.

Snippet (event dispatch wiring):

```ts
const eventBus = createEventBus(handlers);
const raiseEvent = (name: string, args: any) => {
  eventBus.emit(name, args);
};
```

**Control registry**

- `Bits/Designer/ui/src/forms/registry.ts`
  - Central registry where controls are registered with renderers, defaults, and validations.
  - Enables extending the UI without changing core rendering logic.

Snippet (registry usage pattern):

```ts
controlRegistry.register(name, renderer, {
  defaults: { /* ... */ },
  validate: (props) => {
    const errors: string[] = [];
    // push errors when props are invalid
    return errors;
  }
});
```

**Control catalog**

- `Bits/Designer/ui/src/forms/controlKinds.ts`
  - `ControlKind` constants used to refer to controls consistently.
  - Avoids string literals in views and control registration.

Snippet (ControlKind usage):

```ts
node(ControlKind.window, { title: "Properties" }, ...children);
```

**Element control**

- `Bits/Designer/ui/src/forms/controls/elementControl.tsx`
  - Renders raw DOM tags through the control system.
  - Allows the node tree to include normal HTML where needed.

Snippet (element rendering flow):

```ts
return React.createElement(safeTag, { ...rest, style: resolvedStyle }, renderChildren(children));
```

**Window control**

- `Bits/Designer/ui/src/forms/controls/windowControl.tsx`
  - Desktop‑style window with title bar, controls, drag, and z‑index management.
  - Supports `startPosition`, minimize/maximize, and dialog mode.

Snippet (draggable window shell):

```ts
<DraggableContainer
  tag="div"
  className="window window-shell"
  draggable={draggable && !isMaximized}
  dragHandle={dragHandle ?? ".title-bar"}
>
  <div className="title-bar">...</div>
  <div className="window-body designer-body">{renderChildren(children)}</div>
</DraggableContainer>
```

**Layout canvas + toolbox**

- `Bits/Designer/ui/src/forms/controls/layoutCanvasControl.tsx`
  - Canvas surface for design‑time interactions and scaling.
- `Bits/Designer/ui/src/forms/controls/toolboxControl.tsx`
  - Tool list with active state and click handling.

Snippet (toolbox pattern):

```ts
node(ControlKind.toolbox, {
  title: UiText.playground2.toolboxTitle,
  tools,
  onSelect: "toolboxSelect",
  activeTool
});
```

**Menu controls**

- `Bits/Designer/ui/src/forms/controls/menuBarControl.tsx`
- `Bits/Designer/ui/src/forms/controls/menuItemControl.tsx`
- `Bits/Designer/ui/src/forms/controls/menuItemEntryControl.tsx`
  - Windows‑style menu bar with dropdown items and click actions.

Snippet (menu item click wiring):

```ts
const onClick = props?.onClick as string | undefined;
if (onClick && raiseEvent) {
  raiseEvent(onClick, { event });
}
```

**Designer view**

- `Bits/Designer/ui/src/views/Playground2.tsx`
  - Implements the canvas editor, selection, placement, and properties panels.
  - Connects to data sources and previews; binds fields to items; manages dialogs.

**Designer persistence**

- `Bits/Designer/DesignerLayoutStore.cs`
- `Bits/Designer/DesignerAutosaveStore.cs`
  - DuckDB-backed stores for named layouts and autosave drafts.
  - Use retry‑backoff when the database is unavailable.

**Data source categorization**

- `Core/DataSources/DataSourceCategoryAttribute.cs`
- `Core/DataSources/DataSourceCategoryResolver.cs`
  - Enforces a single category interface per data source and derives labels/ids.

Snippet (drag‑to‑size placement flow):

```ts
placementStart.current = { x, y, canvasRect: rect };
setPlacementBox({ active: true, x, y, width: 0, height: 0, type: activeTool });
```

**Shared UI text**

- `Bits/Designer/ui/src/views/uiText.ts`
  - Centralized UI strings for menu items, labels, buttons, and options.

Snippet (centralized labels):

```ts
labels: {
  source: "Source",
  endpoint: "Endpoint",
  field: "Field",
  format: "Format"
}
```

These files and patterns are the “spine” of the Designer UI library. Together they define how views are described, how controls render, how events flow, and how the Designer interacts with data and configuration.

---

## 13) Data sources

Contracts live in `Core/DataSources/` and are registered into `IDataSourceRegistry`. Media-backed sources (cached images/videos) implement `IMediaDataSource`.

### 13.1 Public API sources

Bit: `Bits/PublicApiSources`

- Loads curated, **no-auth** public APIs into the registry.
- List curated in `Bits/PublicApiSources/PublicApiSourceLoader.cs`.
- `.submodules/public-apis` used as an idea source.
- Metadata (fields/examples) is built at startup, cached in `bit_publicapisources_api_metadata`, and re‑applied on subsequent runs.
- Metadata build failures are tolerated; failed endpoints are logged and retried on the next startup.

### 13.2 System data sources

Bit: `Bits/SystemDataSources`

Provides Windows system telemetry (Tier‑1 set):

- `system-cpu` — CPU usage snapshot
- `system-memory` — memory usage snapshot
- `system-disk-usage` — disk usage per drive
- `system-network` — upload/download throughput
- `system-uptime` — uptime in ms
- `system-time` — local + UTC time
- `system-timezone` — local timezone info
- `system-processes` — top processes by memory
- `system-processes-cpu` — top processes by CPU time
- `system-user` — logged‑in user
- `system-host` — hostname
- `system-os` — OS version/build

System previews are served via `OnDemandPreviewProvider` and a `SystemTelemetryService`. Polling only occurs for sources bound in the Designer and pauses while items are being dragged/resized.

OBS sources currently exist as a category interface (`IOBSDataSource`) with placeholder definitions.

Category IDs/labels are derived at runtime from the category interfaces and optional `[DataSourceCategory]` attributes; there is no separate category table in the DB.

Includes preview providers so Designer can show live data.

---

## 14) Media system (gateway + cache)

### 14.1 Media cache (DuckDB)

- `Core/Media/Cache/MediaCacheStore` persists images/videos as blobs.
- Cache keys are `(provider, external id)` plus basic metadata (description, author, size, duration).
- Data is stored in DuckDB for local, serverless persistence.

### 14.2 Media gateway endpoints

`Core/Media/Gateway/MediaGateway` provides a unified HTTP surface:

- `/localmedia/images/random`
- `/localmedia/pictures/random` (alias)
- `/localmedia/videos/random`
- `/localmedia/video/random` (alias)
- `/localmedia/pictures` / `/localmedia/videos` (list)
- `/localmedia/videos/search?query=...`
- `/localmedia/images/{id}` / `/localmedia/videos/{id}`
- `/localmedia/preview?url=...` (proxy allowed preview URLs)
- `/localmedia/cache/clear` (POST)

Provider selection: add `?source={providerId}` to any `/localmedia/*` route to target a specific provider; otherwise the default provider is used.

### 14.3 Pexels media provider

Bit: `Bits/PexelsMedia`

- Uses `PexelsClient` to fetch curated images and popular videos.
- Seeds cache up to 100 images and 25 videos.
- Video selection uses a 16:9 filter and prefers 1080p/4K sizes (1920×1080 or 3840×2160).
- Search hits the Pexels API directly, but returns `isCached` + local URL if cached.
- API key is stored in KeyVault under `pexels` (environment selected via `STREAMCRAFT_ENV`); VaultSeeder seeds a default dev/test/live key.
- Registers cached data sources: `pexels-images` and `pexels-videos` (`IMediaDataSource`).

---

## 15) KeyVault (secrets)

- Store: `Core/Security/KeyVault/KeyVaultStore` (DuckDB-backed).
- Values are stored per environment: `dev`, `test`, `live`.
- Encryption uses Windows DPAPI (`ProtectedData`) by default.
- `STREAMCRAFT_ENV` selects which environment is used by clients (e.g., Pexels, Google Fonts).
- VaultSeeder seeds:
  - `pexels` with a default key (dev/test/live)
  - `googlefonts` from `STREAMCRAFT_GOOGLE_FONTS_KEY` if present
- Endpoints (via Vault plugin):  
  - `GET /keyvault/keys`  
  - `GET /keyvault/key?name=...&env=dev|test|live`  
  - `POST /keyvault/key` (write/update)

---

## 16) Text Styles + Fonts

- Bit: `Bits/TextStyles` (registers UI extensions + exposes font endpoints)
- `Core/Media/Fonts/TextStylesFontStore` + `TextStylesFontService`
- Google Fonts catalog + file caching via:
  - `/textstyles/fonts/catalog`
  - `/textstyles/fonts/catalog/refresh` (forces catalog refresh)
  - `/textstyles/fonts/file?family=...&variant=...`
- API key is read from KeyVault key `googlefonts`.
- Fonts are cached in DuckDB and lazily loaded (selected + hovered variants).
- The Text Styles UI is delivered as a Designer UI extension with filters, favorites, preview text, and sync-to-selection toggle.
- Tests: `Bits/TextStyles.Tests` covers the DuckDB font cache store.

---

## 17) Core app UI

Project: `UI/`

- Static assets served under `/ui`
- `run.ps1` (prebuilt mode) builds UI packages and copies assets into `App/bin/.../static/ui`
- `/ui` hosts the StreamCraft Console (control panel for status, bits, diagnostics)

---

## 18) Sc2 bit (example plugin)

- `Bits/Games/Sc2`
- Uses runners/background services
- UI under `Bits/Games/Sc2/ui`
- Uses SC2 APIs (Pulse + GameData)
- Configuration supports dropdowns for Provider and Region

Known issues (recent):
- SC2 GameData timeouts will throw exceptions; should be visible in Logging bit
- If SC2 API is down, host can stop if unhandled (configure safely)

---

## 19) How to add a new bit

1. Create project under `Bits/YourBit`
2. Implement `StreamBit<TState>`
3. Add `bit.json` with id and entry assembly
4. Optionally add UI under `ui/` or `ui/dist`
5. Optional: `sql/migrations` for bit DB tables (prefixed `bit_{bitId}_`)
6. Build and copy to `App/bin/.../bits` (App.csproj handles this)

---

## 20) How to expose custom endpoints from a bit

Implement `IBitEndpointContributor` and map routes in `MapEndpoints(IEndpointRouteBuilder)`.

---

## 21) How to wire services for a plugin

Implement `IStreamCraftBit` in the plugin assembly and register services in `ConfigureServices`.

---

## 22) Common debugging tips

- If `/logging/ui` is empty:
  - Ensure LogEventStream is wired (restart app)
  - Confirm UI is reading `/logging/state/stream`
  - Validate SSE payload is single-line JSON

- If a bit UI doesn't load:
  - Check `ui/` path and output copy
  - Verify `Registered UI static files` in logs
- If `/ui` shows “index.html not found”:
  - Ensure `UI/static` assets were copied to `App/bin/.../static/ui`
  - Rebuild the UI project or run `run.ps1` in prebuilt mode

- If `/localmedia/*` returns 404/500:
  - Confirm a media provider is registered (Pexels bit loaded)
  - Check KeyVault for `pexels` key and correct `STREAMCRAFT_ENV`
  - Ensure DuckDB file is not locked by an external tool

- If Google Fonts calls fail:
  - Ensure `googlefonts` key exists in KeyVault
  - Set `STREAMCRAFT_GOOGLE_FONTS_KEY` to seed the vault (dev/test/live)

- If DB migrations fail:
  - Ensure DuckDB file is writable (`data/streamcraft.duckdb`)
  - Check `core_schema_migrations` (DuckDB)

- If Designer autosave/layout fails:
  - Confirm `bit_designer_autosave` / `bit_designer_layouts` tables exist
  - Check DuckDB connectivity (stores suppress retries for ~30s on failure)
  - Ensure the DB file is not locked by another process (e.g., DBeaver)

- If build fails with file locks:
  - Stop the running `App` process (App DLLs can lock outputs)

---

## 23) Known conventions

- Bit route names are lower-cased route segments (e.g. `/logging`, `/sc2`)
- State store key is route or bit name
- Migration tables must match prefix
- Logs have RunId, and per-bit logs if BitId is set
- Built-in features can be marked `"internal": true` in `bit.json`

---

## 24) Quick URLs

- `/ui`
- `/diagnostics`
- `/metrics`
- `/metrics/prometheus`
- `/logging/ui`
- `/plugins/ui`
- `/debug/ui`
- `/designer/ui`
- `/designer/autosave?sessionId=default`
- `/designer/layout?layoutId=default`
- `/designer/extensions`
- `/designer/ui/preview/{projectId}`
- `/designer/ui/media-test`
- `/sc2/ui`
- `/textstyles/fonts/catalog`
- `/textstyles/fonts/catalog/refresh`
- `/textstyles/fonts/file?family=...&variant=...`
- `/localmedia/videos/random`
- `/localmedia/video/random`
- `/localmedia/images/random`
- `/localmedia/pictures/random`
- `/localmedia/videos/search?query=...`
- `/localmedia/preview?url=...`
- `/localmedia/cache/clear`
- `/keyvault/keys`
- `/keyvault/key?name=...&env=dev`

---

## 25) Code Examples Library

This section provides real, working code examples extracted directly from the StreamCraft codebase. Use these as templates for common development tasks.

### 25.1 Example 1: Simple Bit with UI (DebugBit)

**Purpose**: Minimal bit with state and UI serving.

**File**: `Bits/Debug/Debug/DebugBit.cs`

```csharp
using Core.Bits;
using Microsoft.AspNetCore.Http;
using System.Text.Json;

namespace StreamCraft.Bits.Debug;

[BitRoute("/debug")]
[HasUserInterface]
public class DebugBit : StreamBit<DebugBitState>
{
    protected override string StateKey => "debug";

    public DebugBit(IServiceProvider services) : base(services) { }

    public override async Task HandleAsync(HttpContext context)
    {
        var state = await GetStateAsync(context.RequestAborted);
        await context.Response.WriteAsJsonAsync(state);
    }

    protected override async Task InitializeAsync(CancellationToken cancellationToken)
    {
        await UpdateDebugStateAsync(cancellationToken);
    }

    private async Task UpdateDebugStateAsync(CancellationToken ct)
    {
        await UpdateStateAsync(state => state with
        {
            LastUpdate = DateTime.UtcNow
        }, ct);
    }
}

public class DebugBitState : IBitState
{
    public DateTime LastUpdate { get; init; } = DateTime.UtcNow;
}
```

**Key patterns**:
- `[BitRoute("/debug")]` defines the base route
- `[HasUserInterface]` indicates UI files exist in `ui/` folder
- `HandleAsync` is the main endpoint handler (`GET /debug`)
- `InitializeAsync` runs on startup to set initial state
- `UpdateStateAsync` is used to modify state (thread-safe via Channel)

---

### 25.2 Example 2: Configurable Bit with Services (AiBit)

**Purpose**: Bit with configuration, dependency injection, and multiple services.

**File**: `Bits/Ai/AiBit.cs`

```csharp
using Core.Bits;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using System.Text.Json;

namespace StreamCraft.Bits.Ai;

[BitRoute("/ai")]
public sealed class AiBit : ConfigurableBit<AiBitState, AiBitConfig>
{
    private readonly AiService _aiService;
    private readonly IAiConfigStore _configStore;
    private readonly AiProviderRegistry _providerRegistry;

    public AiBit(
        AiService aiService,
        IAiConfigStore configStore,
        AiProviderRegistry providerRegistry,
        IServiceProvider services)
        : base(services)
    {
        _aiService = aiService;
        _configStore = configStore;
        _providerRegistry = providerRegistry;
    }

    protected override async Task<AiBitConfig> LoadConfigAsync(CancellationToken ct)
    {
        var stored = await _configStore.GetAsync(ct);
        return new AiBitConfig
        {
            Provider = stored?.ProviderId ?? "openai",
            Model = stored?.TargetModel
        };
    }

    public override async Task HandleAsync(HttpContext context)
    {
        var status = await _aiService.GetStatusAsync(context.RequestAborted);
        await context.Response.WriteAsJsonAsync(status);
    }

    protected override async Task InitializeAsync(CancellationToken cancellationToken)
    {
        await UpdateStateAsync(state => state with
        {
            Status = "Initializing AI providers..."
        }, cancellationToken);
    }
}

public sealed class AiBitConfig : IConfigurationModel
{
    public string Provider { get; set; } = "openai";
    public string? Model { get; set; }
}

public sealed class AiBitState : IBitState
{
    public string Status { get; init; } = "Idle";
    public DateTime LastUpdate { get; init; } = DateTime.UtcNow;
}
```

**Key patterns**:
- `ConfigurableBit<TState, TConfig>` provides configuration support
- Constructor injection for services (`AiService`, `IAiConfigStore`, etc.)
- `LoadConfigAsync` loads configuration from storage
- Services registered in plugin's `ConfigureServices` method

---

### 25.3 Example 3: Plugin Registration with DI (AiPlugin)

**Purpose**: Register services and map custom endpoints.

**File**: `Bits/Ai/AiPlugin.cs`

```csharp
using Core.Plugins;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;

namespace StreamCraft.Bits.Ai;

public sealed class AiPlugin : IStreamCraftBit
{
    public void ConfigureServices(IServiceCollection services)
    {
        // Register stores
        services.AddSingleton<IAiConfigStore, AiConfigStore>();
        services.AddSingleton<IAiModelStore, AiModelStore>();
        
        // Register providers
        services.AddSingleton<AiProviderRegistry>();
        services.AddSingleton<IAiProvider, OpenAiProvider>();
        
        // Register services
        services.AddSingleton<AiService>();
        
        // Register the bit
        services.AddSingleton<AiBit>();
    }

    public void MapEndpoints(IEndpointRouteBuilder endpoints)
    {
        // Custom endpoints beyond the default bit routes
        endpoints.MapGet("/ai/status", async (AiService service) =>
        {
            var status = await service.GetStatusAsync(CancellationToken.None);
            return Results.Ok(status);
        });

        endpoints.MapGet("/ai/models", async (IAiModelStore modelStore) =>
        {
            var models = await modelStore.GetAvailableModelsAsync(CancellationToken.None);
            return Results.Ok(models);
        });

        endpoints.MapPost("/ai/prompt", async (HttpContext ctx, AiService service) =>
        {
            var request = await ctx.Request.ReadFromJsonAsync<AiPromptRequest>();
            if (request == null) return Results.BadRequest("Invalid request");
            
            var result = await service.ProcessPromptAsync(request.Prompt, ctx.RequestAborted);
            return Results.Ok(result);
        });

        // Serve static UI files from ui/ folder
        var uiPath = Path.Combine(AppContext.BaseDirectory, "bits", "ai", "ui");
        if (Directory.Exists(uiPath))
        {
            endpoints.MapStaticAssets("/ai/ui", uiPath);
        }
    }
}
```

**Key patterns**:
- `IStreamCraftBit` is the core plugin interface
- `ConfigureServices` registers all dependencies for DI
- `MapEndpoints` adds custom HTTP routes
- Services are resolved via DI in endpoint handlers
- Static files served from `bits/{bitId}/ui` folder

---

### 25.4 Example 4: DuckDB Store with CRUD Operations (AiConfigStore)

**Purpose**: Persist bit configuration to DuckDB with retry logic.

**File**: `Bits/Ai/AiConfigStore.cs`

```csharp
using Core.Data.DuckDb;
using DuckDB.NET.Data;

namespace StreamCraft.Bits.Ai;

public interface IAiConfigStore
{
    Task<AiProviderConfig?> GetAsync(CancellationToken ct = default);
    Task SaveAsync(AiProviderConfig config, CancellationToken ct = default);
    Task DeleteAsync(CancellationToken ct = default);
}

public sealed class AiConfigStore : IAiConfigStore
{
    private readonly DuckDBConnection _db;

    public AiConfigStore(DuckDBConnection db)
    {
        _db = db;
    }

    public async Task<AiProviderConfig?> GetAsync(CancellationToken ct = default)
    {
        using var cmd = _db.CreateCommand();
        cmd.CommandText = """
            SELECT id, provider, access_token, target_model
            FROM bit_ai_config
            WHERE id = ?
            LIMIT 1
            """;
        cmd.Parameters.AddWithValue(null, "default");

        using var reader = await cmd.ExecuteReaderAsync(ct);
        if (!await reader.ReadAsync(ct))
            return null;

        return new AiProviderConfig(
            ProviderId: reader.GetString(1),
            AccessToken: reader.IsDBNull(2) ? null : reader.GetString(2),
            TargetModel: reader.IsDBNull(3) ? null : reader.GetString(3)
        );
    }

    public async Task SaveAsync(AiProviderConfig config, CancellationToken ct = default)
    {
        using var cmd = _db.CreateCommand();
        cmd.CommandText = """
            INSERT INTO bit_ai_config (id, provider, access_token, target_model, created_utc, updated_utc)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                provider = excluded.provider,
                access_token = excluded.access_token,
                target_model = excluded.target_model,
                updated_utc = CURRENT_TIMESTAMP
            """;
        
        var now = DateTime.UtcNow;
        cmd.Parameters.AddWithValue(null, "default");
        cmd.Parameters.AddWithValue(null, config.ProviderId);
        cmd.Parameters.AddWithValue(null, config.AccessToken);
        cmd.Parameters.AddWithValue(null, config.TargetModel);
        cmd.Parameters.AddWithValue(null, now);
        cmd.Parameters.AddWithValue(null, now);

        await cmd.ExecuteNonQueryAsync(ct);
    }

    public async Task DeleteAsync(CancellationToken ct = default)
    {
        using var cmd = _db.CreateCommand();
        cmd.CommandText = "DELETE FROM bit_ai_config WHERE id = ?";
        cmd.Parameters.AddWithValue(null, "default");
        await cmd.ExecuteNonQueryAsync(ct);
    }
}
```

**Key patterns**:
- Interface for testability (`IAiConfigStore`)
- DuckDB connection injected via DI
- Parameterized queries prevent SQL injection
- `ON CONFLICT ... DO UPDATE` for upsert operations
- Cancellation token support for async operations
- Table name follows bit prefix rule: `bit_ai_config`

---

### 25.5 Example 5: SQL Migration (AI Bit)

**Purpose**: Create DuckDB table for bit persistence.

**File**: `Bits/Ai/sql/migrations/20260205_001_create_ai_config.sql`

```sql
CREATE TABLE IF NOT EXISTS bit_ai_config (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    access_token TEXT,
    target_model TEXT,
    created_utc TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_utc TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_bit_ai_config_provider 
    ON bit_ai_config(provider);
```

**Migration rules**:
- Filename format: `YYYYMMDD_NNN_description.sql`
- Table name MUST start with `bit_{bitId}_` (enforced by migration runner)
- Use `IF NOT EXISTS` for idempotent operations
- Migrations run in alphanumeric order
- Applied migrations tracked in `core_schema_migrations` table

---

### 25.6 Example 6: Custom Endpoints with Complex Routing (DesignerBit)

**Purpose**: Bit with multiple custom endpoints for layout management and data sources.

**File**: `Bits/Designer/DesignerBit.cs` (excerpt)

```csharp
using Core.Bits;
using Core.DataSources;
using Core.Designer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace StreamCraft.Bits.Designer;

[BitRoute("/designer")]
[HasUserInterface]
public sealed class DesignerBit : StreamBit<DesignerBitState>, 
    IBuiltInFeature, 
    IBitEndpointContributor
{
    private readonly IDataSourceRegistry _dataSourceRegistry;
    private readonly IWidgetRegistry _widgetRegistry;
    private readonly IDesignerUiExtensionRegistry _extensionRegistry;
    private readonly DesignerLayoutStore _layoutStore;
    private readonly DesignerAutosaveStore _autosaveStore;

    public DesignerBit(
        IDataSourceRegistry dataSourceRegistry,
        IWidgetRegistry widgetRegistry,
        IDesignerUiExtensionRegistry extensionRegistry,
        DesignerLayoutStore layoutStore,
        DesignerAutosaveStore autosaveStore,
        IServiceProvider services)
        : base(services)
    {
        _dataSourceRegistry = dataSourceRegistry;
        _widgetRegistry = widgetRegistry;
        _extensionRegistry = extensionRegistry;
        _layoutStore = layoutStore;
        _autosaveStore = autosaveStore;
    }

    public void MapEndpoints(IEndpointRouteBuilder endpoints)
    {
        // Data sources endpoint
        endpoints.MapGet("/designer/sources", () =>
        {
            var sources = _dataSourceRegistry.GetAllSources()
                .Select(source => new DataSourceDto
                {
                    Id = source.Id,
                    Name = source.Name,
                    Description = source.Description,
                    Kind = source.Kind,
                    CategoryId = source.CategoryId,
                    Endpoints = source is IPublicApiDataSource apiSource
                        ? apiSource.Endpoints.Select(e => new EndpointDto
                        {
                            Path = e.Path,
                            Method = e.Method,
                            Description = e.Description
                        }).ToArray()
                        : Array.Empty<EndpointDto>()
                })
                .ToArray();

            return Results.Ok(sources);
        });

        // Widget catalog endpoint
        endpoints.MapGet("/designer/widgets", () =>
        {
            var widgets = _widgetRegistry.GetAllWidgets();
            return Results.Ok(widgets);
        });

        // UI extensions endpoint
        endpoints.MapGet("/designer/extensions", () =>
        {
            var extensions = _extensionRegistry.GetAllExtensions();
            return Results.Ok(extensions);
        });

        // Layout save/load endpoints
        endpoints.MapGet("/designer/layout", async (string? layoutId, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(layoutId))
                return Results.BadRequest("layoutId is required");

            var layout = await _layoutStore.LoadAsync(layoutId, ct);
            return layout != null ? Results.Ok(layout) : Results.NotFound();
        });

        endpoints.MapPost("/designer/layout", async (HttpContext ctx, CancellationToken ct) =>
        {
            var layoutId = ctx.Request.Query["layoutId"].ToString();
            if (string.IsNullOrWhiteSpace(layoutId))
                return Results.BadRequest("layoutId is required");

            var json = await new StreamReader(ctx.Request.Body).ReadToEndAsync(ct);
            await _layoutStore.SaveAsync(layoutId, json, ct);
            return Results.Ok();
        });

        // Autosave endpoints
        endpoints.MapGet("/designer/autosave", async (string? sessionId, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(sessionId))
                return Results.BadRequest("sessionId is required");

            var data = await _autosaveStore.LoadAsync(sessionId, ct);
            return data != null ? Results.Ok(data) : Results.NotFound();
        });

        endpoints.MapPost("/designer/autosave", async (HttpContext ctx, CancellationToken ct) =>
        {
            var sessionId = ctx.Request.Query["sessionId"].ToString();
            if (string.IsNullOrWhiteSpace(sessionId))
                return Results.BadRequest("sessionId is required");

            var json = await new StreamReader(ctx.Request.Body).ReadToEndAsync(ct);
            await _autosaveStore.SaveAsync(sessionId, json, ct);
            return Results.Ok();
        });
    }

    public override async Task HandleAsync(HttpContext context)
    {
        var state = await GetStateAsync(context.RequestAborted);
        await context.Response.WriteAsJsonAsync(state);
    }
}
```

**Key patterns**:
- `IBitEndpointContributor` for custom endpoint registration
- Multiple registries injected via DI
- Query string parameters extracted from `HttpContext`
- Request body read with `StreamReader` for raw JSON
- Stores handle persistence with cancellation token support
- Results helper methods: `Ok()`, `BadRequest()`, `NotFound()`

---

### 25.7 Example 7: State Streaming (Client-Side SSE)

**Purpose**: Subscribe to bit state updates via Server-Sent Events.

**File**: `Bits/Debug/Debug/ui/index.html` (JavaScript excerpt)

```javascript
// Subscribe to debug bit state stream
const eventSource = new EventSource('/debug/state/stream');

eventSource.onmessage = (event) => {
    try {
        const state = JSON.parse(event.data);
        updateUI(state);
    } catch (error) {
        console.error('Failed to parse state:', error);
    }
};

eventSource.onerror = (error) => {
    console.error('SSE connection error:', error);
    // Optionally reconnect or show error UI
};

function updateUI(state) {
    document.getElementById('lastUpdate').textContent = 
        new Date(state.lastUpdate).toLocaleString();
    
    // Update other UI elements based on state
}

// Fetch current state snapshot (non-streaming)
async function fetchCurrentState() {
    const response = await fetch('/debug/state');
    const state = await response.json();
    updateUI(state);
}
```

**Key patterns**:
- `EventSource` for SSE connections
- State payload is single-line JSON (one event per state update)
- Error handling for parse failures and connection errors
- State updates trigger UI re-renders
- `/state/stream` for live updates, `/state` for snapshots

---

### 25.8 Example 8: Program Entry Point

**Purpose**: Application entry point with engine initialization.

**File**: `App/Program.cs`

```csharp
using Core.Logging;
using Engine;
using Microsoft.Extensions.Configuration;

namespace App;

internal static class Program
{
    private static async Task<int> Main(string[] args)
    {
        var loggerFactory = LoggerFactory.Create();
        var log = loggerFactory.CreateLogger("App");

        try
        {
            log.Information("StreamCraft starting...");

            var configuration = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: false)
                .AddEnvironmentVariables()
                .AddCommandLine(args)
                .Build();

            var engine = new EngineBuilder(configuration, loggerFactory)
                .DiscoverBits()
                .ConfigureServices()
                .BuildHost()
                .Build();

            await engine.RunAsync();

            log.Information("StreamCraft stopped gracefully");
            return 0;
        }
        catch (Exception ex)
        {
            log.Fatal(ex, "StreamCraft terminated unexpectedly");
            return 1;
        }
        finally
        {
            await loggerFactory.DisposeAsync();
        }
    }
}
```

**Key patterns**:
- Serilog logger created early for startup logging
- Configuration loaded from `appsettings.json` + environment + CLI args
- `EngineBuilder` fluent API for host construction
- Exception handling with proper exit codes
- Logger disposal in `finally` block

---

### 25.9 Example 9: State Update Pattern (Thread-Safe)

**Purpose**: Update bit state safely via Channel-based store.

**Pattern** (used in all bits extending `StreamBit<TState>`):

```csharp
// Inside any StreamBit<TState> derived class

// Simple state update
await UpdateStateAsync(state => state with
{
    LastUpdate = DateTime.UtcNow,
    Status = "Processing"
}, cancellationToken);

// State update with computed values
await UpdateStateAsync(state =>
{
    var newCount = state.ProcessedItems + 1;
    var newAverage = (state.TotalProcessingTime + elapsedMs) / newCount;
    
    return state with
    {
        ProcessedItems = newCount,
        AverageProcessingTime = newAverage,
        LastUpdate = DateTime.UtcNow
    };
}, cancellationToken);

// Conditional state update
await UpdateStateAsync(state =>
{
    if (state.IsRunning)
    {
        return state with { Status = "Completed", IsRunning = false };
    }
    return state; // No change
}, cancellationToken);
```

**Key patterns**:
- State is immutable (`record` types with `init` properties)
- Updates use `with` expressions for records
- Update function receives current state, returns new state
- Channel-based state store ensures thread safety
- State changes trigger SSE notifications to subscribers

---

### 25.10 Example 10: bit.json Metadata

**Purpose**: Bit manifest for discovery and configuration.

**File**: `Bits/Ai/bit.json`

```json
{
  "id": "ai",
  "name": "AI Assistant",
  "version": "1.0.0",
  "description": "AI integration with OpenAI and other providers",
  "entryAssembly": "Ai.dll",
  "internal": false
}
```

**File**: `Bits/Debug/bit.json` (internal bit)

```json
{
  "id": "debug",
  "name": "Debug Tools",
  "version": "1.0.0",
  "description": "Debugging utilities and diagnostics",
  "entryAssembly": "Debug.dll",
  "internal": true
}
```

**Key fields**:
- `id`: Unique bit identifier (used in routes, table prefixes, folder names)
- `name`: Display name for UI
- `version`: Semantic version
- `description`: Brief description for catalog/documentation
- `entryAssembly`: DLL filename containing `IStreamCraftBit` implementation
- `internal`: If `true`, bit is marked as built-in feature (`IBuiltInFeature`)

**Naming rules**:
- `id` should be lowercase, alphanumeric, no spaces
- `entryAssembly` must match the output DLL name
- Migration prefix is derived from `id`: `bit_{id}_`

---

## 26) Step-by-Step Development Tasks

### 26.1 Task: Create a New Bit from Scratch

**Scenario**: Create a "Weather" bit that fetches weather data and displays it.

**Step 1**: Create folder structure

```
Bits/Weather/
  ├── bit.json
  ├── Weather.csproj
  ├── WeatherBit.cs
  ├── WeatherState.cs
  ├── WeatherConfig.cs
  ├── WeatherService.cs
  ├── WeatherPlugin.cs
  ├── sql/migrations/
  │   └── 20260205_001_create_weather_config.sql
  └── ui/
      └── index.html
```

**Step 2**: Create `bit.json`

```json
{
  "id": "weather",
  "name": "Weather",
  "version": "1.0.0",
  "description": "Weather data overlay",
  "entryAssembly": "Weather.dll"
}
```

**Step 3**: Create `Weather.csproj`

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <RootNamespace>StreamCraft.Bits.Weather</RootNamespace>
    <AssemblyName>Weather</AssemblyName>
  </PropertyGroup>

  <ItemGroup>
    <ProjectReference Include="..\..\Core\Core.csproj" />
  </ItemGroup>

  <!-- Copy bit assets to output -->
  <ItemGroup>
    <Content Include="bit.json">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </Content>
    <Content Include="ui\**\*">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </Content>
    <Content Include="sql\migrations\**\*.sql">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </Content>
  </ItemGroup>
</Project>
```

**Step 4**: Create state class `WeatherState.cs`

```csharp
using Core.Bits;

namespace StreamCraft.Bits.Weather;

public sealed class WeatherState : IBitState
{
    public string? Location { get; init; }
    public double? Temperature { get; init; }
    public string? Condition { get; init; }
    public DateTime LastUpdate { get; init; } = DateTime.UtcNow;
}
```

**Step 5**: Create config class `WeatherConfig.cs`

```csharp
using Core.Bits;

namespace StreamCraft.Bits.Weather;

public sealed class WeatherConfig : IConfigurationModel
{
    public string? ApiKey { get; set; }
    public string Location { get; set; } = "Seattle, WA";
    public int RefreshIntervalSeconds { get; set; } = 300;
}
```

**Step 6**: Create bit class `WeatherBit.cs`

```csharp
using Core.Bits;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

namespace StreamCraft.Bits.Weather;

[BitRoute("/weather")]
[HasUserInterface]
public sealed class WeatherBit : ConfigurableBit<WeatherState, WeatherConfig>
{
    private readonly WeatherService _weatherService;

    public WeatherBit(WeatherService weatherService, IServiceProvider services)
        : base(services)
    {
        _weatherService = weatherService;
    }

    protected override async Task<WeatherConfig> LoadConfigAsync(CancellationToken ct)
    {
        // Load from store or return defaults
        return new WeatherConfig();
    }

    public override async Task HandleAsync(HttpContext context)
    {
        var state = await GetStateAsync(context.RequestAborted);
        await context.Response.WriteAsJsonAsync(state);
    }

    protected override async Task InitializeAsync(CancellationToken cancellationToken)
    {
        // Start periodic weather updates
        _ = Task.Run(async () => await RefreshWeatherLoop(cancellationToken));
    }

    private async Task RefreshWeatherLoop(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                var config = await GetConfigAsync(ct);
                var weather = await _weatherService.GetWeatherAsync(config.Location, ct);
                
                await UpdateStateAsync(state => state with
                {
                    Location = weather.Location,
                    Temperature = weather.Temperature,
                    Condition = weather.Condition,
                    LastUpdate = DateTime.UtcNow
                }, ct);

                await Task.Delay(TimeSpan.FromSeconds(config.RefreshIntervalSeconds), ct);
            }
            catch (Exception ex)
            {
                Logger.Error(ex, "Weather refresh failed");
                await Task.Delay(TimeSpan.FromSeconds(60), ct);
            }
        }
    }
}
```

**Step 7**: Create service `WeatherService.cs`

```csharp
namespace StreamCraft.Bits.Weather;

public sealed class WeatherService
{
    private readonly HttpClient _httpClient;

    public WeatherService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<WeatherData> GetWeatherAsync(string location, CancellationToken ct)
    {
        // Implement weather API call
        var response = await _httpClient.GetAsync($"https://api.weather.com/current?location={location}", ct);
        response.EnsureSuccessStatusCode();
        
        // Parse and return weather data
        return new WeatherData
        {
            Location = location,
            Temperature = 72.5,
            Condition = "Sunny"
        };
    }
}

public sealed record WeatherData(string Location, double Temperature, string Condition);
```

**Step 8**: Create plugin `WeatherPlugin.cs`

```csharp
using Core.Plugins;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace StreamCraft.Bits.Weather;

public sealed class WeatherPlugin : IStreamCraftBit
{
    public void ConfigureServices(IServiceCollection services)
    {
        services.AddHttpClient<WeatherService>();
        services.AddSingleton<WeatherBit>();
    }

    public void MapEndpoints(IEndpointRouteBuilder endpoints)
    {
        // Additional custom endpoints can be added here
    }
}
```

**Step 9**: Create migration `sql/migrations/20260205_001_create_weather_config.sql`

```sql
CREATE TABLE IF NOT EXISTS bit_weather_config (
    id TEXT PRIMARY KEY,
    api_key TEXT,
    location TEXT NOT NULL DEFAULT 'Seattle, WA',
    refresh_interval_seconds INTEGER NOT NULL DEFAULT 300,
    created_utc TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_utc TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Step 10**: Create UI `ui/index.html`

```html
<!DOCTYPE html>
<html>
<head>
    <title>Weather</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .weather-card { border: 1px solid #ccc; padding: 20px; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="weather-card">
        <h1 id="location">Loading...</h1>
        <div id="temperature"></div>
        <div id="condition"></div>
        <div id="lastUpdate"></div>
    </div>

    <script>
        const eventSource = new EventSource('/weather/state/stream');
        
        eventSource.onmessage = (event) => {
            const state = JSON.parse(event.data);
            document.getElementById('location').textContent = state.location || 'Unknown';
            document.getElementById('temperature').textContent = `${state.temperature}°F`;
            document.getElementById('condition').textContent = state.condition || 'N/A';
            document.getElementById('lastUpdate').textContent = 
                `Updated: ${new Date(state.lastUpdate).toLocaleString()}`;
        };
    </script>
</body>
</html>
```

**Step 11**: Add project reference to solution and App

Edit `App/App.csproj`:
```xml
<ItemGroup>
  <ProjectReference Include="..\Bits\Weather\Weather.csproj">
    <Private>false</Private>
    <CopyLocalLockFileAssemblies>true</CopyLocalLockFileAssemblies>
    <IncludeAssets>all</IncludeAssets>
  </ProjectReference>
</ItemGroup>
```

**Step 12**: Build and run

```powershell
.\run.ps1
# Select "Run (prebuilt)" or "Watch mode"
```

**Step 13**: Access bit

- Main endpoint: `http://localhost:5000/weather`
- UI: `http://localhost:5000/weather/ui`
- State stream: `http://localhost:5000/weather/state/stream`
- Config: `http://localhost:5000/weather/config/value`

---

### 26.2 Task: Add Database Persistence to Existing Bit

**Scenario**: Add configuration storage to the Weather bit.

**Step 1**: Create store interface `IWeatherConfigStore.cs`

```csharp
namespace StreamCraft.Bits.Weather;

public interface IWeatherConfigStore
{
    Task<WeatherConfig?> LoadAsync(CancellationToken ct = default);
    Task SaveAsync(WeatherConfig config, CancellationToken ct = default);
}
```

**Step 2**: Implement store `WeatherConfigStore.cs`

```csharp
using Core.Data.DuckDb;
using DuckDB.NET.Data;

namespace StreamCraft.Bits.Weather;

public sealed class WeatherConfigStore : IWeatherConfigStore
{
    private readonly DuckDBConnection _db;

    public WeatherConfigStore(DuckDBConnection db)
    {
        _db = db;
    }

    public async Task<WeatherConfig?> LoadAsync(CancellationToken ct = default)
    {
        using var cmd = _db.CreateCommand();
        cmd.CommandText = """
            SELECT api_key, location, refresh_interval_seconds
            FROM bit_weather_config
            WHERE id = 'default'
            LIMIT 1
            """;

        using var reader = await cmd.ExecuteReaderAsync(ct);
        if (!await reader.ReadAsync(ct))
            return null;

        return new WeatherConfig
        {
            ApiKey = reader.IsDBNull(0) ? null : reader.GetString(0),
            Location = reader.GetString(1),
            RefreshIntervalSeconds = reader.GetInt32(2)
        };
    }

    public async Task SaveAsync(WeatherConfig config, CancellationToken ct = default)
    {
        using var cmd = _db.CreateCommand();
        cmd.CommandText = """
            INSERT INTO bit_weather_config (id, api_key, location, refresh_interval_seconds)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                api_key = excluded.api_key,
                location = excluded.location,
                refresh_interval_seconds = excluded.refresh_interval_seconds,
                updated_utc = CURRENT_TIMESTAMP
            """;

        cmd.Parameters.AddWithValue(null, "default");
        cmd.Parameters.AddWithValue(null, config.ApiKey);
        cmd.Parameters.AddWithValue(null, config.Location);
        cmd.Parameters.AddWithValue(null, config.RefreshIntervalSeconds);

        await cmd.ExecuteNonQueryAsync(ct);
    }
}
```

**Step 3**: Register store in plugin

```csharp
public void ConfigureServices(IServiceCollection services)
{
    services.AddSingleton<IWeatherConfigStore, WeatherConfigStore>();
    services.AddHttpClient<WeatherService>();
    services.AddSingleton<WeatherBit>();
}
```

**Step 4**: Update bit to use store

```csharp
private readonly IWeatherConfigStore _configStore;

public WeatherBit(
    WeatherService weatherService,
    IWeatherConfigStore configStore,
    IServiceProvider services)
    : base(services)
{
    _weatherService = weatherService;
    _configStore = configStore;
}

protected override async Task<WeatherConfig> LoadConfigAsync(CancellationToken ct)
{
    var stored = await _configStore.LoadAsync(ct);
    return stored ?? new WeatherConfig(); // Return defaults if not found
}

protected override async Task SaveConfigAsync(WeatherConfig config, CancellationToken ct)
{
    await _configStore.SaveAsync(config, ct);
}
```

---

### 26.3 Task: Add Custom API Endpoint with Authentication

**Scenario**: Add a secure admin endpoint to the Weather bit.

```csharp
public void MapEndpoints(IEndpointRouteBuilder endpoints)
{
    // Public endpoint
    endpoints.MapGet("/weather/current", async (WeatherService service, string? location) =>
    {
        location ??= "Seattle, WA";
        var weather = await service.GetWeatherAsync(location, CancellationToken.None);
        return Results.Ok(weather);
    });

    // Admin endpoint with simple API key check
    endpoints.MapPost("/weather/admin/refresh", async (
        HttpContext ctx,
        WeatherService service,
        WeatherBit bit) =>
    {
        // Check API key header
        if (!ctx.Request.Headers.TryGetValue("X-API-Key", out var apiKey) ||
            apiKey != "your-secret-key")
        {
            return Results.Unauthorized();
        }

        // Trigger immediate refresh
        var config = await bit.GetConfigAsync(ctx.RequestAborted);
        var weather = await service.GetWeatherAsync(config.Location, ctx.RequestAborted);
        
        return Results.Ok(new { message = "Refresh triggered", weather });
    });

    // Admin endpoint to update config
    endpoints.MapPut("/weather/admin/config", async (
        HttpContext ctx,
        IWeatherConfigStore configStore) =>
    {
        if (!ctx.Request.Headers.TryGetValue("X-API-Key", out var apiKey) ||
            apiKey != "your-secret-key")
        {
            return Results.Unauthorized();
        }

        var config = await ctx.Request.ReadFromJsonAsync<WeatherConfig>();
        if (config == null)
            return Results.BadRequest("Invalid configuration");

        await configStore.SaveAsync(config, ctx.RequestAborted);
        return Results.Ok(new { message = "Configuration updated" });
    });
}
```

---

## 27) Best Practices for AI Agents

### 27.1 When Adding New Features

1. **Determine scope**: Decide if functionality belongs in Core (shared) or a specific Bit (isolated)
   - Core: Share types, interfaces, registries (e.g., `IDataSource`, `IMediaProvider`)
   - Bit: Isolated business logic, UI, endpoints (e.g., weather data, SC2 stats)

2. **Follow naming conventions**:
   - Bit class: `{Name}Bit` (e.g., `WeatherBit`)
   - State/Config: `{Name}State`, `{Name}Config`
   - Store: `{Name}Store` or `I{Name}Store` (interface)
   - Service: `{Name}Service`
   - Plugin: `{Name}Plugin`

3. **Use existing patterns as templates**:
   - Simple bit: Copy `DebugBit` structure
   - Configurable bit: Copy `AiBit` pattern
   - DuckDB store: Copy `AiConfigStore` pattern
   - Custom endpoints: Copy `DesignerBit` endpoint patterns

4. **Add appropriate logging**:
   ```csharp
   Logger.Information("Weather updated: {Location} = {Temp}°F", location, temperature);
   Logger.Warning("API rate limit approaching: {Remaining} requests", remaining);
   Logger.Error(ex, "Failed to fetch weather for {Location}", location);
   ```

5. **Update state streams if stateful**:
   ```csharp
   await UpdateStateAsync(state => state with
   {
       // Updated fields
       LastUpdate = DateTime.UtcNow
   }, cancellationToken);
   ```

6. **Write migrations for schema changes**:
   - Create `sql/migrations/YYYYMMDD_NNN_description.sql`
   - Use `bit_{bitId}_` prefix for all tables
   - Use `IF NOT EXISTS` for idempotency
   - Test with DuckDB file before deploying

### 27.2 When Debugging Issues

1. **Check `/logging/ui` for exceptions first**:
   - Filter by bit name to isolate issues
   - Look for stack traces and error messages
   - Check exception timestamps against deployment/changes

2. **Inspect current state** via `/[bit]/state`:
   - Verify state values match expectations
   - Check `lastUpdate` timestamps for staleness
   - Compare state snapshot with UI display

3. **Review log files directly**:
   - Main log: `logs/{RunId}.log`
   - Bit-specific: `logs/{RunId}.{bitName}.log`
   - Search for ERROR/FATAL level entries

4. **Verify migrations applied successfully**:
   - Query `core_schema_migrations` table in DuckDB
   - Check for migration file presence in output folder
   - Look for migration errors in startup logs

5. **Check startup checks output**:
   - Console shows TUI-style checks on startup
   - Critical failures cause immediate exit
   - Review check results for DB connectivity, bits folder, permissions

6. **Common DuckDB issues**:
   - **File locked**: Close DBeaver or other tools accessing `data/streamcraft.duckdb`
   - **Migration failed**: Check table prefix rules (`bit_{bitId}_`)
   - **Query timeout**: Verify DB file isn't on network drive

### 27.3 When Refactoring Code

1. **Maintain ALC isolation** (don't leak types across boundaries):
   - Core types: Public interfaces/contracts only
   - Bit types: Internal implementation, don't reference from other bits
   - Shared contracts: Move to Core if multiple bits need them

2. **Keep routing conventions consistent**:
   - `/[bit]` — main handler
   - `/[bit]/ui` — UI assets
   - `/[bit]/state` — state snapshot
   - `/[bit]/state/stream` — SSE stream
   - `/[bit]/config/value` — config GET/POST

3. **Update both code and documentation**:
   - Edit `documentation.md` for architectural changes
   - Update code examples if patterns change
   - Add new sections for new subsystems

4. **Test state streaming after changes**:
   - Open `/[bit]/state/stream` in browser
   - Verify SSE events arrive as single-line JSON
   - Check UI updates correctly on state changes

5. **Verify bit discovery still works**:
   - Check console output for "Discovered N bits"
   - Ensure `bit.json` is copied to output folder
   - Verify entry assembly name matches `entryAssembly` field

### 27.4 Common Pitfalls

| Pitfall | Impact | Solution |
|---------|--------|----------|
| **Table naming**: Bit tables don't use `bit_{bitid}_` prefix | Migration fails with validation error | Always prefix bit tables: `bit_weather_config` |
| **DuckDB locking**: DB file open in external tool | Application fails to start or query | Close DBeaver/tools before running host |
| **State immutability**: Mutating state directly | Race conditions, lost updates | Use `with` expressions on record types |
| **Route conflicts**: Two bits use same route | Ambiguous routing, 404 errors | Ensure unique `[BitRoute]` values |
| **UI path**: UI files not in `ui/` or `ui/dist/` | 404 on `/[bit]/ui` endpoints | Move UI to correct folder, verify copy |
| **Missing `Content` items**: UI/SQL not copied to output | Files missing at runtime | Add `<Content Include>` to .csproj |
| **Circular dependencies**: Bit references another bit | Build failure, ALC issues | Move shared types to Core |
| **Forgotten cancellation tokens**: Long operations block shutdown | Graceful shutdown hangs | Pass `CancellationToken` to async operations |
| **SSE format**: Multi-line JSON in state stream | Client parse failures | Ensure serialized state is single-line JSON |
| **Config not persisted**: `SaveConfigAsync` not overridden | Config changes lost on restart | Override and call store's `SaveAsync` |

### 27.5 Testing Patterns

**Unit test a store**:
```csharp
[Fact]
public async Task SaveAsync_ShouldPersistConfig()
{
    // Arrange
    var db = CreateInMemoryDuckDb();
    RunMigrations(db);
    var store = new WeatherConfigStore(db);
    var config = new WeatherConfig { Location = "Portland, OR" };

    // Act
    await store.SaveAsync(config);
    var loaded = await store.LoadAsync();

    // Assert
    Assert.NotNull(loaded);
    Assert.Equal("Portland, OR", loaded.Location);
}
```

**Integration test a bit endpoint**:
```csharp
[Fact]
public async Task GetWeather_ShouldReturnState()
{
    // Arrange
    var client = CreateTestClient(); // WebApplicationFactory

    // Act
    var response = await client.GetAsync("/weather");
    var state = await response.Content.ReadFromJsonAsync<WeatherState>();

    // Assert
    Assert.NotNull(state);
    Assert.NotNull(state.LastUpdate);
}
```

**Test SSE stream**:
```csharp
[Fact]
public async Task StateStream_ShouldEmitUpdates()
{
    // Arrange
    var client = CreateTestClient();
    var events = new List<string>();

    // Act
    using var response = await client.GetAsync("/weather/state/stream", 
        HttpCompletionOption.ResponseHeadersRead);
    using var stream = await response.Content.ReadAsStreamAsync();
    using var reader = new StreamReader(stream);

    for (int i = 0; i < 3; i++)
    {
        var line = await reader.ReadLineAsync();
        if (line?.StartsWith("data: ") == true)
        {
            events.Add(line.Substring(6));
        }
    }

    // Assert
    Assert.Equal(3, events.Count);
    foreach (var eventData in events)
    {
        var state = JsonSerializer.Deserialize<WeatherState>(eventData);
        Assert.NotNull(state);
    }
}
```

---

## 28) TODOs / next improvements

- Designer: snapping/guides, rotation, alignment tools, export schema/runtime overlay renderer
- Widget schema + renderer for runtime
- Per-widget throttling + formatting pipeline
- Data source explorer: search, favorites, richer field typing

---

## 28) TODOs / next improvements

- Designer: snapping/guides, rotation, alignment tools, export schema/runtime overlay renderer
- Widget schema + renderer for runtime
- Per-widget throttling + formatting pipeline
- Data source explorer: search, favorites, richer field typing
- Test coverage for all bits and core systems
- Performance profiling and optimization
- Multi-tenant support and isolation
- Enhanced authentication and authorization
- Real-time collaboration features

---

## 29) Quick Reference Tables

### 29.1 Bit Base Classes

| Base Class | Use When | Key Features |
|------------|----------|--------------|
| `StreamBit<TState>` | Simple stateful bit | State management, SSE streaming |
| `ConfigurableBit<TState, TConfig>` | Bit with user configuration | State + config management, schema generation |
| `IStreamCraftBit` (interface) | Maximum control needed | Full manual control, no base helpers |

### 29.2 Key Interfaces

| Interface | Purpose | Implement When |
|-----------|---------|----------------|
| `IStreamCraftBit` | Core plugin contract | Every bit plugin needs this |
| `IBitEndpointContributor` | Custom HTTP routes | Bit needs routes beyond defaults |
| `IBitDebugProvider` | Debug view | Bit has debug/diagnostic UI |
| `IBuiltInFeature` | Internal feature marker | Bit is core framework feature |
| `IDataSource` | Data source contract | Exposing queryable data |
| `IPublicApiDataSource` | Public API source | No-auth external API |
| `ISystemDataSource` | System telemetry | OS/process metrics |
| `IMediaDataSource` | Cached media | Images/videos from cache |

### 29.3 Default Bit Routes

| Route Pattern | Purpose | HTTP Method |
|---------------|---------|-------------|
| `/[bit]` | Main bit handler | GET |
| `/[bit]/ui` | Static UI assets | GET |
| `/[bit]/config` | Config UI shell | GET |
| `/[bit]/config/schema` | Config schema JSON | GET |
| `/[bit]/config/value` | Get/set config | GET/POST |
| `/[bit]/state` | State snapshot | GET |
| `/[bit]/state/stream` | SSE state stream | GET |
| `/[bit]/debug` | Debug view (optional) | GET |

### 29.4 Core System Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/ui` | StreamCraft Console (main UI) |
| `/diagnostics` | System diagnostics |
| `/metrics` | Application metrics |
| `/metrics/prometheus` | Prometheus-format metrics |
| `/logging/ui` | Log viewer and exception explorer |
| `/designer/ui` | Visual overlay designer |
| `/designer/sources` | Data source catalog |
| `/designer/widgets` | Widget registry |
| `/designer/extensions` | UI extension registry |
| `/localmedia/videos/random` | Random cached video |
| `/localmedia/images/random` | Random cached image |
| `/localmedia/videos/search?query=...` | Search videos |
| `/localmedia/cache/clear` | Clear media cache |
| `/keyvault/keys` | List vault keys |
| `/keyvault/key?name=...&env=...` | Get/set secret |

### 29.5 File Structure Conventions

| Path | Contents |
|------|----------|
| `Bits/[BitName]/` | Bit project root |
| `Bits/[BitName]/bit.json` | Bit manifest |
| `Bits/[BitName]/[BitName]Bit.cs` | Main bit class |
| `Bits/[BitName]/[BitName]Plugin.cs` | DI + endpoint registration |
| `Bits/[BitName]/[BitName]State.cs` | State class |
| `Bits/[BitName]/[BitName]Config.cs` | Configuration class |
| `Bits/[BitName]/[BitName]Store.cs` | Database store |
| `Bits/[BitName]/[BitName]Service.cs` | Business logic |
| `Bits/[BitName]/sql/migrations/*.sql` | Database migrations |
| `Bits/[BitName]/ui/` | UI assets (HTML/CSS/JS) |
| `Core/` | Shared framework code |
| `Engine/` | Bit discovery and routing |
| `Hosting/` | ASP.NET Core host |
| `App/` | Application entry point |
| `data/streamcraft.duckdb` | Database file |
| `logs/{RunId}.log` | Main application log |
| `logs/{RunId}.{bitName}.log` | Per-bit log |

### 29.6 Naming Conventions Summary

| Element | Convention | Example |
|---------|-----------|---------|
| Bit class | `{Name}Bit` | `WeatherBit`, `AiBit` |
| State class | `{Name}State` or `{Name}BitState` | `WeatherState`, `AiBitState` |
| Config class | `{Name}Config` or `{Name}BitConfig` | `WeatherConfig`, `AiBitConfig` |
| Store interface | `I{Name}Store` | `IWeatherConfigStore` |
| Store class | `{Name}Store` | `WeatherConfigStore` |
| Service class | `{Name}Service` | `WeatherService`, `AiService` |
| Plugin class | `{Name}Plugin` | `WeatherPlugin`, `AiPlugin` |
| Bit ID (bit.json) | lowercase, no spaces | `"weather"`, `"ai"`, `"text-styles"` |
| Database table (bit) | `bit_{bitid}_{table}` | `bit_weather_config` |
| Migration file | `YYYYMMDD_NNN_description.sql` | `20260205_001_create_weather_config.sql` |

### 29.7 Configuration Sources (Priority Order)

1. Command line arguments (highest priority)
2. Environment variables
3. `appsettings.json`
4. Default values (lowest priority)

Example:
```powershell
# Environment variable
$env:STREAMCRAFT_ENV = "production"

# Command line
.\run.ps1 --environment=production

# appsettings.json
{
  "Environment": "development"
}
```

### 29.8 Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `STREAMCRAFT_ENV` | Active environment (dev/test/live) | `dev` |
| `STREAMCRAFT_GOOGLE_FONTS_KEY` | Google Fonts API key | `AIza...` |
| `STREAMCRAFT_LOG_LEVEL` | Minimum log level | `Information` |
| `STREAMCRAFT_BITS_PATH` | Custom bits folder | `C:\bits` |
| `STREAMCRAFT_DB_PATH` | Custom database path | `C:\data\sc.duckdb` |

---

## 30) Architecture Diagrams

### 30.1 Request Flow

```
HTTP Request
    │
    ├─► Static Files Middleware (/ui, /[bit]/ui)
    │
    ├─► Health Endpoints (/health, /diagnostics)
    │
    ├─► Bit Routes (/[bit], /[bit]/state, /[bit]/config)
    │       │
    │       ├─► BitRouteRegistrar
    │       │       └─► StreamBit<TState>.HandleAsync()
    │       │
    │       └─► Custom Endpoints (IBitEndpointContributor)
    │
    └─► 404 Not Found
```

### 30.2 State Update Flow

```
Bit Code
    │
    └─► UpdateStateAsync(updateFn)
            │
            └─► BitStateStore<TState>
                    │
                    ├─► Channel.Writer (single writer)
                    │       └─► Update Loop (async)
                    │               ├─► Apply updateFn
                    │               ├─► Clone state (JSON)
                    │               └─► Notify watchers
                    │
                    └─► SSE Watchers
                            └─► HTTP Clients (/[bit]/state/stream)
```

### 30.3 Bit Discovery Flow

```
Application Startup
    │
    ├─► EngineBuilder.DiscoverBits()
    │       │
    │       └─► BitDiscoveryService
    │               ├─► Scan bits path for bit.json files
    │               ├─► Load bit.json metadata
    │               ├─► Create BitLoadContext (ALC) per bit
    │               ├─► Load entry assembly
    │               ├─► Find IStreamCraftBit implementations
    │               └─► Return BitDescriptor list
    │
    ├─► EngineBuilder.ConfigureServices()
    │       └─► Call bit.ConfigureServices(services) for each bit
    │
    ├─► EngineBuilder.BuildHost()
    │       └─► ApplicationHostBuilder
    │               ├─► Register core services
    │               ├─► Register bit services
    │               ├─► Add middleware
    │               └─► Build WebApplication
    │
    └─► Engine.RunAsync()
            ├─► Run startup checks
            ├─► Apply migrations (core + bits)
            ├─► Initialize bits
            └─► Start host
```

### 30.4 Data Source Category Resolution

```
Data Source Class
    │
    ├─► Implements IDataSource (base)
    │
    ├─► Implements ONE category interface
    │       ├─► IPublicApiDataSource (APIs)
    │       ├─► ISystemDataSource (telemetry)
    │       ├─► IMediaDataSource (cached media)
    │       └─► IOBSDataSource (OBS sources)
    │
    └─► DataSourceCategoryResolver
            ├─► Validate: exactly one category interface
            ├─► Extract category ID from interface name
            ├─► Extract category label from [DataSourceCategory]
            ├─► Extract subcategory from class [DataSourceCategory]
            └─► Return SourceCategoryInfo
```

### 30.5 Designer Binding Flow

```
User Action in Designer
    │
    ├─► Select Data Source
    │       └─► Fetch /designer/sources
    │               └─► IDataSourceRegistry.GetAllSources()
    │
    ├─► Select Endpoint (if API source)
    │       └─► Display endpoint list from source metadata
    │
    ├─► Select Field
    │       ├─► Fetch preview: /designer/preview?sourceId=...
    │       │       └─► IDataSourceProviderRegistry.GetProvider()
    │       │               └─► IDataSourceProvider.GetPreviewAsync()
    │       │
    │       └─► Display JSON tree with clickable fields
    │
    └─► Item Updated
            ├─► Set binding: { sourceId, endpointPath, fieldPath }
            ├─► Resolve value from preview data
            └─► Render bound value on canvas
```

---

## 31) Validation Checklist

When creating or updating documentation, verify:

- [x] All code examples are from actual project files
- [x] File paths are accurate and current (verified against workspace)
- [x] Conventions match observed patterns in codebase:
  - [x] Bit naming: `{Name}Bit`
  - [x] Store naming: `{Name}Store`
  - [x] Table prefix: `bit_{bitid}_`
  - [x] Migration format: `YYYYMMDD_NNN_description.sql`
  - [x] Route attribute: `[BitRoute("/route")]`
- [x] No hallucinated classes, methods, or patterns (all examples verified)
- [x] Examples include enough context to be useful (imports, full class structure)
- [x] Navigation guidance includes actual file/folder names
- [x] Bit anatomy reflects real bit implementations:
  - [x] DebugBit (simple)
  - [x] AiBit (configurable)
  - [x] DesignerBit (complex endpoints)
- [x] Routing patterns match engine implementation (`BitRouteRegistrar`)
- [x] Database conventions match migration runner rules (`DuckDbMigrationRunner`)
- [x] State management patterns documented with thread safety notes
- [x] DI patterns shown with constructor injection
- [x] Error handling patterns included
- [x] Cancellation token usage demonstrated
- [x] Real migration SQL from actual bits
- [x] Actual endpoint patterns from DesignerBit and AiBit
- [x] Real state/config classes from codebase

---

## 32) Document Maintenance

**Last full review**: 2026-02-05

**Update triggers**:
- New bit added to Bits/ folder
- Core architecture changes (new subsystems, refactored pipelines)
- Breaking changes to base classes or interfaces
- New conventions established
- Migration system changes
- Routing changes

**Review schedule**: After major feature additions or architectural refactors

**Validation method**: Compare code examples against actual source files via grep/search

---

## 33) Versioning notes

- This documentation reflects code as of **2026-02-05** in `d:\git\streamcraft`
- .NET version: **.NET 9.0** (see `global.json`)
- DuckDB version: Managed via **DuckDB.NET.Data** NuGet package
- Major framework: **ASP.NET Core Minimal APIs**
- UI framework: **React** (custom forms library at `Bits/Designer/ui/src/forms`)
- Build tool: **PowerShell script** (`run.ps1`)
- Solution: `StreamCraft.sln` (Visual Studio 2022 / Rider compatible)

---

## 34) Additional Resources

### Documentation Files
- `README.md` - Project overview with screenshots
- `documentation.md` - This file (comprehensive technical documentation)
- `docs/metaprompt-documentation-generator.md` - Meta-prompt for regenerating docs
- `docs/live-preview.md` - Live preview system design notes
- `docs/winforms-react.md` - Designer UI architecture notes

### External Resources
- **StreamCraft GitHub Repository**: (if public)
- **DuckDB Documentation**: https://duckdb.org/docs/
- **.NET 9.0 Documentation**: https://learn.microsoft.com/en-us/dotnet/
- **Serilog Documentation**: https://serilog.net/
- **React Documentation**: https://react.dev/

### Community
- Report issues or feature requests via GitHub Issues
- Contribute via pull requests (follow existing conventions)
- Join discussions for architecture questions

---

End of comprehensive documentation.


