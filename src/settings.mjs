import { MODULE_ID, SETTINGS as KEYS } from "./constants.mjs";
const PATREON_URL = "https://www.patreon.com/cw/Minstrel_N";
export function installFullVersionBanner(app, html) {
  const root = app?.element ?? html;
  const main = root?.querySelector?.('[data-application-part="main"]');
  if (!main) return;
  const category = [...main.querySelectorAll('[data-category]')]
    .find(element => element.dataset.category === MODULE_ID)
    ?? main.querySelector(`[data-tab="${MODULE_ID}"]`)
    ?? main.querySelector(`[name="${MODULE_ID}.${KEYS.visionWarnings}"]`)?.closest('[data-category], [data-tab]');
  if (!category || category.querySelector('.npds-lite-promo')) return;
  const banner = document.createElement('a');
  banner.className = 'npds-lite-promo';
  banner.href = PATREON_URL;
  banner.target = '_blank';
  banner.rel = 'noopener noreferrer';
  for (const key of ['Eyebrow', 'Title', 'Point1', 'Point2', 'Cta']) {
    const element = document.createElement(key.startsWith('Point') ? 'strong' : 'span');
    element.className = `npds-lite-promo__${key.startsWith('Point') ? 'point' : key.toLowerCase()}`;
    element.textContent = game.i18n.localize(`NPDSL.Promo.${key}`);
    banner.append(element);
  }
  category.prepend(banner);
}
export function registerSettings() {
  const register = (key, scope, defaults) => game.settings.register(MODULE_ID, key, { scope, config: true, ...defaults });
  for (const key of [KEYS.visionWarnings, KEYS.calendarNotifications, KEYS.emphasizeTimeJumps]) {
    const names = { visionWarnings: "VisionWarnings", calendarNotifications: "CalendarNotifications", emphasizeTimeJumps: "EmphasizeTimeJumps" };
    register(key, key === KEYS.emphasizeTimeJumps ? "client" : "world", {
      name: `NPDS.Settings.${names[key]}.Name`, hint: `NPDS.Settings.${names[key]}.Hint`, type: Boolean, default: true,
      onChange: () => Hooks.callAll(`${MODULE_ID}.settingsChanged`, key),
    });
  }
  register(KEYS.dockEffectsPanel, "client", {
    name: "NPDS.Settings.DockEffectsPanel.Name", hint: "NPDS.Settings.DockEffectsPanel.Hint",
    type: Boolean, default: true, config: game.system.id === "pf2e", requiresReload: true,
  });
  register(KEYS.emphasisMinimumSeconds, "client", { name: "NPDS.Settings.EmphasisMinimumSeconds.Name", hint: "NPDS.Settings.EmphasisMinimumSeconds.Hint", type: Number, default: 300, range: { min: 0, max: 3600, step: 30 } });
}
