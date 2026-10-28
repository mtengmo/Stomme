import type { WeeklySchedule } from '../domain/types';
import { addDays, isRealDate, weekdayIndex } from '../lib/dates';

/** Strict runtime check shared by the UI and backup validation. */
export function isWeeklySchedule(value: unknown): value is WeeklySchedule {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).some((key) => key !== 'days' && key !== 'moved'))
    return false;
  if (
    !Array.isArray(candidate.days) ||
    candidate.days.length < 1 ||
    candidate.days.length > 3 ||
    candidate.days.some(
      (day) =>
        !Number.isInteger(day) || (day as number) < 1 || (day as number) > 7,
    ) ||
    new Set(candidate.days).size !== candidate.days.length
  )
    return false;
  if (candidate.moved === undefined) return true;
  if (
    !candidate.moved ||
    typeof candidate.moved !== 'object' ||
    Array.isArray(candidate.moved)
  )
    return false;
  const moved = candidate.moved as Record<string, unknown>;
  return (
    Object.keys(moved).length === 2 &&
    Object.keys(moved).every((key) => key === 'from' || key === 'to') &&
    isRealDate(moved.from) &&
    isRealDate(moved.to) &&
    moved.from !== moved.to &&
    candidate.days.includes(weekdayIndex(moved.from) + 1)
  );
}

/** Invalid or absent persisted values are treated as no plan. */
export function readWeeklySchedule(value: unknown): WeeklySchedule | null {
  if (!isWeeklySchedule(value)) return null;
  return value.moved
    ? { days: [...value.days], moved: { ...value.moved } }
    : { days: [...value.days] };
}

/** First planned local date on or after today, applying one valid future move. */
export function nextPlannedDate(
  schedule: WeeklySchedule | null,
  today: string,
  completedDates: readonly string[] = [],
): string | null {
  if (!isRealDate(today) || !schedule || !isWeeklySchedule(schedule))
    return null;
  const occurrences: string[] = [];
  const completed = new Set(completedDates);
  for (let offset = 0; offset < 366; offset += 1) {
    const date = addDays(today, offset);
    if (
      schedule.days.includes(weekdayIndex(date) + 1) &&
      date !== schedule.moved?.from &&
      !completed.has(date)
    ) {
      occurrences.push(date);
    }
  }
  if (
    schedule.moved &&
    schedule.moved.to >= today &&
    !completed.has(schedule.moved.to)
  ) {
    occurrences.push(schedule.moved.to);
  }
  return occurrences.sort()[0] ?? null;
}

/** Next occurrence of a chosen day, including today. */
export function nextOccurrence(today: string, weekday: number): string | null {
  if (
    !isRealDate(today) ||
    !Number.isInteger(weekday) ||
    weekday < 1 ||
    weekday > 7
  )
    return null;
  const delta = (weekday - 1 - weekdayIndex(today) + 7) % 7;
  return addDays(today, delta);
}
