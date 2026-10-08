import { SEASONS } from "./constants.mjs";
import { isPF2e } from "./system-compat.mjs";
export function localize(key, data = null) { return data ? game.i18n.format(key, data) : game.i18n.localize(key); }
export function seasonForDateTime(dateTime = currentDateTime()) {
  const nativeSeason = Number(dateTime?.season);
  if (Number.isInteger(nativeSeason) && nativeSeason >= 0 && nativeSeason <= 3) return Object.keys(SEASONS)[nativeSeason];
  const month = Number(dateTime?.month ?? 0);
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "autumn";
  return "winter";
}

function dateTimeAt(worldTime = game.time?.worldTime ?? 0) {
  const timestamp = Number(worldTime) || 0;
  const pf2Clock = isPF2e() ? game.pf2e?.worldClock : null;
  const pf2Date = pf2Clock?.worldCreatedOn?.plus?.({ seconds: timestamp });
  if (pf2Date?.isValid) {
    const dateTheme = pf2Clock.dateTheme;
    const yearOffset = Number(CONFIG.PF2E?.worldClock?.[dateTheme]?.yearOffset ?? 0);
    let displayMonth = pf2Date.monthLong;
    if (["AR", "IC", "AG"].includes(dateTheme)) {
      const monthKey = CONFIG.PF2E?.worldClock?.AR?.Months?.[pf2Date.setLocale("en-US").monthLong];
      if (monthKey) displayMonth = localize(monthKey);
    }
    return {
      year: pf2Date.year,
      month: pf2Date.month - 1,
      dayOfMonth: pf2Date.day - 1,
      hour: pf2Date.hour,
      minute: pf2Date.minute,
      second: pf2Date.second,
      timestamp,
      displayYear: pf2Date.year + yearOffset,
      displayMonth,
      displayDay: pf2Date.day,
      era: pf2Clock.era ?? "",
      plus: ({ seconds = 0 } = {}) => dateTimeAt(timestamp + Number(seconds || 0)),
      minus: ({ seconds = 0 } = {}) => dateTimeAt(timestamp - Number(seconds || 0)),
    };
  }
  const components = game.time?.calendar?.timeToComponents?.(timestamp) ?? game.time?.components;
  if (!components) return null;
  const monthIndex = Number(components.month ?? 0);
  const calendarMonth = game.time?.calendar?.months?.values?.[monthIndex];
  const yearZero = Number(game.time?.calendar?.years?.yearZero ?? 0);
  return {
    ...components,
    timestamp,
    displayYear: Number(components.year ?? 0) + yearZero,
    displayMonth: calendarMonth?.name ? localize(calendarMonth.name) : String(monthIndex + 1),
    displayDay: Number(components.dayOfMonth ?? components.day ?? 0) + 1,
    era: "",
    plus: ({ seconds = 0 } = {}) => dateTimeAt(timestamp + Number(seconds || 0)),
    minus: ({ seconds = 0 } = {}) => dateTimeAt(timestamp - Number(seconds || 0)),
  };
}

export function currentDateTime(worldTime = game.time?.worldTime ?? 0) {
  return dateTimeAt(worldTime);
}

export function timeToMinutes(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value ?? ""));
  if (!match) return 0;
  return Math.clamp(Number(match[1]) * 60 + Number(match[2]), 0, 1439);
}

export function minutesToTime(value) {
  const minutes = ((Math.round(Number(value) || 0) % 1440) + 1440) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function offsetTime(value, offset) {
  return minutesToTime(timeToMinutes(value) + Number(offset || 0));
}

export function seasonLabel(seasonId) { return localize(SEASONS[seasonId] ?? SEASONS.spring); }
export function datePanelData(dateTime = currentDateTime()) {
  if (!dateTime) return { year: "----", month: "--", day: "--", season: "spring" };
  const season = seasonForDateTime(dateTime);
  const yearValue = Number(dateTime.displayYear ?? dateTime.year ?? 0);
  const era = String(dateTime.era ?? "");
  const monthIndex = Number(dateTime.month ?? 0);
  const chineseMonth = /^(zh|cn)/i.test(String(game.i18n.lang ?? ""));
  const chineseNumerals = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"];
  return {
    yearValue,
    year: `${yearValue} ${era}`.trim(),
    monthIndex,
    month: chineseMonth && monthIndex >= 0 && monthIndex < 12
      ? `${chineseNumerals[monthIndex]}月`
      : String(dateTime.displayMonth ?? monthIndex + 1),
    day: String(dateTime.displayDay ?? Number(dateTime.dayOfMonth ?? dateTime.day ?? 0) + 1),
    season,
    seasonLabel: seasonLabel(season),
  };
}

export function calendarNoticeState(dateTime = currentDateTime()) {
  const data = datePanelData(dateTime);
  return { yearValue: data.yearValue, monthIndex: data.monthIndex, season: data.season, yearLabel: data.year, monthLabel: data.month, seasonLabel: data.seasonLabel };
}

