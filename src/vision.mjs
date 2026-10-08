import { MODULE_ID, SETTINGS, VISION_WARNING_NAME, VISION_TOOLTIP_ID } from "./constants.mjs";
import { lightLevelAt } from "./light-engine.mjs";
import { actorVisionCapabilities } from "./system-compat.mjs";

function warningForActor(actor, tokenDocument, level = lightLevelAt()) {
  if (!game.settings.get(MODULE_ID, SETTINGS.visionWarnings)) return null;
  const vision = actorVisionCapabilities(actor, tokenDocument);
  if (!vision.creature) return null;
  if (level === "dim" && !vision.lowLight) {
    return {
      level,
      short: game.i18n.localize("NPDS.Vision.Dim.Short"),
      text: game.i18n.localize("NPDS.Vision.Dim.Text"),
    };
  }
  if (level === "dark" && !vision.darkvision) {
    return {
      level,
      short: game.i18n.localize("NPDS.Vision.Dark.Short"),
      text: game.i18n.localize("NPDS.Vision.Dark.Text"),
    };
  }
  return null;
}

function hideTooltip() {
  document.getElementById(VISION_TOOLTIP_ID)?.remove();
}

function showTooltip(event, warning) {
  hideTooltip();
  const tooltip = document.createElement("div");
  tooltip.id = VISION_TOOLTIP_ID;
  tooltip.className = `npds-vision-tooltip is-${warning.level}`;
  tooltip.innerHTML = `<strong>${foundry.utils.escapeHTML(warning.short)}</strong><span>${foundry.utils.escapeHTML(warning.text)}</span>`;
  document.body.append(tooltip);
  const client = event?.client ?? event?.nativeEvent ?? {};
  const x = Number(client.x ?? client.clientX ?? window.innerWidth / 2);
  const y = Number(client.y ?? client.clientY ?? window.innerHeight / 2);
  tooltip.style.left = `${Math.min(window.innerWidth - 330, Math.max(8, x + 14))}px`;
  tooltip.style.top = `${Math.min(window.innerHeight - 120, Math.max(8, y + 14))}px`;
}

export function removeVisionWarning(token) {
  const existing = token?.getChildByName?.(VISION_WARNING_NAME);
  if (!existing) return;
  token.removeChild(existing);
  existing.destroy?.({ children: true });
}

export function drawVisionWarning(token) {
  if (!token || token.destroyed) return;
  removeVisionWarning(token);
  const warning = warningForActor(token.actor, token.document);
  if (!warning) return;

  const { width, height } = token.document.getSize();
  const size = Math.max(18, Math.min(30, Math.min(width, height) * 0.22));
  const container = new PIXI.Container();
  container.name = VISION_WARNING_NAME;
  container.eventMode = "static";
  container.cursor = "help";
  container.zIndex = 1000;

  const bg = new PIXI.Graphics();
  bg.beginFill(warning.level === "dark" ? 0x33294f : 0x8a6a24, 0.94);
  bg.lineStyle(Math.max(1, size * 0.07), 0xf1d998, 1);
  bg.drawCircle(0, 0, size / 2);
  bg.endFill();
  container.addChild(bg);

  const eye = new PIXI.Graphics();
  const stroke = Math.max(1.4, size * 0.075);
  eye.lineStyle(stroke, 0xffffff, 1);
  eye.moveTo(-size * 0.30, 0);
  eye.bezierCurveTo(-size * 0.17, -size * 0.17, size * 0.17, -size * 0.17, size * 0.30, 0);
  eye.bezierCurveTo(size * 0.17, size * 0.17, -size * 0.17, size * 0.17, -size * 0.30, 0);
  eye.beginFill(0xffffff, 1);
  eye.drawCircle(0, 0, size * 0.075);
  eye.endFill();
  eye.moveTo(-size * 0.25, -size * 0.24);
  eye.lineTo(size * 0.25, size * 0.24);
  container.addChild(eye);

  container.position.set(width - size * 0.58, size * 0.58);
  container.on("pointerover", (event) => showTooltip(event, warning));
  container.on("pointermove", (event) => showTooltip(event, warning));
  container.on("pointerout", hideTooltip);
  token.addChild(container);
}

export function refreshVisionWarnings() {
  hideTooltip();
  if (!canvas.ready) return;
  for (const token of canvas.tokens?.placeables ?? []) drawVisionWarning(token);
}
