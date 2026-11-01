import { type RoutineFocus, routineFocusIds } from '../content/focusPresets';
import type { Session, WeeklyDayPlan, WeeklySchedule } from '../domain/types';
import { addDays, isRealDate, weekdayIndex } from '../lib/dates';

/** Strict plan guard: custom focus requires regions and is deliberately daily-only. */
export function isWeeklyDayPlan(value: unknown): value is WeeklyDayPlan {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const plan = value as Record<string, unknown>;
  if (plan.kind === 'standard') return Object.keys(plan).length === 1;
  if (plan.kind === 'focus')
    return (
      Object.keys(plan).length === 2 &&
      routineFocusIds.includes(plan.focus as RoutineFocus)
    );
  return (
    plan.kind === 'workout' &&
    Object.keys(plan).length === 2 &&
    typeof plan.workoutId === 'string' &&
    plan.workoutId.length > 0 &&
    plan.workoutId.length <= 100
  );
}
/** Strict runtime check shared by UI and backup validation. */
export function isWeeklySchedule(value: unknown): value is WeeklySchedule {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).some((key) => key !== 'days' && key !== 'moved'))
    return false;
  if (
    !Array.isArray(candidate.days) ||
    candidate.days.length < 1 ||
    candidate.days.length > 5 ||
    candidate.days.some(
      (item) =>
        !item ||
        typeof item !== 'object' ||
        Array.isArray(item) ||
        Object.keys(item).length !== 2 ||
        !Number.isInteger(item.day) ||
        item.day < 1 ||
        item.day > 7 ||
        !isWeeklyDayPlan(item.plan),
    ) ||
    new Set(candidate.days.map((item) => item.day)).size !==
      candidate.days.length
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
    candidate.days.some(
      (item) => item.day === weekdayIndex(moved.from as string) + 1,
    )
  );
}
/** Invalid or absent persisted values are treated as no plan. */
export function readWeeklySchedule(value: unknown): WeeklySchedule | null {
  return isWeeklySchedule(value) ? structuredClone(value) : null;
}
/** Moved occurrences carry the source day's assignment. Unknown workout IDs use Next pass. */
export function planForDate(
  schedule: WeeklySchedule | null,
  date: string,
  workoutIds?: readonly string[],
): WeeklyDayPlan | null {
  if (!schedule || !isRealDate(date) || date === schedule.moved?.from)
    return null;
  const source = date === schedule.moved?.to ? schedule.moved.from : date;
  const plan = schedule.days.find(
    (item) => item.day === weekdayIndex(source) + 1,
  )?.plan;
  if (!plan) return null;
  return plan.kind === 'workout' &&
    workoutIds &&
    !workoutIds.includes(plan.workoutId)
    ? { kind: 'standard' }
    : { ...plan };
}

/**
 * Dates that count as that day's training for the weekly plan. A completed
 * custom workout counts, so the planned day is not shown as missed; it still
 * never advances the A/B sequence or progression (see TrainingHome). Short
 * workouts are not counted.
 */
export function completedTrainingDates(
  sessions: readonly Session[],
  programId: Session['programId'],
): string[] {
  return sessions
    .filter(
      (session) =>
        session.programId === programId &&
        session.status === 'completed' &&
        session.workoutMode !== 'short',
    )
    .map((session) => session.date);
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
      schedule.days.some((item) => item.day === weekdayIndex(date) + 1) &&
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
