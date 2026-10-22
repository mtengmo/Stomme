import { exerciseMetadata } from '../content/exerciseMetadata';
import { exercises } from '../content/exercises';
import type { ExerciseId, ProgramId, Session, SetLog } from '../domain/types';
import { addDays, weekStart } from '../lib/dates';
import { loggedVariant } from './history';

export type ProgressProgramme = ProgramId | 'legacy';

export interface WeekProgress {
  start: string;
  completed: number;
  incomplete: number;
  byProgramme: Record<ProgressProgramme, number>;
}

/** Calendar weeks are Monday-first; this includes the current, possibly partial week. */
export function weeklyProgress(
  sessions: readonly Session[],
  today: string,
  weeks = 4,
): WeekProgress[] {
  const first = addDays(weekStart(today), -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, index) => {
    const start = addDays(first, index * 7);
    const row: WeekProgress = {
      start,
      completed: 0,
      incomplete: 0,
      byProgramme: { general: 0, running: 0, rehab: 0, legacy: 0 },
    };
    for (const session of sessions) {
      if (session.date > today || weekStart(session.date) !== start) continue;
      const programme = session.programId ?? 'legacy';
      if (session.status === 'completed') {
        row.completed++;
        row.byProgramme[programme]++;
      } else {
        // SessionStatus is only completed, aborted or in_progress.
        row.incomplete++;
      }
    }
    return row;
  });
}

export function progressExerciseIds(
  sessions: readonly Session[],
  logs: readonly SetLog[],
): ExerciseId[] {
  const validSessions = new Set(sessions.map((session) => session.id));
  return [
    ...new Set(
      logs
        .filter((log) => validSessions.has(log.sessionId))
        .map((log) => log.exerciseId),
    ),
  ]
    .filter((id) => Object.hasOwn(exercises, id))
    .sort((a, b) => exercises[a].name.localeCompare(exercises[b].name, 'sv'));
}

export interface SessionExerciseResult {
  session: Session;
  logs: SetLog[];
  variant: string;
  side: SetLog['side'];
}

/** Groups actual set logs while preserving equipment variant and working side. */
export function exerciseResults(
  exerciseId: ExerciseId,
  sessions: readonly Session[],
  logs: readonly SetLog[],
): SessionExerciseResult[] {
  const byId = new Map(sessions.map((session) => [session.id, session]));
  const groups = new Map<string, SessionExerciseResult>();
  for (const log of logs) {
    if (log.exerciseId !== exerciseId) continue;
    const session = byId.get(log.sessionId);
    if (!session) continue;
    const variant = loggedVariant(log);
    const key = `${session.id}\u0000${variant}\u0000${log.side}`;
    const group = groups.get(key) ?? {
      session,
      logs: [],
      variant,
      side: log.side,
    };
    group.logs.push(log);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      logs: group.logs.sort(
        (a, b) =>
          a.setNumber - b.setNumber || a.loggedAt.localeCompare(b.loggedAt),
      ),
    }))
    .sort(
      (a, b) =>
        a.session.startedAt.localeCompare(b.session.startedAt) ||
        a.session.id.localeCompare(b.session.id),
    );
}

export function variantLabel(
  exerciseId: ExerciseId,
  variantId: string,
): string {
  return (
    exerciseMetadata[exerciseId].variants.find(
      (variant) => variant.id === variantId,
    )?.label ?? 'Okänd utrustning (äldre logg)'
  );
}
