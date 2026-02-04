# StreamCraft

StreamCraft is a local-first overlay engine for streamers. It runs on your machine, exposes browser-source pages for OBS, and lets you build overlays visually with a plugin system called **Bits**.

> **Status:** Most bits are in WIP state and are subject to radical change.

> **Designer UI styling:** the CSS looks intentionally minimal/retro because it is a foundation layer that is dead‑simple to modify.

## Screenshots

![Console UI](docs/screenshoits/screenshots/console-ui.png)
![Designer home](docs/screenshoits/screenshots/designer-home.png)
![Designer canvas](docs/screenshoits/screenshots/designer-canvas.png)
![Designer all controls](docs/screenshoits/screenshots/designer-all-controls.png)
![Designer media test](docs/screenshoits/screenshots/designer-media-test.png)
![Designer overlay preview](docs/screenshoits/screenshots/designer-overlay-preview.png)
![Designer (jpeg)](docs/screenshoits/screenshots/designer.jpeg)
![Plugins UI](docs/screenshoits/screenshots/plugins-ui.png)
![Logging UI](docs/screenshoits/screenshots/logging-ui.png)
![Debug UI](docs/screenshoits/screenshots/debug-ui.png)
![SC2 UI](docs/screenshoits/screenshots/sc2-ui.png)
![SC2 screens](docs/screenshoits/screenshots/sc2-screens.png)
![SC2 MMR tracker](docs/screenshoits/screenshots/sc2-mmr-tracker.png)
![All controls](docs/screenshoits/screenshots/all-controls.png)
![Media test](docs/screenshoits/screenshots/media-test.png)

### Generating screenshots (local)

A small Playwright helper lives in `docs/screenshoits/UrlShot` (ignored by git). It writes PNGs to `docs/screenshots/`.

```powershell
# 1) Start backend + frontend
.\run.ps1
.\runwatch.ps1

# 2) Generate screenshots
cd docs\screenshoits\UrlShot
# First run creates shots.json in this folder
# Edit shots.json as needed

dotnet run -- --config shots.json
```

## Quick start

### Prerequisites

- .NET 8 SDK
- Node.js + npm

### Run backend

```powershell
.\run.ps1
```

The backend host defaults to `http://localhost:5000`.

### Run frontend (Designer UI)

```powershell
.\runwatch.ps1
```

Vite will serve the Designer UI (default `http://localhost:5173`).

## How Bits work

Bits are the core feature modules. Each bit is a .NET project under `Bits/` with a `plugin.json` and an entry assembly that implements `IStreamCraftPlugin`.

At runtime, the engine discovers all bit assemblies, registers their services, and maps their endpoints. Bits can provide:

- Data sources (for binding live data into overlays)
- UI forms (for custom dialogs / tooling)
- Media providers (images/video through `/localmedia/*`)
- Background services

### Bit structure (minimal)

```
Bits/MyBit/
  MyBit.csproj
  MyBitPlugin.cs
  plugin.json
```

`plugin.json` registers your entry assembly:

```json
{
  "id": "MyBit",
  "entryAssembly": "MyBit.dll",
  "internal": true
}
```

`MyBitPlugin.cs` implements the plugin entry point:

```csharp
public sealed class MyBitPlugin : StreamCraftPluginBase
{
    public override void ConfigureServices(IServiceCollection services, PluginContext context)
    {
        // register data sources, stores, background services
    }

    public override void MapEndpoints(IEndpointRouteBuilder endpoints, PluginContext context)
    {
        // map HTTP endpoints
    }
}
```

## Core platform features

These live in `Core/` and can be used by any bit.

- **Data sources (`Core/DataSources`)**
  - `IDataSource` + category interfaces define catalogable sources.
  - `DataSourceCategoryResolver` derives category labels from interfaces/attributes.
  - `ApiResponseMetadata` captures response schemas for API-backed sources.

- **UI extensions (`Core/Ui/Extensions`)**
  - `DesignerUiExtensionRegistry` stores extension definitions (triggers + dialogs).
  - `UiForm` + `UiFormNode` provide a JSON UI schema for backend-defined forms.

- **Media cache + gateway (`Core/Media`)**
  - `Core/Media/Cache/MediaCacheStore` persists images/videos as blobs in DuckDB (keyed by provider + external id).
  - `Core/Media/Gateway/MediaGateway` exposes `/localmedia/*` endpoints and routes to providers (`IMediaProvider`).

- **Fonts (`Core/Media/Fonts`)**
  - Google Fonts catalog + file caching (DuckDB-backed).
  - Lazy file retrieval by family/variant via `/textstyles/fonts/file`.

- **Preview providers (`Core/Runtime/Preview`)**
  - `IDataSourceProvider` supplies live preview payloads for UI testing.

- **KeyVault (`Core/Security/KeyVault`)**
  - Encrypted secrets stored in DuckDB, with dev/test/live values.
  - UI/admin bit interacts with this store; other bits read via `IKeyVault`.

## Developing UI + overlays

The Designer UI lives in `Bits/Designer/ui`. It renders a Win98-styled editor and outputs overlay layouts.

- **Canvas items** are positioned elements (text, image, progress, etc.)
- **Data binding** attaches a data source + field path to an item
- **Preview** renders live data through the preview pipeline

## Repo layout

- `App/` - application host
- `Core/` - shared platform services (data, UI extensions, media, key vault)
- `Bits/` - feature modules
- `Engine/` - runtime discovery + orchestration
- `Hosting/` - web host + boot
- `docs/` - product docs and mockups

## Notes

This is a fast-moving project and still in heavy refactoring. Expect breaking changes.

## Contact

- Email: ppotepa+streamcraft@hotmail.com
- Telegram: @protectmyballz
- Video demo: https://www.youtube.com/watch?v=C7Ebfe9p_U0
