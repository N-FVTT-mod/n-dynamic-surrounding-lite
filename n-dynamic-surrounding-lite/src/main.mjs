import { MODULE_ID, SETTINGS } from "./constants.mjs";
import { registerSettings } from "./settings.mjs";
import { currentDateTime, calendarNoticeState, localize } from "./model.mjs";
import { calendarNoticeText } from "./calendar-messages.mjs";
import { postLightMessage } from "./light-engine.mjs";
import { drawVisionWarning, refreshVisionWarnings } from "./vision.mjs";
import { installClockWidget, handleTimeVisualUpdate, refreshClock, positionClock, markCombatTimeUpdate } from "./hud.mjs";
import { isAuthorityGM } from "./authority.mjs";
import { installSceneLightObserver, observeSceneLight } from "./scene-light.mjs";
import { installFullVersionBanner } from "./settings.mjs";
let ready = false;
let noticeTimer = null;
let pendingNotice = null;
function calendarChanged(before, after) {
  return {
    year: before?.yearValue !== after?.yearValue,
    month: before?.monthIndex !== after?.monthIndex || before?.yearValue !== after?.yearValue,
    season: before?.season !== after?.season,
  };
}

async function postCalendar(kind, state) {
  if (!isAuthorityGM() || !game.settings.get(MODULE_ID, SETTINGS.calendarNotifications)) return;
  const labels = {
    year: localize("NPDS.Chat.NewYear"),
    month: localize("NPDS.Chat.NewMonth"),
    season: localize("NPDS.Chat.NewSeason"),
  };
  const value = calendarNoticeText(kind, state);
  await ChatMessage.create({ speaker: { alias: localize("NPDS.Chat.Speaker") }, content: `<div class="npds-lite-chat"><strong>${foundry.utils.escapeHTML(labels[kind])}</strong><span>${foundry.utils.escapeHTML(value)}</span></div>` });
}

function queueNotice(data) {
  if (!pendingNotice) pendingNotice = data;
  else {
    pendingNotice.afterCalendar = data.afterCalendar;
    pendingNotice.finalLight = data.finalLight;
    pendingNotice.finalLightPhase = data.finalLightPhase;
  }
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(async () => {
    const event = pendingNotice;
    pendingNotice = null;
    noticeTimer = null;
    if (!event) return;
    try {
      const changes = calendarChanged(event.beforeCalendar, event.afterCalendar);
      if (changes.year) await postCalendar("year", event.afterCalendar);
      if (changes.month) await postCalendar("month", event.afterCalendar);
      if (changes.season) await postCalendar("season", event.afterCalendar);
      if (event.initialLight && event.finalLight && event.initialLight !== event.finalLight) await postLightMessage(event.finalLight, event.finalLightPhase);
    } catch (error) {
      console.error(`[${MODULE_ID}] Notification flush failed`, error);
    }
  }, 350);
}

Hooks.once("init", () => {
  registerSettings();
  Hooks.on("renderSettingsConfig", installFullVersionBanner);
  Hooks.on("lightingRefresh", observeSceneLight);
  Hooks.on("collapseSidebar", () => { requestAnimationFrame(positionClock); setTimeout(positionClock, 220); setTimeout(positionClock, 450); });
  Hooks.on(`${MODULE_ID}.settingsChanged`, key => {
    if (!ready) return;
    refreshClock({ immediate: false, syncHands: false, animateDate: false });
    if (key === SETTINGS.visionWarnings) refreshVisionWarnings();
  });
  Hooks.on("combatRound", markCombatTimeUpdate);
  Hooks.on("combatTurn", markCombatTimeUpdate);
  Hooks.on("drawToken", token => { if (game.settings.get(MODULE_ID, SETTINGS.visionWarnings)) drawVisionWarning(token); });
  Hooks.on("updateActor", actor => { if (game.settings.get(MODULE_ID, SETTINGS.visionWarnings) && actor) setTimeout(refreshVisionWarnings, 0); });
  Hooks.on("updateToken", (_token, changes) => { if (game.settings.get(MODULE_ID, SETTINGS.visionWarnings) && ("width" in changes || "height" in changes || "actorId" in changes)) setTimeout(refreshVisionWarnings, 0); });
  Hooks.on("updateScene", (scene, changes) => {
    if (!ready || scene.id !== canvas?.scene?.id) return;
    if (changes.environment?.darknessLevel === undefined && changes["environment.darknessLevel"] === undefined) return;
    requestAnimationFrame(observeSceneLight);
    setTimeout(observeSceneLight, 150);
  });
  Hooks.on("canvasReady", () => { if (!ready) return; installClockWidget(); installSceneLightObserver(); refreshClock({ immediate: true, syncHands: true }); if (game.settings.get(MODULE_ID, SETTINGS.visionWarnings)) refreshVisionWarnings(); });
  Hooks.on("updateWorldTime", (worldTime, delta, options = {}) => {
    if (!ready) return;
    const numericDelta = Number(delta) || 0;
    const afterDate = currentDateTime(worldTime);
    const beforeDate = currentDateTime(Number(worldTime) - numericDelta);
    handleTimeVisualUpdate(worldTime, numericDelta, options);
    if (numericDelta !== 0) queueNotice({ beforeCalendar: calendarNoticeState(beforeDate), afterCalendar: calendarNoticeState(afterDate) });
  });
});
Hooks.once("ready", () => { ready = true; installClockWidget(); installSceneLightObserver(); refreshClock({ immediate: true, syncHands: true }); if (game.settings.get(MODULE_ID, SETTINGS.visionWarnings)) refreshVisionWarnings(); });
