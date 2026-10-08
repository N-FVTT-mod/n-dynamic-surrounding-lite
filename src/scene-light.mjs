import { lightLevelAt, postLightMessage } from "./light-engine.mjs";
import { refreshClock } from "./hud.mjs";
import { refreshVisionWarnings } from "./vision.mjs";

let environment = null;
let sceneId = null;
let observedLevel = null;
let noticeTimer = null;

function scheduleLightNotice() {
  clearTimeout(noticeTimer);
  // Darkness animations emit many intermediate changes. Announce the settled level once.
  noticeTimer = setTimeout(() => { noticeTimer = null; void postLightMessage(observedLevel); }, 700);
}

export function observeSceneLight(event) {
  if (!canvas?.ready || !canvas.scene) return;
  if (sceneId !== canvas.scene.id) return installSceneLightObserver();
  const level = lightLevelAt();
  if (observedLevel === null) { observedLevel = level; return; }
  if (level === observedLevel) {
    if (noticeTimer && event?.type === "darknessChange") scheduleLightNotice();
    return;
  }
  observedLevel = level;
  refreshClock({ animateDate: false, updateDate: false });
  refreshVisionWarnings();
  scheduleLightNotice();
}

export function installSceneLightObserver() {
  environment?.removeEventListener?.("darknessChange", observeSceneLight);
  clearTimeout(noticeTimer);
  noticeTimer = null;
  environment = canvas?.environment ?? null;
  sceneId = canvas?.scene?.id ?? null;
  observedLevel = sceneId ? lightLevelAt() : null;
  environment?.addEventListener?.("darknessChange", observeSceneLight);
  refreshClock({ animateDate: false, updateDate: false });
}
