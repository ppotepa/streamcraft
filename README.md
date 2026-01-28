# StreamCraft

A real-time overlay application for StarCraft 2 streamers. Displays player stats, MMR tracking, opponent info, and match metrics directly on stream. Built with ASP.NET Core and integrates with the SC2Pulse API for ladder data.

The app runs locally and serves web-based overlays that you can add as browser sources in OBS. Features include live session panels, MMR progression tracker, match history charts, and even ISS location tracking for fun. Each module (called "Bits") is independently loaded and configurable.

Currently supports SC2 competitive tracking with clean UI components using Preact/Solid. The system polls game data and updates overlays in real-time without requiring manual refresh.

---

**Note:** This is highly experimental. Still figuring out if real-time season tracking is even possible with current APIs. Code is pretty dirty right now and subject to general refactoring as I learn what actually works.
