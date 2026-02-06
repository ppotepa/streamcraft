# StreamCraft Roadmap

## Current status
- Pre-alpha (active refactor).

## v0.0.1 (Pre-alpha) — current snapshot
What we already have:
- Designer core workflow: canvas, toolbox, properties, context bar.
- Autosave (idle-based) + manual saves + local dock layout persistence.
- Data sources + previews (system + public APIs) with binding UI.
- Media gateway + cache (`/localmedia/*`) with Pexels image/video sources.
- Overlay video preview dialog (playlist/search/cache).
- Text Styles dialog with Google Fonts catalog + caching.
- KeyVault (DuckDB-backed, dev/test/live values).

## Release milestones

### v0.1 (Alpha)
Goal: A usable end-to-end overlay workflow with core integrations.

Acceptance criteria (progress)
- Overlay integrations with custom APIs: `[|||||-----] 50%`
- Event system triggers effects (donation-style, TTS, animations): `[||--------] 2%`
- OBS integration (browser source + reload safety): `[----------] 0%`
- Basic Twitch plugin (connect + at least one signal as data source): `[----------] 0%`
- Designer usable for real overlays (create/save/load/persist): `[|||-------] 0%`

### v0.2
Goal: Expand real-time interaction features.

Acceptance criteria (progress)
- TTS plugin (configurable, reliable, event-driven): `[----------] 0%`

## Release rules (acceptance baseline)
- Each milestone ships with a short demo scenario that validates the criteria above.
- Core feature paths are documented (configure, run, test).
- No regressions in Designer save/load and preview.
