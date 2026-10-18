/** Local calendar dates as YYYY-MM-DD strings. No time zone maths on instants. */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Local date of an instant, as YYYY-MM-DD. */
export function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Milliseconds at UTC midnight for a date string (DST-free day arithmetic). */
function utcMs(date: string): number {
  const m = DATE_RE.exec(date);
  if (!m) throw new Error(`Invalid date string: ${date}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function addDays(date: string, days: number): string {
  const d = new Date(utcMs(date) + days * 86_400_000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Whole calendar days from a to b (negative if b is before a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((utcMs(b) - utcMs(a)) / 86_400_000);
}

/** 0 = Monday ... 6 = Sunday. */
export function weekdayIndex(date: string): number {
  const dow = new Date(utcMs(date)).getUTCDay(); // 0 = Sunday
  return (dow + 6) % 7;
}

/** The Monday of the week containing the date. */
export function weekStart(date: string): string {
  return addDays(date, -weekdayIndex(date));
}

/** Monday-first, seven dates of the week containing the date. */
export function weekDates(date: string): string[] {
  const start = weekStart(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

const dateFmt = new Intl.DateTimeFormat('sv-SE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});
const shortFmt = new Intl.DateTimeFormat('sv-SE', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
const weekdayFmt = new Intl.DateTimeFormat('sv-SE', {
  weekday: 'long',
  timeZone: 'UTC',
});

/** E.g. "söndag 18 oktober". */
export function formatLongDate(date: string): string {
  return dateFmt.format(new Date(utcMs(date)));
}

/** E.g. "18 okt.". */
export function formatShortDate(date: string): string {
  return shortFmt.format(new Date(utcMs(date)));
}

/** E.g. "söndag". */
export function formatWeekday(date: string): string {
  return weekdayFmt.format(new Date(utcMs(date)));
}
