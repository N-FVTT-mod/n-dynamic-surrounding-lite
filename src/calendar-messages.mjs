import { localize } from "./model.mjs";

// Pathfinder Society season titles are paired with the AR year in which the season begins.
// Seasons launch around August; these titles are used only for the New Year notice.
export function calendarNoticeText(kind, state) {
  const pf2e = game.system?.id === "pf2e";
  const value = kind === "year" ? state.yearLabel : kind === "month" ? state.monthLabel : state.seasonLabel;
  if (kind === "season") {
    const key = `NPDS.CalendarNotice.Seasons.${state.season}`;
    return game.i18n.has(key) ? localize(key) : localize("NPDS.CalendarNotice.GenericSeason", { season: value });
  }
  if (kind === "month") {
    const key = `NPDS.CalendarNotice.PF2Months.${state.monthIndex + 1}`;
    return pf2e && game.i18n.has(key) ? localize(key) : localize("NPDS.CalendarNotice.GenericMonth", { month: value });
  }
  const year = Number(state.yearValue);
  const key = `NPDS.CalendarNotice.PF2Years.${year}`;
  if (pf2e && (game.pf2e?.worldClock?.dateTheme ?? "AR") === "AR" && game.i18n.has(key)) {
    return localize("NPDS.CalendarNotice.NamedYear", { title: localize(key), year });
  }
  return localize("NPDS.CalendarNotice.GenericYear", { year: value });
}
