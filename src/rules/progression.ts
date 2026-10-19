import type {
  Effort,
  Exercise,
  PainStatus,
  PlannedExercise,
  ReasonCode,
  SetLog,
} from '../domain/types';

/** Sets needed at the top of the range before a load jump. */
const SETS_FOR_LOAD_JUMP = 3;
const SETS_FROM_WEEK_3 = 3;

export interface LastResult {
  plan: PlannedExercise;
  /** Set logs of this exercise from the last session. */
  logs: SetLog[];
  feedback?: { effort?: Effort; skipped?: boolean };
  /** Worst pain status of the last session. */
  sessionPain: PainStatus;
  /** Programme week of the last session; enables the week 1 -> 2 switch. */
  programWeek?: number;
}

export interface Suggestion {
  sets: number;
  target: number;
  loadIndex: number;
  weightKg: number;
  reason: ReasonCode;
  seePhysio: boolean;
}

/** From programme week 3 at least three sets, never fewer than the template. */
export function setsForWeek(templateSets: number, programWeek: number): number {
  return programWeek >= 3
    ? Math.max(templateSets, SETS_FROM_WEEK_3)
    : templateSets;
}

function make(
  ex: Exercise,
  sets: number,
  target: number,
  loadIndex: number,
  reason: ReasonCode,
  seePhysio = false,
): Suggestion {
  return {
    sets,
    target,
    loadIndex,
    weightKg: ex.loadLadder[loadIndex]?.kg ?? 0,
    reason,
    seePhysio,
  };
}

/** The load the user actually used last time (their choice is the base). */
function loggedLoadIndex(last: LastResult): number {
  let latest: SetLog | undefined;
  for (const l of last.logs) {
    if (!latest || l.loggedAt >= latest.loggedAt) latest = l;
  }
  return latest ? latest.loadIndex : last.plan.loadIndex;
}

/** Every planned set logged (both sides if per side) and at or above target. */
function allSetsReachedTarget(ex: Exercise, last: LastResult): boolean {
  const { sets, target } = last.plan;
  for (let n = 1; n <= sets; n++) {
    const forSet = last.logs.filter((l) => l.setNumber === n);
    if (forSet.length === 0) return false;
    if (ex.perSide) {
      const right = forSet.some((l) => l.side === 'right');
      const left = forSet.some((l) => l.side === 'left');
      if (!(right && left)) return false;
    }
    if (forSet.some((l) => l.amount < target)) return false;
  }
  return true;
}

export function suggestNext(
  ex: Exercise,
  templateSets: number,
  programWeek: number,
  last?: LastResult,
): Suggestion {
  const kneeStop = ex.kneeLoaded && last?.sessionPain === 'stop';

  // 1. Programme week 1 is fixed.
  if (programWeek <= 1) {
    const reason: ReasonCode =
      ex.loadLadder[ex.week1LoadIndex]?.kg === 0
        ? 'week1_bodyweight'
        : 'first_time';
    return make(
      ex,
      templateSets,
      ex.range.start,
      ex.week1LoadIndex,
      reason,
      kneeStop,
    );
  }

  const weekSets = setsForWeek(templateSets, programWeek);

  // 2. Nothing to build on.
  if (!last) {
    return make(ex, weekSets, ex.range.start, ex.startLoadIndex, 'first_time');
  }

  const baseLoad = loggedLoadIndex(last);
  const { sets, target } = last.plan;

  // 3. Pain gate: repeat the last plan, never lower the load.
  if (ex.kneeLoaded && last.sessionPain !== 'ok') {
    const stop = last.sessionPain === 'stop';
    return make(
      ex,
      sets,
      target,
      baseLoad,
      stop ? 'pain_stop_hold' : 'pain_hold',
      stop,
    );
  }

  // 4. Leaving week 1: switch to the start load.
  if (last.programWeek === 1) {
    return make(ex, weekSets, ex.range.start, ex.startLoadIndex, 'start_load');
  }

  // 5. A new set, nothing else changes.
  if (weekSets > sets) {
    return make(ex, weekSets, target, baseLoad, 'added_set');
  }

  // 6-7. Holds.
  if (last.feedback?.skipped || !allSetsReachedTarget(ex, last)) {
    return make(ex, sets, target, baseLoad, 'hold_incomplete');
  }
  if (last.feedback?.effort === 'hard') {
    return make(ex, sets, target, baseLoad, 'hold_hard');
  }

  // 8. More reps/seconds/metres.
  if (target < ex.range.max) {
    return make(
      ex,
      sets,
      Math.min(ex.range.max, target + ex.range.step),
      baseLoad,
      'increase_amount',
    );
  }

  // 9. At the top of the range.
  if (sets < SETS_FOR_LOAD_JUMP) {
    return make(ex, sets, target, baseLoad, 'hold_waiting_for_3_sets');
  }
  if (last.feedback?.effort !== 'easy') {
    return make(ex, sets, target, baseLoad, 'hold_not_easy_at_max');
  }
  if (baseLoad + 1 < ex.loadLadder.length) {
    return make(ex, sets, ex.range.start, baseLoad + 1, 'next_load');
  }
  return make(ex, sets, target, baseLoad, 'max_level');
}
