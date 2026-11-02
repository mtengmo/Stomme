import { addDays, daysBetween, weekStart } from '../../lib/dates';

/** ISO-8601 week number of the week containing the date. */
export function isoWeekNumber(date: string): number {
  const thursday = addDays(weekStart(date), 3);
  const year = thursday.slice(0, 4);
  const week1Thursday = addDays(weekStart(`${year}-01-04`), 3);
  return Math.round(daysBetween(week1Thursday, thursday) / 7) + 1;
}
