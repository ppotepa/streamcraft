# StreamCraft Documentation

Last updated: 2026-02-04

This document is a practical, AI-friendly map of the StreamCraft codebase and runtime. It is optimized for onboarding other agents quickly and safely.

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
- **Docs + screenshots**: README now embeds live screenshots; a Playwright helper (`docs/screenshoits/UrlShot`) generates them with per‑page delays.
- **UI extensions**: extension registry moved to `Core/Ui/Extensions` so any bit can inject UI panels or dialogs.
- **Data source contracts**: interfaces moved into `Core/DataSources` (separate from `Core/Designer`) for reuse across bits and runtime services.

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
- `Core/DataSources/` — data source contracts + category resolver (shared across bits + Designer)
- `Core/Media/` — media cache, gateway, and font services
- `Core/Runtime/Preview/` — preview providers + registry for live data
- `Core/Security/` — KeyVault storage + encryption helpers
- `Core/Ui/Extensions/` — UI extension registry + definitions
- `Bits/` — plugin projects (Debug, Sc2, Plugins, Logging, Designer, PublicApiSources, SystemDataSources, Vault, PexelsMedia, TextStyles)
- `UI/` — core app UI (static assets served at `/ui`)
- `data/` — DuckDB database file and WAL
- `sql/` — core DB migrations (embedded into Core)
- `docs/` — project docs
- `docs/screenshots/` — screenshots committed to the repo (README embeds)
- `docs/screenshoits/UrlShot/` — Playwright screenshot tool (local helper)
- `.submodules/public-apis` — public-apis repo (for curated source ideas)
- `concat_codebase.ps1` / `concatfull.ps1` — utility scripts to concatenate source files (source-only vs full)

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
- `runlocal.ps1` copies assets into `App/bin/.../static/ui`
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
3. Add `plugin.json` with id and entry assembly
4. Optionally add UI under `ui/` or `ui/dist`
5. Optional: `sql/migrations` for bit DB tables (prefixed `bit_{bitId}_`)
6. Build and copy to `App/bin/.../bits` (App.csproj handles this)

---

## 20) How to expose custom endpoints from a bit

Implement `IBitEndpointContributor` and map routes in `MapEndpoints(IEndpointRouteBuilder)`.

---

## 21) How to wire services for a plugin

Implement `IStreamCraftPlugin` in the plugin assembly and register services in `ConfigureServices`.

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
  - Rebuild the UI project or run `runlocal.ps1`

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
- Built-in features can be marked `"internal": true` in `plugin.json`

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

## 25) TODOs / next improvements

- Designer: snapping/guides, rotation, alignment tools, export schema/runtime overlay renderer
- Widget schema + renderer for runtime
- Per-widget throttling + formatting pipeline
- Data source explorer: search, favorites, richer field typing

---

## 26) Versioning notes

- This doc reflects code as of 2026-02-04 in `d:\git\streamcraft`

---

End of document.

