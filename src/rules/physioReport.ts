import type {
  ExerciseFeedback,
  ExerciseId,
  PainLog,
  PlannedExercise,
  Session,
  SetLog,
} from '../domain/types';
import { isRealDate } from '../lib/dates';

export type ReportProgramme =
  | 'all'
  | 'general'
  | 'running'
  | 'knee'
  | 'knee-physio'
  | 'rehab'
  | 'legacy';

export const reportProgrammeLabels: Record<ReportProgramme, string> = {
  all: 'Alla inriktningar',
  general: 'Allmän styrka',
  running: 'Styrka för löpning',
  knee: 'Knärehab · AAOS',
  'knee-physio': 'Knärehab · fysioterapeutens program',
  rehab: 'Mitt eget rehabprogram',
  legacy: 'Ursprungligt knä- och löpprogram',
};

export interface ReportSelection {
  from: string;
  to: string;
  programme: ReportProgramme;
}

export interface ReportExercise {
  exerciseId: ExerciseId;
  /** Saved intention, absent for an exercise found only in older set logs. */
  planned: PlannedExercise | null;
  /** Actual recorded dose, including sides, load, variant and early stops. */
  logs: SetLog[];
  feedback: ExerciseFeedback | undefined;
}

export interface ReportSession {
  /** Raw status, check-ins, short mode, notes and equipment provenance. */
  session: Session;
  exercises: ReportExercise[];
  /** Raw pain readings, kept separate from programme symptom answers. */
  painLogs: PainLog[];
}

export interface PhysioReport {
  selection: ReportSelection;
  valid: boolean;
  sessions: ReportSession[];
}

function programmeMatches(
  session: Session,
  programme: ReportProgramme,
): boolean {
  if (programme === 'all') return true;
  if (programme === 'legacy') return !session.programId;
  if (programme === 'knee')
    return session.programId === 'rehab' && session.rehabFocus === 'knee';
  if (programme === 'knee-physio')
    return (
      session.programId === 'rehab' && session.rehabFocus === 'knee-physio'
    );
  if (programme === 'rehab')
    return (
      session.programId === 'rehab' &&
      (session.rehabFocus === undefined || session.rehabFocus === 'custom')
    );
  return session.programId === programme;
}

const painOrder = { before: 0, after: 1, dayAfter: 2 } as const;

/** A read-only view of recorded sessions; no dose or symptom is inferred. */
export function buildPhysioReport(
  sessions: readonly Session[],
  setLogs: readonly SetLog[],
  painLogs: readonly PainLog[],
  selection: ReportSelection,
): PhysioReport {
  const selected = { ...selection };
  if (
    !isRealDate(selection.from) ||
    !isRealDate(selection.to) ||
    selection.from > selection.to
  )
    return { selection: selected, valid: false, sessions: [] };

  const matching = sessions
    .filter(
      (session) =>
        session.date >= selection.from &&
        session.date <= selection.to &&
        programmeMatches(session, selection.programme),
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        b.startedAt.localeCompare(a.startedAt) ||
        a.id.localeCompare(b.id),
    );

  const reportSessions = matching.map((session): ReportSession => {
    const mine = setLogs.filter((log) => log.sessionId === session.id);
    const plannedIds = new Set(session.plan.map((item) => item.exerciseId));
    const loggedOnlyIds = [...new Set(mine.map((log) => log.exerciseId))]
      .filter((id) => !plannedIds.has(id))
      .sort((a, b) => {
        // Both ids came from mine, so each has at least one timestamp.
        const firstA = mine
          .filter((log) => log.exerciseId === a)
          .map((log) => log.loggedAt)
          .sort()[0] as string;
        const firstB = mine
          .filter((log) => log.exerciseId === b)
          .map((log) => log.loggedAt)
          .sort()[0] as string;
        return firstA.localeCompare(firstB) || a.localeCompare(b);
      });
    const ids = [
      ...session.plan.map((item) => item.exerciseId),
      ...loggedOnlyIds,
    ];
    return {
      session,
      exercises: ids.map((exerciseId) => ({
        exerciseId,
        planned:
          session.plan.find((item) => item.exerciseId === exerciseId) ?? null,
        logs: mine
          .filter((log) => log.exerciseId === exerciseId)
          .sort(
            (a, b) =>
              a.setNumber - b.setNumber ||
              a.side.localeCompare(b.side) ||
              a.loggedAt.localeCompare(b.loggedAt) ||
              a.id.localeCompare(b.id),
          ),
        feedback: session.feedback[exerciseId],
      })),
      painLogs: painLogs
        .filter((pain) => pain.sessionId === session.id)
        .sort(
          (a, b) =>
            painOrder[a.timing] - painOrder[b.timing] ||
            a.createdAt.localeCompare(b.createdAt) ||
            a.id.localeCompare(b.id),
        ),
    };
  });

  return { selection: selected, valid: true, sessions: reportSessions };
}
