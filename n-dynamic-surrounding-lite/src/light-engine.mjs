import { MODULE_ID, SETTINGS, LIGHT_LEVELS } from "./constants.mjs";
import { localize } from "./model.mjs";
import { isAuthorityGM } from "./authority.mjs";

export function lightLevelFromDarkness(value) {
  const darkness = Number(value);
  if (!Number.isFinite(darkness)) return "bright";
  if (darkness >= 0.65) return "dark";
  if (darkness >= 0.325) return "dim";
  return "bright";
}

export function lightLevelAt() {
  const scene = canvas?.scene;
  if (!scene) return "bright";
  const live = canvas?.ready ? Number(canvas.darknessLevel) : NaN;
  if (Number.isFinite(live)) return lightLevelFromDarkness(live);
  return lightLevelFromDarkness(scene.environment?.darknessLevel);
}

function transitionText(level, phase) {
  const key = phase ? `NPDS.LightMessage.${phase}` : `NPDS.LightMessage.${level}`;
  return localize(key);
}

export async function postLightMessage(level, phase = null) {
  if (!isAuthorityGM() || !game.settings.get(MODULE_ID, SETTINGS.calendarNotifications)) return;
  const label = localize((LIGHT_LEVELS[level] ?? LIGHT_LEVELS.bright).labelKey);
  const content = `<div class="npds-lite-chat"><strong>${foundry.utils.escapeHTML(label)}</strong><span>${foundry.utils.escapeHTML(transitionText(level, phase))}</span></div>`;
  await ChatMessage.create({ speaker: { alias: localize("NPDS.Chat.Speaker") }, content });
}
