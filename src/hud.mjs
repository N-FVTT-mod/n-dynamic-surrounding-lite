import { MODULE_ID, SETTINGS, CLOCK_ID } from "./constants.mjs";
import { currentDateTime, datePanelData, localize } from "./model.mjs";
import { lightLevelAt } from "./light-engine.mjs";

const CLOCK_SCALE_DURATION_MS = 900;
const CLOCK_IDLE_COLLAPSE_MS = 4700;
const CLOCK_HAND_DURATION_MS = 3600;
const DATE_ROLL_DURATION_MS = CLOCK_HAND_DURATION_MS * 4;

let clockAngles = null;
let clockResizeObserver = null;
let clockMutationObserver = null;
let clockExpansionPromise = null;
let collapseTimer = null;
let collapseFinishTimer = null;
let pendingClockWorldTime = null;
let dateDisplayState = null;
const dateRollTimers = new Map();
let combatPassiveUntil = 0;
let combatPassivePending = false;
let resizeBound = false;

function nowMs() {
  return globalThis.performance?.now?.() ?? Date.now();
}

export function markCombatTimeUpdate() {
  combatPassivePending = true;
  combatPassiveUntil = nowMs() + 1500;
}

function detectPassiveTimeAdvance(delta, options = {}) {
  const now = nowMs();
  if (combatPassivePending && now <= combatPassiveUntil) {
    combatPassivePending = false;
    return true;
  }
  if (now > combatPassiveUntil) combatPassivePending = false;
  if (options?.npds?.passive === true || options?.dynamicSurrounding?.passive === true) return true;
  return false;
}

function dateFieldHTML(key, labelKey) {
  return `
    <div class="npds-smart-date-field npds-smart-date-field--${key}">
      <div class="npds-smart-date-value-window" data-date-field="${key}" aria-label="${foundry.utils.escapeHTML(localize(labelKey))}" aria-live="polite">
        <span class="npds-smart-date-value is-current"></span>
      </div>
    </div>`;
}

function clockHTML() {
  const ticks = Array.from({ length: 12 }, (_, i) => `<i class="npds-lite-tick" style="--tick:${i}" aria-hidden="true"></i>`).join("");
  return `<aside id="${CLOCK_ID}" class="npds-lite-clock" aria-label="${foundry.utils.escapeHTML(localize("NPDS.HUD.Clock"))}">
    <div class="npds-smart-clock__timepiece">
      <div class="npds-smart-clock__dial" aria-hidden="true">
        ${ticks}<b class="npds-lite-numeral is-12">12</b><b class="npds-lite-numeral is-3">3</b><b class="npds-lite-numeral is-6">6</b><b class="npds-lite-numeral is-9">9</b>
        <span class="npds-lite-light-indicator"><span class="npds-lite-light-symbol"></span><span class="npds-lite-light-label"></span></span>
        <i class="npds-smart-clock__hand npds-smart-clock__hand--hour"></i>
        <i class="npds-smart-clock__hand npds-smart-clock__hand--minute"></i>
        <i class="npds-lite-pivot"></i>
      </div>
      <div class="npds-smart-date-panel" aria-label="${foundry.utils.escapeHTML(localize("NPDS.HUD.DateAndSeason"))}">
        ${dateFieldHTML("year", "NPDS.HUD.Year")}${dateFieldHTML("month", "NPDS.HUD.Month")}${dateFieldHTML("day", "NPDS.HUD.Day")}
        <div class="npds-lite-season"></div>
      </div>
    </div>
  </aside>`;
}

function finishDateRoll(field, value) {
  field.classList.remove("is-rolling");
  const timer = dateRollTimers.get(field);
  if (timer) clearTimeout(timer);
  dateRollTimers.delete(field);
  field.innerHTML = `<span class="npds-smart-date-value is-current"></span>`;
  setDateValue(field.querySelector(".npds-smart-date-value"), value);
  field.dataset.currentValue = value;
  field.dataset.targetValue = value;
  fitDateField(field);
}

function setDateValue(valueElement, value) {
  if (!valueElement) return;
  const text = document.createElement("span");
  text.className = "npds-smart-date-value__text";
  text.dataset.fullValue = String(value);
  text.textContent = String(value);
  valueElement.replaceChildren(text);
}

function fitDateField(field) {
  const available = field.clientWidth - 3;
  if (available <= 0) return;
  for (const text of field.querySelectorAll(".npds-smart-date-value__text")) {
    const fullValue = text.dataset.fullValue ?? text.textContent ?? "";
    text.textContent = fullValue;
    text.style.fontSize = "";
    const width = text.scrollWidth;
    if (width > available) {
      const baseSize = Number.parseFloat(getComputedStyle(text).fontSize);
      if (Number.isFinite(baseSize)) text.style.fontSize = `${baseSize * available / width * 0.98}px`;
    }
  }
}

function fitDateValues() {
  for (const field of document.getElementById(CLOCK_ID)?.querySelectorAll(".npds-smart-date-value-window") ?? []) {
    fitDateField(field);
  }
}

function updateDateField(key, value, { immediate = false, animate = true } = {}) {
  const field = document.getElementById(CLOCK_ID)?.querySelector(`[data-date-field="${key}"]`);
  if (!(field instanceof HTMLElement)) return;
  const target = String(value ?? "");
  const prior = field.dataset.targetValue ?? field.dataset.currentValue ?? field.textContent?.trim() ?? "";
  if (prior === target && !immediate) return fitDateField(field);
  if (dateRollTimers.has(field)) clearTimeout(dateRollTimers.get(field));
  dateRollTimers.delete(field);
  field.classList.remove("is-rolling");
  if (immediate || !animate || !prior) return finishDateRoll(field, target);
  field.dataset.targetValue = target;
  field.innerHTML = `<span class="npds-smart-date-value is-old"></span><span class="npds-smart-date-value is-new"></span>`;
  setDateValue(field.querySelector(".is-old"), prior);
  setDateValue(field.querySelector(".is-new"), target);
  fitDateField(field);
  void field.offsetHeight;
  requestAnimationFrame(() => field.classList.add("is-rolling"));
  dateRollTimers.set(field, setTimeout(() => finishDateRoll(field, target), DATE_ROLL_DURATION_MS + 80));
}

export function updateDatePanel({ immediate = false, animate = true } = {}) {
  const clock = document.getElementById(CLOCK_ID);
  if (!clock) return;
  const data = datePanelData();
  const noAnimation = immediate || dateDisplayState === null;
  updateDateField("year", data.year, { immediate: noAnimation, animate });
  updateDateField("month", data.month, { immediate: noAnimation, animate });
  updateDateField("day", data.day, { immediate: noAnimation, animate });
  clock.querySelector(".npds-lite-season").textContent = data.seasonLabel;
  const panel = clock.querySelector(".npds-smart-date-panel");
  panel?.classList.toggle("is-date-immediate", noAnimation || !animate);
  if (noAnimation || !animate) requestAnimationFrame(() => panel?.classList.remove("is-date-immediate"));
  dateDisplayState = data;
}

function sidebarAnchor() {
  const expanded = Boolean(globalThis.ui?.sidebar?.expanded);
  const clock = document.getElementById(CLOCK_ID);
  const clockTop = clock?.getBoundingClientRect().top ?? 10;
  const clockBottom = clockTop + (clock?.offsetHeight ?? 300);
  const controls = document.querySelectorAll([
    "#sidebar-tabs [data-tab]", "#sidebar-tabs button",
    "#ui-right-column-1 button", "#ui-right-column-1 [role='button']",
    "#ui-right-column-2 button", "#ui-right-column-2 [role='button']",
  ].join(", "));
  const lefts = [];
  for (const element of controls) {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    if (style.display !== "none" && style.visibility !== "hidden"
      && !element.closest?.("[hidden]")
      && rect.width >= 16 && rect.width <= 160 && rect.height >= 16 && rect.height <= 120
      && rect.right > window.innerWidth * 0.5
      && rect.top < clockBottom && rect.bottom > clockTop) lefts.push(rect.left);
  }
  if (expanded) {
    const content = document.getElementById("sidebar-content");
    if (content && getComputedStyle(content).display !== "none") {
      const rect = content.getBoundingClientRect();
      if (rect.width > 0 && rect.left > window.innerWidth * 0.3) lefts.push(rect.left);
    }
  }
  if (lefts.length) return Math.min(...lefts);
  // The full module uses the sidebar tab rail as its fallback anchor.
  const tabs = document.getElementById("sidebar-tabs");
  return tabs?.getBoundingClientRect().left ?? null;
}
export function positionClock() {
  const clock = document.getElementById(CLOCK_ID);
  if (!clock) return;
  const left = sidebarAnchor() ?? window.innerWidth - 54;
  clock.style.removeProperty("width");
  const available = Math.max(96, Math.floor(left - 18));
  if (clock.offsetWidth > available) clock.style.width = `${available}px`;
  const right = Math.max(6, window.innerWidth - left + 10);
  clock.style.setProperty("--npds-lite-right", `${Math.min(right, Math.max(6, window.innerWidth - clock.offsetWidth - 6))}px`);
  fitDateValues();
}
function installClockObservers() {
  clockResizeObserver?.disconnect();
  clockMutationObserver?.disconnect();
  const targets = ["sidebar-content", "sidebar-tabs", "sidebar", "ui-right-column-1", "ui-right-column-2"].map(id => document.getElementById(id)).filter(Boolean);
  if (globalThis.ResizeObserver) {
    clockResizeObserver = new ResizeObserver(positionClock);
    for (const target of targets) clockResizeObserver.observe(target);
  }
  clockMutationObserver = new MutationObserver(positionClock);
  for (const target of targets) clockMutationObserver.observe(target, { attributes: true, childList: true, subtree: true });
  if (!resizeBound) { resizeBound = true; window.addEventListener("resize", positionClock, { passive: true }); }
}
function updateClockAngles(worldTime, { immediate = false } = {}) {
  const dateTime = currentDateTime();
  const hour = dateTime?.hour ?? Math.floor(worldTime / 3600);
  const minute = dateTime?.minute ?? (Math.floor(worldTime / 60) % 60);
  const second = dateTime?.second ?? (Math.floor(worldTime) % 60);
  const normalizedMinute = (minute + second / 60) * 6;
  const normalizedHour = (((hour % 12 + 12) % 12) + minute / 60 + second / 3600) * 30;
  if (!clockAngles || immediate) clockAngles = { worldTime, minute: normalizedMinute, hour: normalizedHour };
  else {
    const delta = Number(worldTime) - Number(clockAngles.worldTime);
    let minuteDelta = (delta / 60) * 6;
    let hourDelta = (delta / 3600) * 30;
    if (Math.abs(minuteDelta) > 720) minuteDelta %= 360;
    if (Math.abs(hourDelta) > 720) hourDelta %= 360;
    if (delta !== 0 && Math.abs(minuteDelta) < 0.001 && Math.abs(delta) >= 3600) minuteDelta = Math.sign(delta) * 360;
    clockAngles = { worldTime, minute: clockAngles.minute + minuteDelta, hour: clockAngles.hour + hourDelta };
  }
  const clock = document.getElementById(CLOCK_ID);
  if (!clock) return;
  clock.classList.toggle("is-immediate", immediate);
  clock.querySelector(".npds-smart-clock__hand--hour")?.style.setProperty("--hand-angle", `${clockAngles.hour}deg`);
  clock.querySelector(".npds-smart-clock__hand--minute")?.style.setProperty("--hand-angle", `${clockAngles.minute}deg`);
  if (immediate) requestAnimationFrame(() => clock.classList.remove("is-immediate"));
}

function waitForClockExpansion(clock) {
  const timepiece = clock.querySelector(".npds-smart-clock__timepiece");
  if (!(timepiece instanceof HTMLElement)) return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      timepiece.removeEventListener("transitionend", onTransitionEnd);
      clearTimeout(fallback);
      resolve();
    };
    const onTransitionEnd = (event) => {
      if (event.target === timepiece && event.propertyName === "transform") finish();
    };
    const fallback = setTimeout(finish, CLOCK_SCALE_DURATION_MS + 120);
    timepiece.addEventListener("transitionend", onTransitionEnd);
  });
}

function scheduleCollapse() {
  clearTimeout(collapseTimer);
  collapseTimer = setTimeout(() => {
    const clock = document.getElementById(CLOCK_ID);
    if (!clock || pendingClockWorldTime !== null || clockExpansionPromise) return;
    clock.classList.add("is-time-collapsing");
    clock.classList.remove("is-time-expanded");
    clearTimeout(collapseFinishTimer);
    collapseFinishTimer = setTimeout(() => clock.classList.remove("is-time-collapsing"), CLOCK_SCALE_DURATION_MS + 100);
  }, CLOCK_IDLE_COLLAPSE_MS);
}

async function emphasizeTime(worldTime) {
  const clock = document.getElementById(CLOCK_ID);
  if (!clock) return;
  pendingClockWorldTime = Number(worldTime);
  clearTimeout(collapseTimer);
  clearTimeout(collapseFinishTimer);

  if (clock.classList.contains("is-time-collapsing")) {
    clock.classList.remove("is-time-collapsing");
    clock.classList.add("is-time-expanded");
    const target = pendingClockWorldTime;
    pendingClockWorldTime = null;
    updateClockAngles(target, { immediate: false });
    refreshClock({ syncHands: false, animateDate: true });
    scheduleCollapse();
    return;
  }

  if (!clock.classList.contains("is-time-expanded")) {
    clock.classList.add("is-time-expanded");
    clockExpansionPromise ??= waitForClockExpansion(clock).finally(() => { clockExpansionPromise = null; });
  }
  if (clockExpansionPromise) await clockExpansionPromise;
  const target = pendingClockWorldTime;
  if (target !== null) {
    pendingClockWorldTime = null;
    updateClockAngles(target, { immediate: false });
    refreshClock({ syncHands: false, animateDate: true });
  }
  scheduleCollapse();
}

export function refreshClock({ immediate = false, syncHands = false, animateDate = true, updateDate = true } = {}) {
  const clock = document.getElementById(CLOCK_ID);
  if (!clock || !game?.time) return;
  if (syncHands || immediate) updateClockAngles(game.time.worldTime, { immediate });
  const dt = currentDateTime();
  const calendar = datePanelData(dt);
  const timeText = dt ? `${String(dt.hour).padStart(2, "0")}:${String(dt.minute).padStart(2, "0")}` : "--:--";
  const light = lightLevelAt();
  const label = localize(`NPDS.Light.${light[0].toUpperCase()}${light.slice(1)}`);
  const title = `${calendar.year} · ${calendar.month} · ${calendar.day} · ${calendar.seasonLabel} · ${timeText} · ${label}`;
  clock.querySelector(".npds-smart-clock__timepiece").title = title;
  clock.querySelector(".npds-smart-date-panel").title = title;
  clock.dataset.light = light;
  clock.setAttribute("aria-label", title);
  clock.querySelector(".npds-lite-light-symbol").textContent = { bright: "☀", dim: "◐", dark: "☾" }[light];
  clock.querySelector(".npds-lite-light-label").textContent = label;
  if (updateDate) updateDatePanel({ immediate, animate: animateDate });
}
export function handleTimeVisualUpdate(worldTime, delta, options = {}) {
  const numericDelta = Number(delta) || 0;
  const passive = detectPassiveTimeAdvance(numericDelta, options);
  const threshold = Number(game.settings.get(MODULE_ID, SETTINGS.emphasisMinimumSeconds) ?? 300);
  const canEmphasize = game.settings.get(MODULE_ID, SETTINGS.emphasizeTimeJumps)
    && !passive && Math.abs(numericDelta) >= threshold;
  if (canEmphasize) {
    void emphasizeTime(worldTime);
  } else {
    updateClockAngles(worldTime, { immediate: false });
    refreshClock({ syncHands: false, animateDate: true });
  }
  return { passive, emphasized: canEmphasize };
}

export function installClockWidget() {
  let clock = document.getElementById(CLOCK_ID);
  if (!clock) { document.body.insertAdjacentHTML("beforeend", clockHTML()); clock = document.getElementById(CLOCK_ID); }
  if (!clock) return;
  installClockObservers();
  refreshClock({ immediate: true, syncHands: true });
  positionClock();
  document.fonts?.ready.then(fitDateValues);
}
