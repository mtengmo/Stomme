import type { Session, TemplateId } from '../domain/types';
import { daysBetween, weekDates } from '../lib/dates';

export const REST_HOURS = 48;
const REST_MS = REST_HOURS * 3_600_000;

function completedSorted(sessions: readonly Session[]): Session[] {
  return sessions
    .filter((s) => s.status === 'completed')
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

/** Alternates A/B over completed sessions; an aborted session repeats the same template. */
export function nextTemplate(sessions: readonly Session[]): TemplateId {
  const last = completedSorted(sessions).at(-1);
  if (!last) return 'A';
  return last.templateId === 'A' ? 'B' : 'A';
}

function finishedMs(s: Session): number {
  return Date.parse(s.finishedAt ?? s.startedAt);
}

/** Last completed session's finish + 48 h, or null if nothing is completed. Advisory only. */
export function earliestNext(sessions: readonly Session[]): Date | null {
  const last = completedSorted(sessions).at(-1);
  if (!last) return null;
  return new Date(finishedMs(last) + REST_MS);
}

export interface RestStatus {
  /** True when 48 h have passed (or nothing has been completed). Never blocks. */
  ok: boolean;
  earliestNext: Date | null;
}

export function restStatus(
  sessions: readonly Session[],
  now: Date,
): RestStatus {
  const earliest = earliestNext(sessions);
  return {
    ok: earliest === null || now.getTime() >= earliest.getTime(),
    earliestNext: earliest,
  };
}

/** floor(days / 7) + 1 between local dates; never below 1. */
export function programWeek(startDate: string, today: string): number {
  return Math.max(1, Math.floor(daysBetween(startDate, today) / 7) + 1);
}

/** Monday-first, seven local dates of the week containing today. */
export function weekDays(today: string): string[] {
  return weekDates(today);
}

export interface WeekSummary {
  days: string[];
  completed: Session[];
  completedTemplates: TemplateId[];
  count: number;
}

/** Completed sessions whose local date falls in the week containing today. */
export function weekSummary(
  sessions: readonly Session[],
  today: string,
): WeekSummary {
  const days = weekDays(today);
  const completed = completedSorted(sessions).filter((s) =>
    days.includes(s.date),
  );
  return {
    days,
    completed,
    completedTemplates: [...new Set(completed.map((s) => s.templateId))],
    count: completed.length,
  };
}

/**
 * The A/B sequence only follows full standard workouts. Custom workouts and
 * short workouts never advance it. `recentNewestFirst` is already filtered to
 * the current programme.
 */
export function nextTemplateId(
  recentNewestFirst: readonly Session[],
  programId: Session['programId'],
): TemplateId {
  const last = recentNewestFirst.find(
    (session) =>
      session.status === 'completed' &&
      session.workoutMode !== 'short' &&
      !session.customWorkoutId,
  );
  return programId === 'rehab' || last?.templateId !== 'A' ? 'A' : 'B';
}
