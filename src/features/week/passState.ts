import type { Session, TemplateId } from '../../domain/types';
import { addDays, daysBetween, weekStart } from '../../lib/dates';
import { nextTemplate, weekSummary } from '../../rules/schedule';

export type PassState = 'done' | 'today' | 'upcoming';

export const STATE_LABEL: Record<PassState, string> = {
  done: 'Klar',
  today: 'Idag',
  upcoming: 'Kommande',
};

/** Done this week; else the next pass in the A/B alternation is "Idag"; the other is "Kommande". */
export function passStates(
  sessions: readonly Session[],
  today: string,
): { states: Record<TemplateId, PassState>; next: TemplateId } {
  const { completedTemplates } = weekSummary(sessions, today);
  const next = nextTemplate(sessions);
  const state = (id: TemplateId): PassState =>
    completedTemplates.includes(id)
      ? 'done'
      : id === next
        ? 'today'
        : 'upcoming';
  return { states: { A: state('A'), B: state('B') }, next };
}

/** ISO-8601 week number of the week containing the date. */
export function isoWeekNumber(date: string): number {
  const thursday = addDays(weekStart(date), 3);
  const year = thursday.slice(0, 4);
  const week1Thursday = addDays(weekStart(`${year}-01-04`), 3);
  return Math.round(daysBetween(week1Thursday, thursday) / 7) + 1;
}
