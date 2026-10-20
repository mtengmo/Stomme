import { exercises } from '../content/exercises';
import type {
  ExerciseId,
  PainStatus,
  PlannedExercise,
  Session,
  SetLog,
  WorkoutTemplate,
} from '../domain/types';
import { type PainReading, worstPainSince } from './pain';
import { type LastResult, type Suggestion, suggestNext } from './progression';

export interface PlanningData {
  sessions: readonly Session[];
  setLogs: readonly SetLog[];
  painLogs: readonly (PainReading & { sessionId: string })[];
}

/** What the exercise looked like last time, for "Förra gången". */
export interface LastSummary {
  sets: number;
  amount: number;
  loadIndex: number;
}

export interface PlannedItem {
  plan: PlannedExercise;
  suggestion: Suggestion;
  last?: LastSummary;
}

const RANK: Record<PainStatus, number> = { ok: 0, warn: 1, stop: 2 };
function worsePain(a: PainStatus, b: PainStatus): PainStatus {
  return RANK[b] > RANK[a] ? b : a;
}

/** The newest finished (or aborted) session in which the exercise was done or skipped. */
function lastSessionOf(
  id: ExerciseId,
  data: PlanningData,
  excludeSessionId?: string,
): Session | undefined {
  const withLogs = new Set(
    data.setLogs.filter((l) => l.exerciseId === id).map((l) => l.sessionId),
  );
  return data.sessions
    .filter(
      (s) =>
        s.id !== excludeSessionId &&
        !s.programId &&
        s.status !== 'in_progress' &&
        s.plan.some((p) => p.exerciseId === id) &&
        (withLogs.has(s.id) || s.feedback[id]?.skipped === true),
    )
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
}

/**
 * Builds today's plan for a template: suggestNext per exercise, fed by that
 * exercise's own last session and the worst pain since then (day-after readings
 * and pain_stop aborts included). `currentPain` is today's 'before' status.
 * The user's logged load is the base because suggestNext reads the logs.
 */
export function buildPlan(
  template: WorkoutTemplate,
  programWeek: number,
  data: PlanningData,
  currentPain: PainStatus = 'ok',
  excludeSessionId?: string,
): PlannedItem[] {
  return template.items.map((item) => {
    const ex = exercises[item.exerciseId];
    const lastSession = lastSessionOf(ex.id, data, excludeSessionId);
    const lastPlan = lastSession?.plan.find((p) => p.exerciseId === ex.id);
    let last: LastResult | undefined;
    let summary: LastSummary | undefined;
    if (lastSession && lastPlan) {
      const logs = data.setLogs
        .filter((l) => l.sessionId === lastSession.id && l.exerciseId === ex.id)
        .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
      last = {
        plan: lastPlan,
        logs,
        feedback: lastSession.feedback[ex.id],
        sessionPain: worstPainSince(
          data.sessions.filter(
            (s) => s.id !== excludeSessionId && !s.programId,
          ),
          data.painLogs,
          lastSession.date,
        ),
        programWeek: lastSession.programWeek,
      };
      const latest = logs.at(-1);
      if (latest) {
        summary = {
          sets: new Set(logs.map((l) => l.setNumber)).size,
          amount: latest.amount,
          loadIndex: latest.loadIndex,
        };
      }
    }
    // Without history there is no LastResult to carry past pain, so any pain
    // on record (day-after readings and pain_stop aborts included) counts today.
    const pain = last
      ? currentPain
      : worsePain(
          currentPain,
          worstPainSince(
            data.sessions.filter((s) => s.id !== excludeSessionId),
            data.painLogs,
            '',
          ),
        );
    const suggestion = suggestNext(ex, item.sets, programWeek, last, pain);
    const plan: PlannedExercise = {
      exerciseId: ex.id,
      sets: suggestion.sets,
      target: suggestion.target,
      loadIndex: suggestion.loadIndex,
      weightKg: suggestion.weightKg,
      restSec: item.restSec,
      reason: suggestion.reason,
    };
    return { plan, suggestion, last: summary };
  });
}

/** The optional wall sit: 3 x 30 s, never part of Pass A or B. */
export function wallSitPlan(restSec = 60): PlannedExercise {
  const ex = exercises['wall-sit'];
  return {
    exerciseId: 'wall-sit',
    sets: 3,
    target: ex.range.start,
    loadIndex: 0,
    weightKg: 0,
    restSec,
    reason: 'first_time',
  };
}
