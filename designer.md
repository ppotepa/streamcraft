# StreamCraft Designer — purpose, flow, screens

Last updated: 2026-02-01

## What this UI designer is

The StreamCraft Designer is a visual editor for building stream overlays from data sources. It lets a non‑developer assemble widgets on a canvas, bind them to data coming from public APIs or system sources, and preview the resulting overlay. The Designer is meant to be the entry point for “no‑code” overlay creation and a bridge between data and presentation.

## Core outcomes

- Enable fast overlay prototyping without code.
- Make data sources discoverable and bindable through metadata (or models when available).
- Provide an intuitive drag‑and‑drop layout surface that mirrors actual broadcast layouts.
- Allow users to preview or validate bindings before deploying overlays.

## Current flow (intended)

1) **Pick widgets from the palette** — click to add; palette is trimmed to Text, Image/GIF, and Marquee.
2) **Bind data** — each widget is configured via the double‑click editor (Source → Endpoint → Field, plus format). API metadata or typed models supply the fields.
3) **Arrange** — drag/resize with Moveable; optional grid and snap; safe zone overlay for broadcast framing.
4) **Preview** — live preview modal draws widgets over a looping video so users see overlay contrast and spacing.
- Preview — live preview modal draws widgets over a looping video so users see overlay contrast and spacing; opening preview triggers fresh fetches for bound widgets.
5) **Save/Publish** — layout is persisted to backend (future: multiple projects/scenes).

## Data model basics

- **Widgets**: `id`, `widgetKind`, `title`, `textContent`, `x/y/width/height`, `sourceId`, `endpointPath`, `fieldPath`, `format`, `template`, `pollIntervalMs`, `textColor`, `fontSize`, `fontWeight`, `textAlign`.
- **Sources/Endpoints**: loaded from `/designer/sources`; previews cached per source; test calls via `/public-api-sources/test`.
- **Metadata**: prefer typed models when available; fallback to metadata (`ApiResponseMetadata.fields`) for arbitrary APIs. Use models for known APIs; keep metadata for custom/unknown APIs.
- **Virtual data state**: dictionary keyed by `sourceId|endpointPath` holding the latest payload (populated via tests for now) that widgets resolve their bound field from.

## Screen index (see detailed files)

- 1.0 Main Designer — palette, canvas, footer explorer.
- 1.1 Widget Editor Modal — double‑click edit surface for bindings and layout.
- 1.2 Preview Modal — read‑only overlay on video background.

## What the UI achieves now

- Full‑page designer shell (header, tools row, canvas, footer).
- Palette with click-to-add widgets (Text, Image/GIF, Marquee) and default sizing. Text overlays are chrome-free (plain text) and can be styled in the editor.
- Drag/resize with Moveable, optional grid, snap, and safe zone.
- Double‑click modal editor for binding and layout edits.
- Live preview modal with background video and overlay render.
- Metadata explorer (footer) showing available fields and the latest payload/test response.
- API metadata persistence for faster load and stable bindings.

## Current friction

- Widget preview reliability depends on preview/test payload quality; metadata fallbacks still limited.
- Preview fidelity: needs validation across browsers; safe‑zone and scaling are CSS‑only today.
- Metadata varies by API; sparse leaf fields reduce binding confidence.

## Rough edges

- Widget catalog is intentionally minimal (Text, Image/GIF, Marquee); other shapes are temporarily parked.
- Binding UX lacks filtering, grouping, and type icons; per-widget inline test button lives in editor only.
- No undo/redo; no draft vs. committed state inside the modal (yet).

## Planned/next

- Persistent layouts per project/scene; project switcher.
- Live data refresh on canvas/preview; polling toggle.
- Reintroduce broader widget library (cards, lists, progress) after data model hardening.
- Per-widget formatting and templating; unit/locale helpers.
- Field exploration tree with sample values; type-aware search.
- Widget library expansion (charts, tickers, counters) after the minimal set is stable.

## Summary

The Designer is the visual pipeline from data to overlay. It helps users discover data, bind it to widgets, and position those widgets on a live-scale canvas. Binding is functional, preview is present but needs fidelity polishing, and AutoDetect is basic. Next up: better preview accuracy, richer metadata exploration, and stronger widget rendering.
