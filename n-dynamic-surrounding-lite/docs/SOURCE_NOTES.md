# Lite source notes

## Scope and layout

This independent module shows Foundry world time through an HTML/CSS clock, calendar, Scene-light badge, notifications, token-vision warnings, and optional time-jump emphasis. It does not calculate weather or write darkness. `module.json` loads `src/main.mjs` and `css/clock.css`.

- `main.mjs`: lifecycle hooks, coalesced calendar notices, and cross-file orchestration.
- `model.mjs`: active calendar and PF2E world-clock date conversion.
- `hud.mjs`: clock DOM, positioning, animation, and observers.
- `scene-light.mjs` / `light-engine.mjs`: current Scene darkness and light messages.
- `vision.mjs` / `system-compat.mjs`: token warnings and optional PF2E capability detection.
- `settings.mjs`: four settings and the Patreon banner.
- `calendar-messages.mjs`: localized calendar prose and year-title lookup.
- `authority.mjs`: single-active-GM selection for chat messages.

## Lifecycle and state

`init` registers settings and hooks once. `ready` creates the HUD, observes current Scene light, and refreshes token warnings. `canvasReady` reattaches Scene observation and rebuilds HUD state. `updateWorldTime` updates the clock and queues calendar notices, merging short bursts of updates before posting. `lightingRefresh`, `darknessChange`, and `updateScene` refresh the light badge and coalesce light notices. Resize and MutationObservers reposition the clock when the sidebar changes; installing them disconnects prior instances.

Settings live under the `n-dynamic-surrounding-lite` namespace. `visionWarnings` and `calendarNotifications` are world settings; `emphasizeTimeJumps` and `emphasisMinimumSeconds` are client settings. Non-PF2E actors may optionally carry `n-dynamic-surrounding-lite.vision` flags. No socket is used. Chat notices are sent by the active GM with the lowest user ID among connected GMs; clients otherwise only render UI. There is no public cross-module API or dependency on the full edition.

## External points to recheck

- Foundry v14: `game.time.worldTime`, active calendar conversion, `updateWorldTime`, Scene `environment.darknessLevel`, `canvas.darknessLevel`, `canvas.environment` events, sidebar DOM, `renderSettingsConfig`, and `game.i18n.has`/`format`.
- PF2E: `game.pf2e.worldClock.worldCreatedOn`, `dateTheme`, `CONFIG.PF2E.worldClock` month names and offsets, and actor `hasLowLightVision` / `hasDarkvision`.
- UI: compact or expanded sidebar, effects controls, smaller screens, and multiple active modules sharing the right edge.
- Rights: PF2E calendar names and season titles require publisher review before a GitHub release that promotes the paid edition.

The module has no schema-version marker or migration runner yet because current persisted settings are primitive and unchanged. Add both before modifying saved keys or flag structure. The current full module does not own Lite settings or flags.
