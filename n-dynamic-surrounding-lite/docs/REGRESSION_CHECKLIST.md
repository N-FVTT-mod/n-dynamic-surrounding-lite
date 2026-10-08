# Lite regression checklist

Run on a clean Foundry v14 world and on an existing world before release. Record the exact Foundry build, system version, browser, viewport, tester, and result for each run.

- [ ] Install by local ZIP and by the published manifest; refresh, log out/in, disable/re-enable, then remove the module.
- [ ] Confirm a new world and an existing world load without console errors after removal.
- [ ] Repeat with GM and player clients; ensure only one active GM posts each calendar/light notice.
- [ ] Switch English and Simplified Chinese; check labels, year/month text, chat messages, Patreon banner, and 14-inch/27-inch viewports.
- [ ] Open and close the sidebar and PF2E effects panel; confirm the clock does not cover their buttons or drift from its right anchor.
- [ ] Advance time across day, month, season, and year boundaries; inspect one notice per transition and time-jump emphasis.
- [ ] Change Scene darkness slowly and immediately, switch Scenes, and refresh; verify light badge and notices follow the Scene without writing darkness.
- [ ] Test PF2E PC, NPC, familiar, and hazard token vision where applicable; test a non-PF2E system's fallback sight modes.
- [ ] Disable token warnings, calendar/light messages, and client emphasis separately; verify each disabled behavior stops.
- [ ] Test with the full module enabled and disabled; check namespace independence and right-edge layout.
- [ ] Before GitHub release, verify `module.json` and the ZIP are attached to tag `v1.0.0`, test both URLs, and review Paizo material rights.
